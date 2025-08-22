import { NextRequest } from 'next/server';
import { POST } from '@/app/api/auth/register/route';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';

// Mock dependencies for integration testing
jest.mock('@/lib/db', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
  compare: jest.fn(),
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Authentication Flow Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Registration → Login Flow', () => {
    const testUser = {
      name: 'Integration Test User',
      email: 'integration@example.com',
      password: 'TestPassword123',
      confirmPassword: 'TestPassword123',
      phone: '(555) 987-6543',
    };

    it('successfully completes registration and login flow', async () => {
      // Step 1: Registration
      const mockCreatedUser = {
        id: 'integration-user-123',
        name: testUser.name,
        email: testUser.email,
        role: 'CLIENT',
        phone: testUser.phone,
        emailVerified: new Date(), // Simulating verified email
        password: 'hashed-password',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue(mockCreatedUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      // Create registration request
      const registrationRequest = {
        json: jest.fn().mockResolvedValue(testUser),
      } as unknown as NextRequest;

      // Execute registration
      const registrationResponse = await POST(registrationRequest);
      const registrationData = await registrationResponse.json();

      expect(registrationResponse.status).toBe(201);
      expect(registrationData.success).toBe(true);
      expect(registrationData.user.email).toBe(testUser.email);

      // Step 2: Login attempt (simulate NextAuth credentials login)
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockCreatedUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      // Get credentials provider
      const credentialsProvider = authOptions.providers.find(
        (provider) => provider.type === 'credentials'
      ) as any;

      // Execute login
      const loginResult = await credentialsProvider.authorize({
        email: testUser.email,
        password: testUser.password,
      });

      expect(loginResult).toEqual({
        id: mockCreatedUser.id,
        email: mockCreatedUser.email,
        name: mockCreatedUser.name,
        role: mockCreatedUser.role,
        emailVerified: mockCreatedUser.emailVerified,
      });

      // Step 3: JWT token creation
      const tokenResult = await authOptions.callbacks!.jwt!({
        token: {},
        user: loginResult,
      } as any);

      expect(tokenResult.id).toBe(mockCreatedUser.id);
      expect(tokenResult.role).toBe('CLIENT');
      expect(tokenResult.emailVerified).toBe(mockCreatedUser.emailVerified);

      // Step 4: Session creation
      const sessionResult = await authOptions.callbacks!.session!({
        session: { user: { email: testUser.email } },
        token: tokenResult,
      } as any);

      expect(sessionResult.user.id).toBe(mockCreatedUser.id);
      expect(sessionResult.user.role).toBe('CLIENT');
    });

    it('blocks login for unverified email with credentials', async () => {
      // Create user with unverified email
      const unverifiedUser = {
        id: 'unverified-user-123',
        email: 'unverified@example.com',
        password: 'hashed-password',
        emailVerified: null, // Not verified
        role: 'CLIENT',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(unverifiedUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      // Login should succeed at credentials level
      const credentialsProvider = authOptions.providers.find(
        (provider) => provider.type === 'credentials'
      ) as any;

      const loginResult = await credentialsProvider.authorize({
        email: 'unverified@example.com',
        password: 'password123',
      });

      expect(loginResult.emailVerified).toBeNull();

      // But signIn callback should block it
      const signInResult = await authOptions.callbacks!.signIn!({
        user: loginResult,
        account: { provider: 'credentials' },
      } as any);

      expect(signInResult).toBe(false);
    });
  });

  describe('OAuth Registration → Login Flow', () => {
    it('successfully handles Google OAuth user creation and role assignment', async () => {
      const googleUser = {
        id: 'google-user-123',
        email: 'google@example.com',
        name: 'Google User',
        image: 'https://example.com/avatar.jpg',
      };

      // Simulate OAuth user login (PrismaAdapter handles user creation)
      const jwtResult = await authOptions.callbacks!.jwt!({
        token: {},
        user: googleUser,
        account: { provider: 'google' },
      } as any);

      // Should trigger role assignment
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'google-user-123' },
        data: { role: 'CLIENT' },
      });

      expect(jwtResult.role).toBe('CLIENT');
    });

    it('allows OAuth sign in without email verification requirement', async () => {
      const oauthUser = {
        id: 'oauth-user-123',
        email: 'oauth@example.com',
        emailVerified: null, // OAuth users might not have emailVerified set initially
      };

      const signInResult = await authOptions.callbacks!.signIn!({
        user: oauthUser,
        account: { provider: 'google' },
      } as any);

      expect(signInResult).toBe(true);
    });
  });

  describe('Role-Based Access Control', () => {
    it('correctly assigns CLIENT role to new registrations', async () => {
      const newUserData = {
        name: 'New Client',
        email: 'client@example.com',
        password: 'Password123',
        confirmPassword: 'Password123',
      };

      const mockUser = {
        id: 'client-123',
        ...newUserData,
        role: 'CLIENT',
        emailVerified: null,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      const request = {
        json: jest.fn().mockResolvedValue(newUserData),
      } as unknown as NextRequest;

      const response = await POST(request);
      const responseData = await response.json();

      expect(responseData.user.role).toBe('CLIENT');
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          role: 'CLIENT',
        }),
      });
    });

    it('preserves role information through JWT and session callbacks', async () => {
      const adminUser = {
        id: 'admin-123',
        email: 'admin@example.com',
        role: 'ADMIN',
        emailVerified: new Date(),
      };

      // JWT callback
      const tokenResult = await authOptions.callbacks!.jwt!({
        token: {},
        user: adminUser,
      } as any);

      expect(tokenResult.role).toBe('ADMIN');

      // Session callback
      const sessionResult = await authOptions.callbacks!.session!({
        session: { user: { email: adminUser.email } },
        token: tokenResult,
      } as any);

      expect(sessionResult.user.role).toBe('ADMIN');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('handles registration conflicts gracefully', async () => {
      const existingUser = {
        id: 'existing-123',
        email: 'existing@example.com',
        name: 'Existing User',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(existingUser);

      const duplicateRequest = {
        json: jest.fn().mockResolvedValue({
          name: 'Duplicate User',
          email: 'existing@example.com',
          password: 'Password123',
          confirmPassword: 'Password123',
        }),
      } as unknown as NextRequest;

      const response = await POST(duplicateRequest);
      const responseData = await response.json();

      expect(response.status).toBe(409);
      expect(responseData.error).toBe('User already exists with this email address');
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('handles login attempts with non-existent users', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const credentialsProvider = authOptions.providers.find(
        (provider) => provider.type === 'credentials'
      ) as any;

      const result = await credentialsProvider.authorize({
        email: 'nonexistent@example.com',
        password: 'password123',
      });

      expect(result).toBeNull();
    });

    it('handles login attempts with incorrect passwords', async () => {
      const user = {
        id: 'user-123',
        email: 'user@example.com',
        password: 'hashed-password',
        role: 'CLIENT',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const credentialsProvider = authOptions.providers.find(
        (provider) => provider.type === 'credentials'
      ) as any;

      const result = await credentialsProvider.authorize({
        email: 'user@example.com',
        password: 'wrongpassword',
      });

      expect(result).toBeNull();
    });

    it('maintains data consistency across auth flow', async () => {
      const userData = {
        id: 'consistency-123',
        email: 'consistency@example.com',
        name: 'Consistency Test',
        role: 'CLIENT',
        emailVerified: new Date(),
      };

      // Login
      const credentialsProvider = authOptions.providers.find(
        (provider) => provider.type === 'credentials'
      ) as any;

      const loginResult = await credentialsProvider.authorize({
        email: userData.email,
        password: 'password123',
      });

      // JWT
      const tokenResult = await authOptions.callbacks!.jwt!({
        token: {},
        user: loginResult,
      } as any);

      // Session
      const sessionResult = await authOptions.callbacks!.session!({
        session: { user: { email: userData.email } },
        token: tokenResult,
      } as any);

      // Verify data consistency
      expect(loginResult?.id).toBe(sessionResult.user.id);
      expect(loginResult?.email).toBe(sessionResult.user.email);
      expect(loginResult?.role).toBe(sessionResult.user.role);
    });
  });

  describe('Security Validations', () => {
    it('properly hashes passwords during registration', async () => {
      const registrationData = {
        name: 'Security Test',
        email: 'security@example.com',
        password: 'SecurePassword123',
        confirmPassword: 'SecurePassword123',
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: 'security-123',
        ...registrationData,
      });
      (bcrypt.hash as jest.Mock).mockResolvedValue('securely-hashed-password');

      const request = {
        json: jest.fn().mockResolvedValue(registrationData),
      } as unknown as NextRequest;

      await POST(request);

      expect(bcrypt.hash).toHaveBeenCalledWith('SecurePassword123', 12);
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          password: 'securely-hashed-password',
        }),
      });
    });

    it('normalizes email addresses consistently', async () => {
      const mixedCaseEmail = 'Test.User@EXAMPLE.COM';
      const normalizedEmail = 'test.user@example.com';

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: 'normalized-123',
        email: normalizedEmail,
      });
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

      const request = {
        json: jest.fn().mockResolvedValue({
          name: 'Test User',
          email: mixedCaseEmail,
          password: 'Password123',
          confirmPassword: 'Password123',
        }),
      } as unknown as NextRequest;

      await POST(request);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: normalizedEmail },
      });
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: normalizedEmail,
        }),
      });
    });
  });
});
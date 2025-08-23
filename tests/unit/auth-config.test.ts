import { authOptions } from "@/lib/auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

// Suppress unused import warnings for providers used in configuration validation
const _providers = { CredentialsProvider, GoogleProvider };
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";

// Mock dependencies
jest.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock("bcryptjs", () => ({
  compare: jest.fn(),
}));

jest.mock("@auth/prisma-adapter", () => ({
  PrismaAdapter: jest.fn(),
}));

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

describe("Enhanced NextAuth Configuration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("authOptions basic configuration", () => {
    it("has PrismaAdapter configured", () => {
      expect(PrismaAdapter).toHaveBeenCalledWith(prisma);
      expect(authOptions.adapter).toBeDefined();
    });

    it("has correct providers configured", () => {
      expect(authOptions.providers).toHaveLength(2);
      expect(authOptions.providers[0]?.type).toBe("oauth");
      expect(authOptions.providers[1]?.type).toBe("credentials");
    });

    it("has correct session strategy", () => {
      expect(authOptions.session?.strategy).toBe("jwt");
    });

    it("has correct page configuration", () => {
      expect(authOptions.pages?.signIn).toBe("/auth/login");
      expect(
        authOptions.pages && "signUp" in authOptions.pages
          ? (authOptions.pages as any).signUp
          : undefined
      ).toBe("/auth/register");
    });

    it("has correct environment variables", () => {
      expect(authOptions.secret).toBe(process.env.NEXTAUTH_SECRET);
    });
  });

  describe("Google Provider", () => {
    it("is configured with correct credentials", () => {
      const googleProvider = authOptions.providers[0] as any;
      expect(googleProvider.options?.clientId).toBe(
        process.env.GOOGLE_CLIENT_ID
      );
      expect(googleProvider.options?.clientSecret).toBe(
        process.env.GOOGLE_CLIENT_SECRET
      );
    });
  });

  describe("Credentials Provider", () => {
    const getCredentialsProvider = () => authOptions.providers[1] as any;

    describe("authorize function", () => {
      it("returns null for missing credentials", async () => {
        const credentialsProvider = getCredentialsProvider();
        const result = await credentialsProvider.authorize({});

        expect(result).toBeNull();
        expect(logger.warn).toHaveBeenCalledWith(
          "Login attempt without credentials"
        );
      });

      it("returns null for missing email", async () => {
        const credentialsProvider = getCredentialsProvider();
        const result = await credentialsProvider.authorize({
          password: "password123",
        });

        expect(result).toBeNull();
        expect(logger.warn).toHaveBeenCalledWith(
          "Login attempt without credentials"
        );
      });

      it("returns null for missing password", async () => {
        const credentialsProvider = getCredentialsProvider();
        const result = await credentialsProvider.authorize({
          email: "user@example.com",
        });

        expect(result).toBeNull();
        expect(logger.warn).toHaveBeenCalledWith(
          "Login attempt without credentials"
        );
      });

      it("returns null when user not found", async () => {
        const credentialsProvider = getCredentialsProvider();
        (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

        const result = await credentialsProvider.authorize({
          email: "nonexistent@example.com",
          password: "password123",
        });

        expect(result).toBeNull();
        expect(logger.warn).toHaveBeenCalledWith(
          "Invalid login attempt - user not found",
          { email: "nonexistent@example.com" }
        );
      });

      it("returns null when user has no password", async () => {
        const credentialsProvider = getCredentialsProvider();
        const mockUser = {
          id: "user-123",
          email: "oauth@example.com",
          name: "OAuth User",
          password: null,
        };
        (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

        const result = await credentialsProvider.authorize({
          email: "oauth@example.com",
          password: "password123",
        });

        expect(result).toBeNull();
        expect(logger.warn).toHaveBeenCalledWith(
          "Invalid login attempt - user not found",
          { email: "oauth@example.com" }
        );
      });

      it("returns null when password does not match", async () => {
        const credentialsProvider = getCredentialsProvider();
        const mockUser = {
          id: "user-123",
          email: "user@example.com",
          name: "Test User",
          password: "hashed-password",
          role: "CLIENT",
          emailVerified: new Date(),
        };
        (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
        (bcrypt.compare as jest.Mock).mockResolvedValue(false);

        const result = await credentialsProvider.authorize({
          email: "user@example.com",
          password: "wrongpassword",
        });

        expect(result).toBeNull();
        expect(bcrypt.compare).toHaveBeenCalledWith(
          "wrongpassword",
          "hashed-password"
        );
        expect(logger.warn).toHaveBeenCalledWith(
          "Invalid login attempt - wrong password",
          { email: "user@example.com" }
        );
      });

      it("successfully authenticates valid user", async () => {
        const credentialsProvider = getCredentialsProvider();
        const mockUser = {
          id: "user-123",
          email: "user@example.com",
          name: "Test User",
          password: "hashed-password",
          role: "CLIENT",
          emailVerified: new Date(),
        };
        (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
        (bcrypt.compare as jest.Mock).mockResolvedValue(true);

        const result = await credentialsProvider.authorize({
          email: "user@example.com",
          password: "correctpassword",
        });

        expect(result).toEqual({
          id: "user-123",
          email: "user@example.com",
          name: "Test User",
          role: "CLIENT",
          emailVerified: mockUser.emailVerified,
        });
        expect(bcrypt.compare).toHaveBeenCalledWith(
          "correctpassword",
          "hashed-password"
        );
        expect(logger.info).toHaveBeenCalledWith("User login successful", {
          userId: "user-123",
          role: "CLIENT",
        });
      });

      it("handles database errors gracefully", async () => {
        const credentialsProvider = getCredentialsProvider();
        (prisma.user.findUnique as jest.Mock).mockRejectedValue(
          new Error("Database error")
        );

        const result = await credentialsProvider.authorize({
          email: "user@example.com",
          password: "password123",
        });

        expect(result).toBeNull();
        expect(logger.error).toHaveBeenCalledWith(
          "Auth error",
          expect.any(Error)
        );
      });

      it("handles bcrypt errors gracefully", async () => {
        const credentialsProvider = getCredentialsProvider();
        const mockUser = {
          id: "user-123",
          email: "user@example.com",
          password: "hashed-password",
          role: "CLIENT",
        };
        (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
        (bcrypt.compare as jest.Mock).mockRejectedValue(
          new Error("Bcrypt error")
        );

        const result = await credentialsProvider.authorize({
          email: "user@example.com",
          password: "password123",
        });

        expect(result).toBeNull();
        expect(logger.error).toHaveBeenCalledWith(
          "Auth error",
          expect.any(Error)
        );
      });
    });
  });

  describe("JWT Callback", () => {
    it("adds user data to token on first sign in", async () => {
      const token = {};
      const user = {
        id: "user-123",
        email: "user@example.com",
        role: "CLIENT",
        emailVerified: new Date(),
      };

      const result = await authOptions.callbacks!.jwt!({ token, user } as any);

      expect(result.id).toBe("user-123");
      expect(result.role).toBe("CLIENT");
      expect(result.emailVerified).toBe(user.emailVerified);
    });

    it("preserves existing token when no user provided", async () => {
      const token = {
        id: "existing-id",
        role: "ADMIN",
        emailVerified: new Date(),
      };

      const result = await authOptions.callbacks!.jwt!({ token } as any);

      expect(result.id).toBe("existing-id");
      expect(result.role).toBe("ADMIN");
      expect(result.emailVerified).toBe(token.emailVerified);
    });

    it("handles Google OAuth user role assignment", async () => {
      const token = {};
      const user = { id: "user-123", email: "user@example.com" };
      const account = { provider: "google" };

      await authOptions.callbacks!.jwt!({ token, user, account } as any);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-123" },
        data: { role: "CLIENT" },
      });
    });

    it("does not update role for non-Google providers", async () => {
      const token = {};
      const user = { id: "user-123", email: "user@example.com" };
      const account = { provider: "credentials" };

      await authOptions.callbacks!.jwt!({ token, user, account } as any);

      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe("Session Callback", () => {
    it("adds user data to session from token", async () => {
      const session = { user: { email: "user@example.com" } };
      const token = {
        id: "user-123",
        role: "CLIENT",
        emailVerified: new Date(),
      };

      const result = await authOptions.callbacks!.session!({
        session,
        token,
      } as any);

      expect("id" in result.user! ? result.user.id : undefined).toBe(
        "user-123"
      );
      expect("role" in result.user! ? result.user.role : undefined).toBe(
        "CLIENT"
      );
      expect(
        "emailVerified" in result.user! ? result.user.emailVerified : undefined
      ).toBe(token.emailVerified);
    });

    it("handles missing token data gracefully", async () => {
      const session = { user: { email: "user@example.com" } };
      const token = {};

      const result = await authOptions.callbacks!.session!({
        session,
        token,
      } as any);

      expect("id" in result.user! ? result.user.id : undefined).toBeUndefined();
      expect(
        "role" in result.user! ? result.user.role : undefined
      ).toBeUndefined();
      expect(
        "emailVerified" in result.user! ? result.user.emailVerified : undefined
      ).toBeUndefined();
    });
  });

  describe("SignIn Callback", () => {
    it("allows sign in for verified email with credentials", async () => {
      const user = { emailVerified: new Date() };
      const account = { provider: "credentials" };

      const result = await authOptions.callbacks!.signIn!({
        user,
        account,
      } as any);

      expect(result).toBe(true);
    });

    it("blocks sign in for unverified email with credentials", async () => {
      const user = {
        email: "unverified@example.com",
        emailVerified: null,
      };
      const account = { provider: "credentials" };

      const result = await authOptions.callbacks!.signIn!({
        user,
        account,
      } as any);

      expect(result).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith(
        "Login blocked - email not verified",
        { email: "unverified@example.com" }
      );
    });

    it("allows sign in for OAuth providers regardless of verification", async () => {
      const user = { emailVerified: null };
      const account = { provider: "google" };

      const result = await authOptions.callbacks!.signIn!({
        user,
        account,
      } as any);

      expect(result).toBe(true);
    });
  });

  describe("Events", () => {
    it("logs successful sign in events", async () => {
      const user = { id: "user-123", email: "user@example.com" };
      const account = { provider: "google" };
      const isNewUser = false;

      await authOptions.events!.signIn!({ user, account, isNewUser } as any);

      expect(logger.info).toHaveBeenCalledWith("User signed in", {
        userId: "user-123",
        provider: "google",
        isNewUser: false,
      });
    });

    it("logs user creation events", async () => {
      const user = { id: "user-123", email: "user@example.com" };

      await authOptions.events!.createUser!({ user } as any);

      expect(logger.info).toHaveBeenCalledWith("New user created", {
        userId: "user-123",
        email: "user@example.com",
      });
    });
  });
});

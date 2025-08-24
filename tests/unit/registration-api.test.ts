import { NextRequest } from "next/server";
import { POST } from "@/app/api/auth/register/route";
import bcrypt from "bcryptjs";

// Mock dependencies
jest.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
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
  hash: jest.fn(),
}));

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

describe("/api/auth/register", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST", () => {
    const validRequestData = {
      name: "John Doe",
      email: "john.doe@example.com",
      password: "Password123",
      confirmPassword: "Password123",
      phone: "(555) 123-4567",
    };

    const createMockRequest = (data: any) => {
      return {
        json: jest.fn().mockResolvedValue(data),
      } as unknown as NextRequest;
    };

    it("successfully registers a new user", async () => {
      const mockUser = {
        id: "user-123",
        name: "John Doe",
        email: "john.doe@example.com",
        role: "CLIENT",
        phone: "(555) 123-4567",
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue("hashed-password");

      const request = createMockRequest(validRequestData);
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(201);
      expect(responseData.success).toBe(true);
      expect(responseData.message).toBe(
        "Registration successful. Please check your email to verify your account."
      );
      expect(responseData.user).toEqual({
        id: "user-123",
        name: "John Doe",
        email: "john.doe@example.com",
        role: "CLIENT",
      });

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: "john.doe@example.com" },
      });

      expect(bcrypt.hash).toHaveBeenCalledWith("Password123", 12);

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          name: "John Doe",
          email: "john.doe@example.com",
          password: "hashed-password",
          phone: "(555) 123-4567",
          role: "CLIENT",
          emailVerified: null,
        },
      });

      expect(logger.info).toHaveBeenCalledWith("User registered successfully", {
        userId: "user-123",
        email: "john.doe@example.com",
        role: "CLIENT",
      });
    });

    it("successfully registers user without phone", async () => {
      const requestData = {
        name: "Jane Smith",
        email: "jane.smith@example.com",
        password: "Password123",
        confirmPassword: "Password123",
      };

      const mockUser = {
        id: "user-456",
        name: "Jane Smith",
        email: "jane.smith@example.com",
        role: "CLIENT",
        phone: null,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue("hashed-password");

      const request = createMockRequest(requestData);
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(201);
      expect(responseData.success).toBe(true);

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          name: "Jane Smith",
          email: "jane.smith@example.com",
          password: "hashed-password",
          phone: null,
          role: "CLIENT",
          emailVerified: null,
        },
      });
    });

    it("rejects registration with invalid data", async () => {
      const invalidData = {
        name: "A", // Too short
        email: "invalid-email",
        password: "weak",
        confirmPassword: "weak",
      };

      const request = createMockRequest(invalidData);
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe("ValidationError");
      expect(responseData.details).toBeDefined();
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it("rejects registration with mismatched passwords", async () => {
      const invalidData = {
        name: "John Doe",
        email: "john@example.com",
        password: "Password123",
        confirmPassword: "DifferentPassword123",
      };

      const request = createMockRequest(invalidData);
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe("ValidationError");
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it("rejects registration if user already exists", async () => {
      const existingUser = {
        id: "existing-123",
        email: "john.doe@example.com",
        name: "Existing User",
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(existingUser);

      const request = createMockRequest(validRequestData);
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(409);
      expect(responseData.error).toBe("ConflictError");
      expect(prisma.user.create).not.toHaveBeenCalled();
      expect(bcrypt.hash).not.toHaveBeenCalled();
    });

    it("handles database errors during user lookup", async () => {
      (prisma.user.findUnique as jest.Mock).mockRejectedValue(
        new Error("Database connection failed")
      );

      const request = createMockRequest(validRequestData);
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.error).toBe("Internal Server Error");
      expect(logger.error).toHaveBeenCalledWith(
        "API Error occurred",
        expect.any(Error)
      );
    });

    it("handles database errors during user creation", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue("hashed-password");
      (prisma.user.create as jest.Mock).mockRejectedValue(
        new Error("Database write failed")
      );

      const request = createMockRequest(validRequestData);
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.error).toBe("Internal Server Error");
      expect(logger.error).toHaveBeenCalledWith(
        "Database error during user registration",
        expect.any(Error)
      );
    });

    it("handles bcrypt hashing errors", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockRejectedValue(new Error("Hashing failed"));

      const request = createMockRequest(validRequestData);
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.error).toBe("Internal Server Error");
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it("normalizes email to lowercase", async () => {
      const requestData = {
        ...validRequestData,
        email: "John.Doe@EXAMPLE.COM",
      };

      const mockUser = {
        id: "user-123",
        name: "John Doe",
        email: "john.doe@example.com",
        role: "CLIENT",
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue("hashed-password");

      const request = createMockRequest(requestData);
      const _response = await POST(request);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: "john.doe@example.com" },
      });

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: "john.doe@example.com",
        }),
      });
    });

    it("logs verification email notification", async () => {
      const mockUser = {
        id: "user-123",
        name: "John Doe",
        email: "john.doe@example.com",
        role: "CLIENT",
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue("hashed-password");

      const request = createMockRequest(validRequestData);
      await POST(request);

      expect(logger.info).toHaveBeenCalledWith(
        "Verification email should be sent",
        {
          userId: "user-123",
          email: "john.doe@example.com",
        }
      );
    });

    it("sets correct default role for new users", async () => {
      const mockUser = {
        id: "user-123",
        name: "John Doe",
        email: "john.doe@example.com",
        role: "CLIENT",
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue("hashed-password");

      const request = createMockRequest(validRequestData);
      await POST(request);

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          role: "CLIENT",
        }),
      });
    });

    it("sets emailVerified to null for new users", async () => {
      const mockUser = {
        id: "user-123",
        name: "John Doe",
        email: "john.doe@example.com",
        role: "CLIENT",
        emailVerified: null,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue("hashed-password");

      const request = createMockRequest(validRequestData);
      await POST(request);

      expect(prisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          emailVerified: null,
        }),
      });
    });
  });
});

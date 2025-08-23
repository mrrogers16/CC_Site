import { authOptions } from "@/lib/auth";

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

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

describe("NextAuth Configuration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("authOptions", () => {
    it("has correct basic configuration", () => {
      expect(authOptions.providers).toHaveLength(2);
      expect(authOptions.providers[0]?.name).toBe("Google");
      expect(authOptions.providers[1]?.name).toBe("Credentials");
      expect(authOptions.session?.strategy).toBe("jwt");
      expect(authOptions.pages?.signIn).toBe("/auth/login");
    });

    it("has correct environment variable for secret", () => {
      expect(authOptions.secret).toBe(process.env.NEXTAUTH_SECRET);
    });
  });

  describe("Credentials Provider", () => {
    const credentialsProvider = authOptions.providers[1] as any;

    describe("authorize function", () => {
      it("returns null for missing credentials", async () => {
        const result = await credentialsProvider.authorize({});

        expect(result).toBeNull();
      });

      it("returns null for missing email", async () => {
        const result = await credentialsProvider.authorize({
          password: "admin123",
        });

        expect(result).toBeNull();
      });

      it("returns null for missing password", async () => {
        const result = await credentialsProvider.authorize({
          email: "admin@healingpathways.com",
        });

        expect(result).toBeNull();
      });

      it("returns null for invalid credentials", async () => {
        const result = await credentialsProvider.authorize({
          email: "wrong@example.com",
          password: "wrongpassword",
        });

        expect(result).toBeNull();
      });

      it.skip("creates admin user if not exists and returns user for valid credentials", async () => {
        const mockAdminUser = {
          id: "admin-123",
          email: "admin@healingpathways.com",
          name: "Admin User",
          phone: null,
        };

        (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
        (prisma.user.create as jest.Mock).mockResolvedValue(mockAdminUser);

        const result = await credentialsProvider.authorize({
          email: "admin@healingpathways.com",
          password: "admin123",
        });

        expect(prisma.user.findUnique).toHaveBeenCalledWith({
          where: { email: "admin@healingpathways.com" },
        });
        expect(prisma.user.create).toHaveBeenCalledWith({
          data: {
            email: "admin@healingpathways.com",
            name: "Admin User",
            phone: null,
          },
        });
        expect(logger.info).toHaveBeenCalledWith("Created admin user", {
          userId: "admin-123",
        });
        expect(logger.info).toHaveBeenCalledWith("Admin login successful", {
          userId: "admin-123",
        });
        expect(result).toEqual({
          id: "admin-123",
          email: "admin@healingpathways.com",
          name: "Admin User",
        });
      });

      it.skip("returns existing admin user for valid credentials", async () => {
        const mockAdminUser = {
          id: "admin-123",
          email: "admin@healingpathways.com",
          name: "Admin User",
          phone: null,
        };

        (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockAdminUser);

        const result = await credentialsProvider.authorize({
          email: "admin@healingpathways.com",
          password: "admin123",
        });

        expect(prisma.user.findUnique).toHaveBeenCalledWith({
          where: { email: "admin@healingpathways.com" },
        });
        expect(prisma.user.create).not.toHaveBeenCalled();
        expect(logger.info).toHaveBeenCalledWith("Admin login successful", {
          userId: "admin-123",
        });
        expect(result).toEqual({
          id: "admin-123",
          email: "admin@healingpathways.com",
          name: "Admin User",
        });
      });

      it.skip("handles database errors gracefully", async () => {
        (prisma.user.findUnique as jest.Mock).mockRejectedValue(
          new Error("Database error")
        );

        const result = await credentialsProvider.authorize({
          email: "admin@healingpathways.com",
          password: "admin123",
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
    it("adds user id to token", async () => {
      const token = {};
      const user = { id: "user-123", email: "test@example.com" };

      const result = await authOptions.callbacks!.jwt!({ token, user } as any);

      expect(result.id).toBe("user-123");
    });

    it("preserves existing token when no user provided", async () => {
      const token = { id: "existing-id", email: "test@example.com" };

      const result = await authOptions.callbacks!.jwt!({ token } as any);

      expect(result.id).toBe("existing-id");
    });
  });

  describe("Session Callback", () => {
    it("adds user id to session", async () => {
      const session = { user: { email: "test@example.com" } };
      const token = { id: "user-123" };

      const result = await authOptions.callbacks!.session!({
        session,
        token,
      } as any);

      expect("id" in result.user! ? result.user.id : undefined).toBe(
        "user-123"
      );
    });

    it("handles missing token id", async () => {
      const session = { user: { email: "test@example.com" } };
      const token = {};

      const result = await authOptions.callbacks!.session!({
        session,
        token,
      } as any);

      expect("id" in result.user! ? result.user.id : undefined).toBeUndefined();
    });
  });
});

import { NextRequest } from "next/server";
import { GET } from "@/app/api/auth/check-email/route";

// Mock dependencies
jest.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
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

describe("/api/auth/check-email", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET", () => {
    const createMockRequest = (email: string) => {
      return {
        url: `http://localhost:3000/api/auth/check-email?email=${encodeURIComponent(email)}`,
      } as NextRequest;
    };

    it("returns available true for non-existent email", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const request = createMockRequest("available@example.com");
      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData).toEqual({
        available: true,
        message: "Email address is available",
      });

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: "available@example.com" },
        select: { id: true },
      });

      expect(logger.info).toHaveBeenCalledWith("Email availability check", {
        email: "available@example.com",
        available: true,
        userExists: false,
      });
    });

    it("returns available false for existing email", async () => {
      const mockUser = { id: "user-123" };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);

      const request = createMockRequest("existing@example.com");
      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData).toEqual({
        available: false,
        message: "Email address is already registered",
      });

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: "existing@example.com" },
        select: { id: true },
      });

      expect(logger.info).toHaveBeenCalledWith("Email availability check", {
        email: "existing@example.com",
        available: false,
        userExists: true,
      });
    });

    it("normalizes email addresses to lowercase", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const request = createMockRequest("Test.User@EXAMPLE.COM");
      await GET(request);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: "test.user@example.com" },
        select: { id: true },
      });
    });

    it("validates email format", async () => {
      const request = createMockRequest("invalid-email");
      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe("ValidationError");
      expect(responseData.details).toBeDefined();
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it("requires email parameter", async () => {
      const request = {
        url: "http://localhost:3000/api/auth/check-email",
      } as NextRequest;

      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe("ValidationError");
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it("handles empty email parameter", async () => {
      const request = createMockRequest("");
      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe("ValidationError");
      expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it("handles database errors gracefully", async () => {
      (prisma.user.findUnique as jest.Mock).mockRejectedValue(
        new Error("Database connection failed")
      );

      const request = createMockRequest("test@example.com");
      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.error).toBe("Internal Server Error");
      expect(logger.error).toHaveBeenCalledWith(
        "Database error during email availability check",
        expect.any(Error)
      );
    });

    it("validates various email formats correctly", async () => {
      const validEmails = [
        "user@example.com",
        "user.name@example.com",
        "user+tag@example.com",
        "user123@example-domain.com",
      ];

      const invalidEmails = [
        "invalid-email",
        "@example.com",
        "user@",
        "user..name@example.com",
        "user@example",
      ];

      // Test valid emails
      for (const email of validEmails) {
        (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

        const request = createMockRequest(email);
        const response = await GET(request);

        expect(response.status).toBe(200);
        expect(prisma.user.findUnique).toHaveBeenCalledWith({
          where: { email: email.toLowerCase() },
          select: { id: true },
        });
      }

      // Test invalid emails
      for (const email of invalidEmails) {
        jest.clearAllMocks();

        const request = createMockRequest(email);
        const response = await GET(request);

        expect(response.status).toBe(400);
        expect(prisma.user.findUnique).not.toHaveBeenCalled();
      }
    });

    it("handles special characters in email correctly", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const emailWithSpecialChars = "user+test@example.com";
      const request = createMockRequest(emailWithSpecialChars);
      await GET(request);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: "user+test@example.com" },
        select: { id: true },
      });
    });

    it("logs appropriate information for monitoring", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "user-123",
      });

      const request = createMockRequest("monitoring@example.com");
      await GET(request);

      expect(logger.info).toHaveBeenCalledWith("Email availability check", {
        email: "monitoring@example.com",
        available: false,
        userExists: true,
      });
    });

    it("only selects necessary fields for efficiency", async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "user-123",
      });

      const request = createMockRequest("efficiency@example.com");
      await GET(request);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: "efficiency@example.com" },
        select: { id: true }, // Only id field selected for efficiency
      });
    });

    it("handles concurrent requests correctly", async () => {
      (prisma.user.findUnique as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: "user-123" });

      const request1 = createMockRequest("available@example.com");
      const request2 = createMockRequest("taken@example.com");

      const [response1, response2] = await Promise.all([
        GET(request1),
        GET(request2),
      ]);

      const data1 = await response1.json();
      const data2 = await response2.json();

      expect(data1.available).toBe(true);
      expect(data2.available).toBe(false);
      expect(prisma.user.findUnique).toHaveBeenCalledTimes(2);
    });
  });
});

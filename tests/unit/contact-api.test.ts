import { NextRequest } from "next/server";
import { POST, GET } from "@/app/api/contact/route";

// Mock the dependencies
jest.mock("@/lib/db", () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    contactSubmission: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}));

jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    api: jest.fn(),
  },
}));

jest.mock("@/lib/email", () => ({
  sendContactNotification: jest.fn(),
  sendAutoResponse: jest.fn(),
}));

import { prisma } from "@/lib/db";
import { sendContactNotification, sendAutoResponse } from "@/lib/email";

describe("/api/contact", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST", () => {
    const validContactData = {
      name: "John Doe",
      email: "john@example.com",
      phone: "555-123-4567",
      subject: "Test Subject",
      message: "This is a test message.",
    };

    it("creates new user and contact submission for new email", async () => {
      const mockUser = {
        id: "user-123",
        email: "john@example.com",
        name: "John Doe",
        phone: "555-123-4567",
      };

      const mockSubmission = {
        id: "submission-123",
        ...validContactData,
        userId: "user-123",
        isRead: false,
        createdAt: new Date(),
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);
      (prisma.contactSubmission.create as jest.Mock).mockResolvedValue(
        mockSubmission
      );
      (sendContactNotification as jest.Mock).mockResolvedValue({
        success: true,
        messageId: "msg-123",
      });
      (sendAutoResponse as jest.Mock).mockResolvedValue({
        success: true,
        messageId: "msg-456",
      });

      const request = new NextRequest("http://localhost:3000/api/contact", {
        method: "POST",
        body: JSON.stringify(validContactData),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.submissionId).toBe("submission-123");

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: "john@example.com" },
      });
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: "john@example.com",
          name: "John Doe",
          phone: "555-123-4567",
        },
      });
      expect(prisma.contactSubmission.create).toHaveBeenCalledWith({
        data: {
          userId: "user-123",
          name: "John Doe",
          email: "john@example.com",
          phone: "555-123-4567",
          subject: "Test Subject",
          message: "This is a test message.",
          isRead: false,
        },
      });
    });

    it("updates existing user and creates contact submission for existing email", async () => {
      const existingUser = {
        id: "user-123",
        email: "john@example.com",
        name: "Old Name",
        phone: null,
      };

      const updatedUser = {
        ...existingUser,
        name: "John Doe",
        phone: "555-123-4567",
      };

      const mockSubmission = {
        id: "submission-123",
        ...validContactData,
        userId: "user-123",
        isRead: false,
        createdAt: new Date(),
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(existingUser);
      (prisma.user.update as jest.Mock).mockResolvedValue(updatedUser);
      (prisma.contactSubmission.create as jest.Mock).mockResolvedValue(
        mockSubmission
      );
      (sendContactNotification as jest.Mock).mockResolvedValue({
        success: true,
      });
      (sendAutoResponse as jest.Mock).mockResolvedValue({ success: true });

      const request = new NextRequest("http://localhost:3000/api/contact", {
        method: "POST",
        body: JSON.stringify(validContactData),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-123" },
        data: {
          name: "John Doe",
          phone: "555-123-4567",
        },
      });
    });

    it("validates request data and returns 400 for invalid data", async () => {
      const invalidData = {
        name: "", // Too short
        email: "invalid-email", // Invalid format
        subject: "", // Too short
        message: "short", // Too short
      };

      const request = new NextRequest("http://localhost:3000/api/contact", {
        method: "POST",
        body: JSON.stringify(invalidData),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Validation Error");
      expect(data.details).toBeDefined();
    });

    it("handles database errors gracefully", async () => {
      (prisma.user.findUnique as jest.Mock).mockRejectedValue(
        new Error("Database error")
      );

      const request = new NextRequest("http://localhost:3000/api/contact", {
        method: "POST",
        body: JSON.stringify(validContactData),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal Server Error");
    });
  });

  describe("GET", () => {
    it("returns paginated contact submissions", async () => {
      const mockSubmissions = [
        {
          id: "sub-1",
          name: "John Doe",
          email: "john@example.com",
          subject: "Test 1",
          message: "Message 1",
          isRead: false,
          createdAt: new Date(),
          user: {
            id: "user-1",
            name: "John Doe",
            email: "john@example.com",
            phone: null,
          },
        },
        {
          id: "sub-2",
          name: "Jane Smith",
          email: "jane@example.com",
          subject: "Test 2",
          message: "Message 2",
          isRead: true,
          createdAt: new Date(),
          user: {
            id: "user-2",
            name: "Jane Smith",
            email: "jane@example.com",
            phone: null,
          },
        },
      ];

      (prisma.contactSubmission.findMany as jest.Mock).mockResolvedValue(
        mockSubmissions
      );
      (prisma.contactSubmission.count as jest.Mock).mockResolvedValue(2);

      const request = new NextRequest(
        "http://localhost:3000/api/contact?page=1&limit=10"
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.submissions).toEqual(mockSubmissions);
      expect(data.data.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      });
    });

    it("filters submissions by read status", async () => {
      const mockSubmissions = [
        {
          id: "sub-1",
          isRead: false,
          // ... other fields
        },
      ];

      (prisma.contactSubmission.findMany as jest.Mock).mockResolvedValue(
        mockSubmissions
      );
      (prisma.contactSubmission.count as jest.Mock).mockResolvedValue(1);

      const request = new NextRequest(
        "http://localhost:3000/api/contact?isRead=false"
      );

      await GET(request);

      expect(prisma.contactSubmission.findMany).toHaveBeenCalledWith({
        where: { isRead: false },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: 0,
        take: 10,
      });
    });

    it("handles pagination correctly", async () => {
      (prisma.contactSubmission.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.contactSubmission.count as jest.Mock).mockResolvedValue(25);

      const request = new NextRequest(
        "http://localhost:3000/api/contact?page=2&limit=10"
      );

      const response = await GET(request);
      const data = await response.json();

      expect(data.data.pagination).toEqual({
        page: 2,
        limit: 10,
        total: 25,
        totalPages: 3,
        hasNext: true,
        hasPrev: true,
      });

      expect(prisma.contactSubmission.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 10,
          take: 10,
        })
      );
    });
  });
});

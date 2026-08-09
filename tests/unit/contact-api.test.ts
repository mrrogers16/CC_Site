import { NextRequest } from "next/server";
import { POST } from "@/app/api/contact/route";

// Mock the dependencies
jest.mock("@/lib/db", () => ({
  prisma: {
    contactSubmission: {
      create: jest.fn(),
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

    it("creates a contact submission from validated form data", async () => {
      const mockSubmission = {
        id: "submission-123",
        ...validContactData,
        isRead: false,
        createdAt: new Date(),
      };

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

      expect(prisma.contactSubmission.create).toHaveBeenCalledWith({
        data: {
          name: "John Doe",
          email: "john@example.com",
          phone: "555-123-4567",
          subject: "Test Subject",
          message: "This is a test message.",
          isRead: false,
        },
      });
    });

    it("stores a null phone when none is provided", async () => {
      const { phone: _phone, ...noPhoneData } = validContactData;

      (prisma.contactSubmission.create as jest.Mock).mockResolvedValue({
        id: "submission-456",
        ...noPhoneData,
        phone: null,
        isRead: false,
        createdAt: new Date(),
      });
      (sendContactNotification as jest.Mock).mockResolvedValue({
        success: true,
      });
      (sendAutoResponse as jest.Mock).mockResolvedValue({ success: true });

      const request = new NextRequest("http://localhost:3000/api/contact", {
        method: "POST",
        body: JSON.stringify(noPhoneData),
        headers: {
          "Content-Type": "application/json",
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);

      expect(prisma.contactSubmission.create).toHaveBeenCalledWith({
        data: {
          name: "John Doe",
          email: "john@example.com",
          phone: null,
          subject: "Test Subject",
          message: "This is a test message.",
          isRead: false,
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
      (prisma.contactSubmission.create as jest.Mock).mockRejectedValue(
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
});

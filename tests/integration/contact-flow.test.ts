import { NextRequest } from "next/server";
import { POST as ContactPost } from "@/app/api/contact/route";

// Mock dependencies
jest.mock("@/lib/db");
jest.mock("@/lib/logger");
jest.mock("@/lib/email");

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { sendContactNotification, sendAutoResponse } from "@/lib/email";

describe("Contact System Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default logger mocks
    (logger.info as jest.Mock).mockImplementation(() => {});
    (logger.error as jest.Mock).mockImplementation(() => {});
    (logger.api as jest.Mock).mockImplementation(() => {});
  });

  describe("Complete Contact Submission Flow", () => {
    it("handles end-to-end contact submission", async () => {
      const contactData = {
        name: "John Doe",
        email: "john@example.com",
        phone: "555-123-4567",
        subject: "Seeking counseling services",
        message: "I would like to schedule an appointment for therapy.",
      };

      const mockSubmission = {
        id: "submission-123",
        name: "John Doe",
        email: "john@example.com",
        phone: "555-123-4567",
        subject: "Seeking counseling services",
        message: "I would like to schedule an appointment for therapy.",
        isRead: false,
        createdAt: new Date(),
      };

      // Mock database operations
      (prisma.contactSubmission.create as jest.Mock).mockResolvedValue(
        mockSubmission
      );

      // Mock email operations
      (sendContactNotification as jest.Mock).mockResolvedValue({
        success: true,
        messageId: "notification-123",
      });
      (sendAutoResponse as jest.Mock).mockResolvedValue({
        success: true,
        messageId: "autoresponse-123",
      });

      // Submit contact form
      const request = new NextRequest("http://localhost:3000/api/contact", {
        method: "POST",
        body: JSON.stringify(contactData),
        headers: { "Content-Type": "application/json" },
      });

      const response = await ContactPost(request);
      const responseData = await response.json();

      // Verify response
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.submissionId).toBe("submission-123");

      // Verify database operations
      expect(prisma.contactSubmission.create).toHaveBeenCalledWith({
        data: {
          name: "John Doe",
          email: "john@example.com",
          phone: "555-123-4567",
          subject: "Seeking counseling services",
          message: "I would like to schedule an appointment for therapy.",
          isRead: false,
        },
      });

      // Verify logging
      expect(logger.info).toHaveBeenCalledWith(
        "Contact form submission saved",
        {
          submissionId: "submission-123",
          subject: "Seeking counseling services",
        }
      );
    });

    it("sends notification and auto-response emails", async () => {
      const contactData = {
        name: "Jane Smith",
        email: "jane@example.com",
        subject: "Question about services",
        message: "Do you offer evening telehealth sessions?",
      };

      (prisma.contactSubmission.create as jest.Mock).mockResolvedValue({
        id: "submission-456",
        ...contactData,
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
        body: JSON.stringify(contactData),
        headers: { "Content-Type": "application/json" },
      });

      const response = await ContactPost(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);

      expect(sendContactNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Jane Smith",
          email: "jane@example.com",
        }),
        "submission-456"
      );
      expect(sendAutoResponse).toHaveBeenCalledWith(
        expect.objectContaining({ email: "jane@example.com" })
      );
    });
  });

  describe("Error Handling", () => {
    it("handles email sending failures gracefully in contact submission", async () => {
      const contactData = {
        name: "John Doe",
        email: "john@example.com",
        subject: "Test Subject",
        message: "Test message",
      };

      const mockSubmission = { id: "submission-123" };

      (prisma.contactSubmission.create as jest.Mock).mockResolvedValue(
        mockSubmission
      );

      // Mock email failures
      (sendContactNotification as jest.Mock).mockResolvedValue({
        success: false,
        error: "SMTP Error",
      });
      (sendAutoResponse as jest.Mock).mockResolvedValue({
        success: false,
        error: "SMTP Error",
      });

      const request = new NextRequest("http://localhost:3000/api/contact", {
        method: "POST",
        body: JSON.stringify(contactData),
        headers: { "Content-Type": "application/json" },
      });

      const response = await ContactPost(request);
      const result = await response.json();

      // Should still succeed even if emails fail
      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.submissionId).toBe("submission-123");

      // Verify database operations still completed
      expect(prisma.contactSubmission.create).toHaveBeenCalled();
    });

    it("rejects invalid submissions without touching the database", async () => {
      const invalidData = {
        name: "J",
        email: "not-an-email",
        subject: "Hi",
        message: "short",
      };

      const request = new NextRequest("http://localhost:3000/api/contact", {
        method: "POST",
        body: JSON.stringify(invalidData),
        headers: { "Content-Type": "application/json" },
      });

      const response = await ContactPost(request);
      const result = await response.json();

      expect(response.status).toBe(400);
      expect(result.error).toBe("Validation Error");
      expect(prisma.contactSubmission.create).not.toHaveBeenCalled();
    });
  });
});

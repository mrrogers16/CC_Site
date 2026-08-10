import { NextRequest } from "next/server";
import { POST as ContactPost } from "@/app/api/contact/route";

// Mock dependencies. The db mock is a tripwire: the zero-storage contact
// flow must never write to the database (explicit factory, not automock —
// the global.prisma singleton no longer has a contactSubmission block).
jest.mock("@/lib/db", () => ({
  prisma: {
    contactSubmission: {
      create: jest.fn(),
    },
  },
}));
jest.mock("@/lib/logger");
jest.mock("@/lib/email");

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { sendContactNotification, sendAutoResponse } from "@/lib/email";

const dbTripwire = prisma as unknown as {
  contactSubmission: { create: jest.Mock };
};

describe("Contact System Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default logger mocks
    (logger.info as jest.Mock).mockImplementation(() => {});
    (logger.error as jest.Mock).mockImplementation(() => {});
    (logger.api as jest.Mock).mockImplementation(() => {});
  });

  describe("Complete Contact Submission Flow", () => {
    it("handles end-to-end contact submission without storing anything", async () => {
      const contactData = {
        name: "John Doe",
        email: "john@example.com",
        phone: "555-123-4567",
        subject: "Seeking counseling services",
        message: "I would like to schedule an appointment for therapy.",
      };

      (sendContactNotification as jest.Mock).mockResolvedValue({
        success: true,
        messageId: "notification-123",
      });
      (sendAutoResponse as jest.Mock).mockResolvedValue({
        success: true,
        messageId: "autoresponse-123",
      });

      const request = new NextRequest("http://localhost:3000/api/contact", {
        method: "POST",
        body: JSON.stringify(contactData),
        headers: { "Content-Type": "application/json" },
      });

      const response = await ContactPost(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData).not.toHaveProperty("submissionId");

      expect(dbTripwire.contactSubmission.create).not.toHaveBeenCalled();

      expect(logger.info).toHaveBeenCalledWith("Contact form forwarded", {
        subject: "Seeking counseling services",
        messageId: "notification-123",
      });
    });

    it("sends notification and auto-response emails", async () => {
      const contactData = {
        name: "Jane Smith",
        email: "jane@example.com",
        subject: "Question about services",
        message: "Do you offer evening telehealth sessions?",
      };

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
        })
      );
      expect(sendAutoResponse).toHaveBeenCalledWith(
        expect.objectContaining({ email: "jane@example.com" })
      );
      expect(dbTripwire.contactSubmission.create).not.toHaveBeenCalled();
    });
  });

  describe("Error Handling", () => {
    it("returns 502 when the notification email fails and stores nothing", async () => {
      const contactData = {
        name: "John Doe",
        email: "john@example.com",
        subject: "Test Subject",
        message: "Test message content",
      };

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

      // With zero storage, a lost notification email means a lost message;
      // the user must see the failure so they can retry or email directly
      expect(response.status).toBe(502);
      expect(result.error).toBe("EmailDeliveryError");
      expect(dbTripwire.contactSubmission.create).not.toHaveBeenCalled();
    });

    it("rejects invalid submissions without sending or storing", async () => {
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
      expect(sendContactNotification).not.toHaveBeenCalled();
      expect(sendAutoResponse).not.toHaveBeenCalled();
      expect(dbTripwire.contactSubmission.create).not.toHaveBeenCalled();
    });
  });
});

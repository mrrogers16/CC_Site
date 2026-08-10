import { NextRequest } from "next/server";
import { POST } from "@/app/api/contact/route";

// Mock the dependencies. The db mock is a tripwire: the route must never
// import or touch the database under the zero-storage contact flow.
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

const dbTripwire = prisma as unknown as {
  contactSubmission: { create: jest.Mock };
};

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

    it("forwards a valid submission via email without storing it", async () => {
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
      expect(data).not.toHaveProperty("submissionId");

      expect(sendContactNotification).toHaveBeenCalledTimes(1);
      expect(sendContactNotification).toHaveBeenCalledWith(validContactData);
      expect(sendAutoResponse).toHaveBeenCalledWith(validContactData);

      expect(dbTripwire.contactSubmission.create).not.toHaveBeenCalled();
    });

    it("forwards a submission without a phone number", async () => {
      const { phone: _phone, ...noPhoneData } = validContactData;

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

      // Zod leaves the optional key absent; no null-coercion for storage
      expect(sendContactNotification).toHaveBeenCalledWith(noPhoneData);
      expect(dbTripwire.contactSubmission.create).not.toHaveBeenCalled();
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

      expect(sendContactNotification).not.toHaveBeenCalled();
      expect(sendAutoResponse).not.toHaveBeenCalled();
      expect(dbTripwire.contactSubmission.create).not.toHaveBeenCalled();
    });

    it("returns 502 when the notification email fails", async () => {
      (sendContactNotification as jest.Mock).mockResolvedValue({
        success: false,
        error: "SMTP Error",
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

      expect(response.status).toBe(502);
      expect(data.error).toBe("EmailDeliveryError");
      expect(dbTripwire.contactSubmission.create).not.toHaveBeenCalled();
    });

    it("still returns 200 when only the auto-response fails", async () => {
      (sendContactNotification as jest.Mock).mockResolvedValue({
        success: true,
        messageId: "msg-789",
      });
      (sendAutoResponse as jest.Mock).mockResolvedValue({
        success: false,
        error: "SMTP Error",
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
      expect(dbTripwire.contactSubmission.create).not.toHaveBeenCalled();
    });
  });
});

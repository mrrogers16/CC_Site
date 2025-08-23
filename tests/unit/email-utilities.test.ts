import { ContactFormData } from "@/lib/validations";

// Mock nodemailer before importing email module
jest.mock("nodemailer", () => {
  const mockSendMail = jest.fn();
  const _mockVerify = jest.fn();
  return {
    createTransport: jest.fn(() => ({
      sendMail: mockSendMail,
      verify: _mockVerify,
    })),
  };
});

// Mock React Email render
jest.mock("@react-email/components", () => ({
  render: jest.fn(),
}));

// Mock logger
jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock email templates
jest.mock("@/components/email/contact-notification", () => ({
  ContactNotificationEmail: jest.fn(() => "<div>Notification Email</div>"),
}));

jest.mock("@/components/email/contact-response", () => ({
  ContactResponseEmail: jest.fn(() => "<div>Response Email</div>"),
}));

// Now import the email module after mocks are set up
import {
  sendContactNotification,
  sendAutoResponse,
  sendAdminResponse,
} from "@/lib/email";
import nodemailer from "nodemailer";
import { render } from "@react-email/components";
import { logger } from "@/lib/logger";

describe("Email Utilities", () => {
  let mockSendMail: jest.Mock;

  beforeAll(() => {
    // Get reference to the mocked functions
    const mockTransporter = (nodemailer.createTransport as jest.Mock)();
    mockSendMail = mockTransporter.sendMail;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (render as jest.Mock).mockResolvedValue("<html>Rendered Email</html>");

    // Mock environment variables
    process.env.EMAIL_SERVER_USER = "test@example.com";
    process.env.EMAIL_SERVER_PASSWORD = "password";
    process.env.EMAIL_FROM = "noreply@healingpathways.com";
  });

  describe("sendContactNotification", () => {
    const mockContactData: ContactFormData = {
      name: "John Doe",
      email: "john@example.com",
      phone: "555-123-4567",
      subject: "Test Subject",
      message: "Test message content",
    };

    it("sends notification email successfully", async () => {
      mockSendMail.mockResolvedValue({
        messageId: "test-message-id",
      });

      const result = await sendContactNotification(
        mockContactData,
        "submission-123"
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBe("test-message-id");
      expect(mockSendMail).toHaveBeenCalledWith({
        from: "noreply@healingpathways.com",
        to: "noreply@healingpathways.com",
        subject: "New Contact Form Submission: Test Subject",
        html: "<html>Rendered Email</html>",
        text: "New contact form submission from John Doe (john@example.com): Test message content",
      });
      expect(logger.info).toHaveBeenCalledWith(
        "Email sent successfully",
        expect.objectContaining({
          to: "noreply@healingpathways.com",
          subject: "New Contact Form Submission: Test Subject",
          messageId: "test-message-id",
        })
      );
    });

    it("handles email sending failure", async () => {
      mockSendMail.mockRejectedValue(new Error("SMTP Error"));

      const result = await sendContactNotification(
        mockContactData,
        "submission-123"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("SMTP Error");
      expect(logger.error).toHaveBeenCalledWith(
        "Failed to send email",
        expect.any(Error),
        expect.objectContaining({
          to: "noreply@healingpathways.com",
          subject: "New Contact Form Submission: Test Subject",
        })
      );
    });

    it("handles missing email configuration", async () => {
      delete process.env.EMAIL_SERVER_USER;

      const result = await sendContactNotification(
        mockContactData,
        "submission-123"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Email configuration not available");
      expect(logger.warn).toHaveBeenCalledWith(
        "Email configuration not available, skipping email send",
        expect.objectContaining({
          to: "noreply@healingpathways.com",
          subject: "New Contact Form Submission: Test Subject",
        })
      );
    });
  });

  describe("sendAutoResponse", () => {
    const mockContactData: ContactFormData = {
      name: "John Doe",
      email: "john@example.com",
      phone: "555-123-4567",
      subject: "Test Subject",
      message: "Test message content",
    };

    it("sends auto-response email successfully", async () => {
      mockSendMail.mockResolvedValue({
        messageId: "auto-response-id",
      });

      const result = await sendAutoResponse(mockContactData);

      expect(result.success).toBe(true);
      expect(result.messageId).toBe("auto-response-id");
      expect(mockSendMail).toHaveBeenCalledWith({
        from: "noreply@healingpathways.com",
        to: "john@example.com",
        subject: "Thank you for contacting Healing Pathways Counseling",
        html: "<html>Rendered Email</html>",
        text: "Dear John Doe, thank you for reaching out to us. We've received your message and will respond within 24 hours during business days.",
      });
    });

    it("handles template rendering failure", async () => {
      (render as jest.Mock).mockRejectedValue(new Error("Template error"));

      const result = await sendAutoResponse(mockContactData);

      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to render auto-response email");
      expect(logger.error).toHaveBeenCalledWith(
        "Failed to send auto-response",
        expect.any(Error)
      );
    });
  });

  describe("sendAdminResponse", () => {
    it("sends admin response email successfully", async () => {
      mockSendMail.mockResolvedValue({
        messageId: "admin-response-id",
      });

      const result = await sendAdminResponse(
        "user@example.com",
        "Response Subject",
        "Response message content",
        "submission-123"
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBe("admin-response-id");
      expect(mockSendMail).toHaveBeenCalledWith({
        from: "noreply@healingpathways.com",
        to: "user@example.com",
        subject: "Response Subject",
        html: expect.stringContaining("Response message content"),
        text: "Response message content",
      });
      expect(logger.info).toHaveBeenCalledWith(
        "Admin response sent successfully",
        expect.objectContaining({
          to: "user@example.com",
          subject: "Response Subject",
          contactSubmissionId: "submission-123",
        })
      );
    });

    it("handles multiline messages correctly", async () => {
      mockSendMail.mockResolvedValue({
        messageId: "admin-response-id",
      });

      const multilineMessage = "Line 1\nLine 2\nLine 3";

      await sendAdminResponse(
        "user@example.com",
        "Test Subject",
        multilineMessage,
        "submission-123"
      );

      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining(
            '<p style="margin-bottom: 15px; line-height: 1.6;">Line 1</p>'
          ),
          text: multilineMessage,
        })
      );
    });

    it("handles sending failure", async () => {
      mockSendMail.mockRejectedValue(new Error("Send failed"));

      const result = await sendAdminResponse(
        "user@example.com",
        "Test Subject",
        "Test message",
        "submission-123"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Send failed");
      expect(logger.error).toHaveBeenCalledWith(
        "Failed to send email",
        expect.any(Error),
        expect.objectContaining({
          to: "user@example.com",
          subject: "Test Subject",
        })
      );
    });
  });
});

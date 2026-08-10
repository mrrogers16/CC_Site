import nodemailer from "nodemailer";
import { render } from "@react-email/components";
import { logger } from "@/lib/logger";
import { ContactNotificationEmail } from "@/components/email/contact-notification";
import { ContactResponseEmail } from "@/components/email/contact-response";
import type { ContactFormData } from "@/lib/validations";

// Create reusable transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER_HOST,
  port: parseInt(process.env.EMAIL_SERVER_PORT || "587"),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
});

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

async function sendEmail({ to, subject, html, text }: SendEmailOptions) {
  try {
    // Check if email configuration is available
    if (!process.env.EMAIL_SERVER_USER || !process.env.EMAIL_SERVER_PASSWORD) {
      logger.warn("Email configuration not available, skipping email send", {
        to,
        subject,
      });
      return { success: false, error: "Email configuration not available" };
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
      text,
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info("Email sent successfully", {
      to,
      subject,
      messageId: info.messageId,
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error(
      "Failed to send email",
      error instanceof Error ? error : new Error(String(error)),
      { to, subject }
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function sendContactNotification(contactData: ContactFormData) {
  try {
    const html = await render(
      ContactNotificationEmail({
        contactData,
      })
    );

    const result = await sendEmail({
      to: process.env.EMAIL_FROM || "admin@healingpathways.com",
      subject: `New Contact Form Submission: ${contactData.subject}`,
      html,
      text: `New contact form submission from ${contactData.name} (${contactData.email}): ${contactData.message}`,
    });

    return result;
  } catch (error) {
    logger.error(
      "Failed to send contact notification",
      error instanceof Error ? error : new Error(String(error))
    );
    return { success: false, error: "Failed to render notification email" };
  }
}

export async function sendAutoResponse(contactData: ContactFormData) {
  try {
    const html = await render(
      ContactResponseEmail({
        name: contactData.name,
      })
    );

    const result = await sendEmail({
      to: contactData.email,
      subject: "Thank you for contacting Healing Pathways Counseling",
      html,
      text: `Dear ${contactData.name}, thank you for reaching out to us. We've received your message and will respond within 24 hours during business days.`,
    });

    return result;
  } catch (error) {
    logger.error(
      "Failed to send auto-response",
      error instanceof Error ? error : new Error(String(error))
    );
    return { success: false, error: "Failed to render auto-response email" };
  }
}

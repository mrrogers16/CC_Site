import nodemailer from "nodemailer";
import { render } from "@react-email/components";
import { logger } from "@/lib/logger";
import { ContactNotificationEmail } from "@/components/email/contact-notification";
import { ContactResponseEmail } from "@/components/email/contact-response";
import { AppointmentConfirmationEmail } from "@/components/email/appointment-confirmation";
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

export async function sendContactNotification(
  contactData: ContactFormData,
  submissionId: string
) {
  try {
    const html = await render(
      ContactNotificationEmail({
        contactData,
        submissionId,
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

export async function sendAdminResponse(
  to: string,
  subject: string,
  message: string,
  contactSubmissionId: string
) {
  try {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #4a8b8c; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">Healing Pathways Counseling</h1>
        </div>
        <div style="padding: 30px; background-color: #f9f9f9;">
          <div style="background-color: white; padding: 20px; border-radius: 8px;">
            ${message
              .split("\n")
              .map(
                paragraph =>
                  `<p style="margin-bottom: 15px; line-height: 1.6;">${paragraph}</p>`
              )
              .join("")}
          </div>
          <div style="margin-top: 30px; padding: 20px; background-color: #f0f7f7; border-left: 4px solid #4a8b8c;">
            <p style="margin: 0; font-size: 14px; color: #666;">
              This message was sent in response to your inquiry. If you have additional questions, 
              please reply to this email or call our office at (555) 123-4567.
            </p>
          </div>
        </div>
        <div style="background-color: #2c2c2c; color: white; padding: 20px; text-align: center; font-size: 12px;">
          <p style="margin: 0;">Healing Pathways Counseling | 123 Wellness Way, Suite 200 | contact@healingpathways.com</p>
        </div>
      </div>
    `;

    const result = await sendEmail({
      to,
      subject,
      html,
      text: message,
    });

    if (result.success) {
      logger.info("Admin response sent successfully", {
        to,
        subject,
        contactSubmissionId,
      });
    }

    return result;
  } catch (error) {
    logger.error(
      "Failed to send admin response",
      error instanceof Error ? error : new Error(String(error)),
      {
        to,
        subject,
        contactSubmissionId,
      }
    );
    return { success: false, error: "Failed to send admin response" };
  }
}

export async function sendAppointmentConfirmation(
  clientEmail: string,
  clientName: string,
  appointmentDetails: {
    id: string;
    service: string;
    dateTime: string;
    duration: number;
    price: string;
  }
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  try {
    // Check if email configuration is available
    if (!process.env.EMAIL_SERVER_USER || !process.env.EMAIL_SERVER_PASSWORD) {
      logger.warn("Email configuration not available, skipping appointment confirmation", {
        clientEmail,
        appointmentId: appointmentDetails.id,
      });
      return { success: false, error: "Email configuration not available" };
    }

    const html = await render(
      AppointmentConfirmationEmail({
        clientName,
        appointmentDetails,
      })
    );

    const appointmentDate = new Date(appointmentDetails.dateTime);
    const formattedDate = appointmentDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const formattedTime = appointmentDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    const result = await sendEmail({
      to: clientEmail,
      subject: `Appointment Confirmed - ${formattedDate} at ${formattedTime}`,
      html,
      text: `Dear ${clientName},

Your appointment has been confirmed!

Service: ${appointmentDetails.service}
Date: ${formattedDate}
Time: ${formattedTime}
Duration: ${appointmentDetails.duration} minutes
Fee: $${appointmentDetails.price}

Location:
Healing Pathways Counseling
123 Wellness Way, Suite 200
Cityville, ST 12345
Phone: (555) 123-4567

Please arrive 10-15 minutes early for your first appointment.

For cancellations or rescheduling, please provide 24-hour notice.

Confirmation ID: ${appointmentDetails.id}

We look forward to supporting you on your wellness journey.

Best regards,
Healing Pathways Counseling Team`,
    });

    return result;
  } catch (error) {
    logger.error(
      "Failed to send appointment confirmation",
      error instanceof Error ? error : new Error(String(error)),
      { clientEmail, appointmentId: appointmentDetails.id }
    );
    return { success: false, error: "Failed to send appointment confirmation" };
  }
}

// Email verification function for admin setup
export async function verifyEmailConfig(): Promise<boolean> {
  try {
    if (!process.env.EMAIL_SERVER_USER || !process.env.EMAIL_SERVER_PASSWORD) {
      return false;
    }

    await transporter.verify();
    logger.info("Email configuration verified successfully");
    return true;
  } catch (error) {
    logger.error(
      "Email configuration verification failed",
      error instanceof Error ? error : new Error(String(error))
    );
    return false;
  }
}

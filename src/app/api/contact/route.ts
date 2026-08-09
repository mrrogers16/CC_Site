import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api/error-handler";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { contactFormSchema } from "@/lib/validations";
import { sendContactNotification, sendAutoResponse } from "@/lib/email";

export const POST = withErrorHandler(async (request: NextRequest) => {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const validatedData = contactFormSchema.parse(body);

    // Create contact submission
    const contactSubmission = await prisma.contactSubmission.create({
      data: {
        name: validatedData.name,
        email: validatedData.email,
        phone: validatedData.phone || null,
        subject: validatedData.subject,
        message: validatedData.message,
        isRead: false,
      },
    });

    logger.info("Contact form submission saved", {
      submissionId: contactSubmission.id,
      subject: validatedData.subject,
    });

    // Send email notifications (don't block the response if emails fail)
    Promise.all([
      sendContactNotification(validatedData, contactSubmission.id),
      sendAutoResponse(validatedData),
    ])
      .then(([notificationResult, autoResponseResult]) => {
        if (notificationResult.success) {
          logger.info("Contact notification email sent", {
            submissionId: contactSubmission.id,
            messageId: notificationResult.messageId,
          });
        } else {
          logger.error(
            "Failed to send contact notification",
            new Error(notificationResult.error || "Unknown error"),
            {
              submissionId: contactSubmission.id,
            }
          );
        }

        if (autoResponseResult.success) {
          logger.info("Auto-response email sent", {
            submissionId: contactSubmission.id,
            messageId: autoResponseResult.messageId,
          });
        } else {
          logger.error(
            "Failed to send auto-response",
            new Error(autoResponseResult.error || "Unknown error"),
            {
              submissionId: contactSubmission.id,
            }
          );
        }
      })
      .catch(error => {
        logger.error(
          "Email notification error",
          error instanceof Error ? error : new Error(String(error)),
          {
            submissionId: contactSubmission.id,
          }
        );
      });

    const duration = Date.now() - startTime;
    logger.api("POST", "/api/contact", 200, duration);

    return NextResponse.json({
      success: true,
      message:
        "Thank you for your message. We'll get back to you within 24 hours.",
      submissionId: contactSubmission.id,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.api("POST", "/api/contact", 500, duration);
    throw error;
  }
});

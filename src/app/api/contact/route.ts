import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api/error-handler";
import { EmailDeliveryError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { contactFormSchema } from "@/lib/validations";
import { sendContactNotification, sendAutoResponse } from "@/lib/email";

export const POST = withErrorHandler(async (request: NextRequest) => {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const validatedData = contactFormSchema.parse(body);

    // Zero-storage contact flow: the notification email IS the message, so it
    // must succeed before we can tell the user their message was received.
    const [notificationResult, autoResponseResult] = await Promise.all([
      sendContactNotification(validatedData),
      sendAutoResponse(validatedData),
    ]);

    if (!notificationResult.success) {
      logger.error(
        "Failed to send contact notification",
        new Error(notificationResult.error || "Unknown error"),
        { subject: validatedData.subject }
      );
      throw new EmailDeliveryError(
        "Unable to send your message right now. Please try again or email us directly."
      );
    }

    if (!autoResponseResult.success) {
      // Best-effort: the submitter's copy failing does not lose the message
      logger.error(
        "Failed to send auto-response",
        new Error(autoResponseResult.error || "Unknown error"),
        { subject: validatedData.subject }
      );
    }

    logger.info("Contact form forwarded", {
      subject: validatedData.subject,
      messageId: notificationResult.messageId,
    });

    const duration = Date.now() - startTime;
    logger.api("POST", "/api/contact", 200, duration);

    return NextResponse.json({
      success: true,
      message:
        "Thank you for your message. We'll get back to you within 24 hours.",
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.api("POST", "/api/contact", 500, duration);
    throw error;
  }
});

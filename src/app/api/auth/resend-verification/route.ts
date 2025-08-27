import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api/error-handler";
import { sendVerificationEmail } from "@/lib/email/verification";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { ValidationError, NotFoundError } from "@/lib/errors";

export const POST = withErrorHandler(async (request: NextRequest) => {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      throw new ValidationError("Email address is required");
    }

    // Check if user exists and is not already verified
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      throw new NotFoundError("User not found with this email address");
    }

    if (user.emailVerified) {
      const duration = Date.now() - startTime;
      logger.api("POST", "/api/auth/resend-verification", 400, duration);

      return NextResponse.json(
        {
          success: false,
          error: "Email is already verified. You can sign in to your account.",
        },
        { status: 400 }
      );
    }

    // Send verification email
    const emailResult = await sendVerificationEmail(
      email.toLowerCase(),
      user.name
    );

    if (!emailResult.success) {
      logger.error(
        "Failed to send verification email",
        new Error(emailResult.error || "Unknown error")
      );

      const duration = Date.now() - startTime;
      logger.api("POST", "/api/auth/resend-verification", 500, duration);

      return NextResponse.json(
        {
          success: false,
          error: emailResult.error || "Failed to send verification email",
        },
        { status: 500 }
      );
    }

    logger.info("Verification email resent successfully", {
      email,
      messageId: emailResult.messageId,
    });

    const duration = Date.now() - startTime;
    logger.api("POST", "/api/auth/resend-verification", 200, duration);

    return NextResponse.json({
      success: true,
      message: "Verification email sent successfully. Please check your inbox.",
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.api("POST", "/api/auth/resend-verification", 500, duration);
    throw error;
  }
});

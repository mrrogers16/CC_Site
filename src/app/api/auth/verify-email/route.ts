import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api/error-handler";
import { verifyEmailToken } from "@/lib/email/verification";
import { logger } from "@/lib/logger";
import { ValidationError } from "@/lib/errors";

export const POST = withErrorHandler(async (request: NextRequest) => {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { email, token } = body;

    if (!email || !token) {
      throw new ValidationError("Email and token are required");
    }

    const result = await verifyEmailToken(email, token);

    if (!result.success) {
      const duration = Date.now() - startTime;
      logger.api("POST", "/api/auth/verify-email", 400, duration);
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Verification failed",
        },
        { status: 400 }
      );
    }

    logger.info("Email verification successful", { email });

    const duration = Date.now() - startTime;
    logger.api("POST", "/api/auth/verify-email", 200, duration);

    return NextResponse.json({
      success: true,
      message: "Email verified successfully. You can now sign in to your account.",
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.api("POST", "/api/auth/verify-email", 500, duration);
    throw error;
  }
});

// GET method for when users click the verification link
export const GET = withErrorHandler(async (request: NextRequest) => {
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");
    const token = searchParams.get("token");

    if (!email || !token) {
      const duration = Date.now() - startTime;
      logger.api("GET", "/api/auth/verify-email", 400, duration);
      
      // Redirect to error page
      return NextResponse.redirect(
        new URL("/auth/verify-email?error=missing-params", request.url)
      );
    }

    const result = await verifyEmailToken(email, token);

    const duration = Date.now() - startTime;

    if (!result.success) {
      logger.api("GET", "/api/auth/verify-email", 400, duration);
      
      // Redirect to error page with specific error
      const errorParam = result.error?.includes("expired") ? "expired" : "invalid";
      return NextResponse.redirect(
        new URL(`/auth/verify-email?error=${errorParam}`, request.url)
      );
    }

    logger.info("Email verification successful via GET", { email });
    logger.api("GET", "/api/auth/verify-email", 200, duration);

    // Redirect to success page
    return NextResponse.redirect(
      new URL("/auth/verify-email?success=true", request.url)
    );
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.api("GET", "/api/auth/verify-email", 500, duration);
    
    // Redirect to error page
    return NextResponse.redirect(
      new URL("/auth/verify-email?error=server-error", request.url)
    );
  }
});
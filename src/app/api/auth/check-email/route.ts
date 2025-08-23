import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { withErrorHandler } from "@/lib/api/error-handler";
import { z } from "zod";
import { ValidationError } from "@/lib/errors";

const emailCheckSchema = z.object({
  email: z
    .string()
    .email("Please enter a valid email address")
    .min(1, "Email is required"),
});

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");

  // Validate email parameter
  const validationResult = emailCheckSchema.safeParse({ email });
  if (!validationResult.success) {
    throw new ValidationError(
      "Invalid email format",
      validationResult.error.issues
    );
  }

  const normalizedEmail = validationResult.data.email.toLowerCase();

  try {
    // Check if user exists with this email
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true }, // Only select id for efficiency
    });

    const available = !existingUser;

    logger.info("Email availability check", {
      email: normalizedEmail,
      available,
      userExists: !!existingUser,
    });

    return NextResponse.json({
      available,
      message: available
        ? "Email address is available"
        : "Email address is already registered",
    });
  } catch (error) {
    logger.error(
      "Database error during email availability check",
      error instanceof Error ? error : new Error(String(error))
    );
    throw new Error("Failed to check email availability");
  }
});

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { withErrorHandler } from "@/lib/api/error-handler";
import { registerSchema } from "@/lib/validations/auth";
import { ValidationError, ConflictError } from "@/lib/errors";
import { sendVerificationEmail } from "@/lib/email/verification";

export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();

  // Validate input
  const validationResult = registerSchema.safeParse(body);
  if (!validationResult.success) {
    logger.warn("Registration validation failed", {
      body,
      errors: validationResult.error.issues,
    });
    throw new ValidationError(
      "Invalid registration data",
      validationResult.error.issues
    );
  }

  const { name, email, password, phone } = validationResult.data;

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (existingUser) {
    throw new ConflictError("User already exists with this email address");
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 12);

  try {
    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        password: hashedPassword,
        phone: phone || null,
        role: "CLIENT",
        emailVerified: null, // Will be set when email is verified
      },
    });

    logger.info("User registered successfully", {
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Send verification email
    const emailResult = await sendVerificationEmail(user.email, user.name);

    if (!emailResult.success) {
      logger.error("Failed to send verification email", new Error(emailResult.error || "Unknown error"), {
        userId: user.id,
        email: user.email,
      });
      // Don't fail registration if email fails, just log it
    } else {
      logger.info("Verification email sent successfully", {
        userId: user.id,
        email: user.email,
        messageId: emailResult.messageId,
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: emailResult.success
          ? "Registration successful. Please check your email to verify your account."
          : "Registration successful, but verification email failed to send. Please contact support.",
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        emailSent: emailResult.success,
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error(
      "Database error during user registration",
      error instanceof Error ? error : new Error(String(error))
    );
    throw new Error("Failed to create user account");
  }
});

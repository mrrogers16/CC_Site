import { render as _render } from "@react-email/components";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import nodemailer from "nodemailer";
import crypto from "crypto";

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

export async function generateVerificationToken(
  email: string
): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  // Delete any existing tokens for this email
  await prisma.verificationToken.deleteMany({
    where: {
      identifier: email,
    },
  });

  // Create new token
  await prisma.verificationToken.create({
    data: {
      identifier: email,
      token,
      expires,
    },
  });

  logger.info("Verification token generated", { email, expires });
  return token;
}

export async function sendVerificationEmail(
  email: string,
  name: string
): Promise<{ success: boolean; error?: string; messageId?: string }> {
  try {
    // Check if email configuration is available
    if (!process.env.EMAIL_SERVER_USER || !process.env.EMAIL_SERVER_PASSWORD) {
      logger.warn(
        "Email configuration not available, skipping verification email",
        {
          email,
        }
      );
      return { success: false, error: "Email configuration not available" };
    }

    // Generate verification token
    const token = await generateVerificationToken(email);
    const verificationUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/verify-email?token=${token}&email=${encodeURIComponent(email)}`;

    // Create professional HTML email
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Email - Healing Pathways Counseling</title>
        </head>
        <body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f9f9f9;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <!-- Header -->
            <div style="background-color: #4a8b8c; color: white; padding: 30px 20px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 300; font-family: 'Playfair Display', serif;">
                Healing Pathways Counseling
              </h1>
            </div>
            
            <!-- Main Content -->
            <div style="padding: 40px 30px;">
              <h2 style="color: #2c2c2c; font-size: 24px; margin-bottom: 20px; font-weight: 300;">
                Welcome, ${name}!
              </h2>
              
              <p style="color: #555; line-height: 1.6; margin-bottom: 20px; font-size: 16px;">
                Thank you for creating your account with Healing Pathways Counseling. 
                To complete your registration and secure your account, please verify your email address.
              </p>
              
              <p style="color: #555; line-height: 1.6; margin-bottom: 30px; font-size: 16px;">
                Click the button below to verify your email address:
              </p>
              
              <!-- Verification Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${verificationUrl}" 
                   style="background-color: #4a8b8c; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-size: 16px; font-weight: 500; display: inline-block;">
                  Verify Email Address
                </a>
              </div>
              
              <p style="color: #777; font-size: 14px; line-height: 1.5; margin-top: 30px;">
                If the button doesn't work, you can also copy and paste this link into your browser:
              </p>
              <p style="color: #4a8b8c; font-size: 14px; word-break: break-all; margin-bottom: 30px;">
                ${verificationUrl}
              </p>
              
              <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px;">
                <p style="color: #777; font-size: 14px; line-height: 1.5; margin-bottom: 10px;">
                  <strong>Important:</strong> This verification link will expire in 24 hours for security reasons.
                </p>
                <p style="color: #777; font-size: 14px; line-height: 1.5; margin-bottom: 10px;">
                  If you didn't create an account with us, please ignore this email.
                </p>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f0f7f7; padding: 20px 30px; border-top: 1px solid #e0e0e0;">
              <p style="color: #666; font-size: 12px; line-height: 1.4; margin: 0; text-align: center;">
                This email was sent by Healing Pathways Counseling<br>
                If you need help, contact us at 
                <a href="mailto:${process.env.EMAIL_FROM}" style="color: #4a8b8c;">${process.env.EMAIL_FROM}</a>
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
Welcome to Healing Pathways Counseling, ${name}!

Thank you for creating your account. To complete your registration and secure your account, please verify your email address.

Click this link to verify your email:
${verificationUrl}

This verification link will expire in 24 hours for security reasons.

If you didn't create an account with us, please ignore this email.

Need help? Contact us at ${process.env.EMAIL_FROM}

Healing Pathways Counseling
    `;

    const mailOptions = {
      from: `"Healing Pathways Counseling" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: "Verify Your Email Address - Healing Pathways Counseling",
      html,
      text,
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info("Verification email sent successfully", {
      email,
      messageId: info.messageId,
      token: token.substring(0, 8) + "...", // Log partial token for debugging
    });

    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error(
      "Failed to send verification email",
      error instanceof Error ? error : new Error(String(error)),
      { email }
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function verifyEmailToken(
  email: string,
  token: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Find the verification token
    const verificationToken = await prisma.verificationToken.findFirst({
      where: {
        identifier: email,
        token,
        expires: {
          gt: new Date(), // Token must not be expired
        },
      },
    });

    if (!verificationToken) {
      logger.warn("Invalid or expired verification token", { email });
      return { success: false, error: "Invalid or expired verification token" };
    }

    // Update user as verified
    await prisma.user.update({
      where: { email },
      data: { emailVerified: new Date() },
    });

    // Delete the used verification token
    await prisma.verificationToken.delete({
      where: {
        identifier_token: {
          identifier: verificationToken.identifier,
          token: verificationToken.token,
        },
      },
    });

    logger.info("Email verified successfully", { email });
    return { success: true };
  } catch (error) {
    logger.error(
      "Failed to verify email token",
      error instanceof Error ? error : new Error(String(error)),
      { email, token: token.substring(0, 8) + "..." }
    );
    return {
      success: false,
      error: error instanceof Error ? error.message : "Verification failed",
    };
  }
}

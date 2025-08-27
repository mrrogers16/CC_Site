import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { withErrorHandler } from "@/lib/api/error-handler";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { authOptions } from "@/lib/auth";
import { NotFoundError, ValidationError } from "@/lib/errors";

// Profile validation schema
const updateProfileSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters"),
  phone: z
    .string()
    .optional()
    .refine(val => {
      if (!val || val.trim() === "") return true;
      const cleaned = val.replace(/\D/g, "");
      return cleaned.length === 10;
    }, "Please enter a valid 10-digit phone number"),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z
    .string()
    .optional()
    .refine(val => {
      if (!val || val.trim() === "") return true;
      const cleaned = val.replace(/\D/g, "");
      return cleaned.length === 10;
    }, "Please enter a valid 10-digit phone number"),
  communicationPreferences: z.object({
    emailNotifications: z.boolean(),
    smsReminders: z.boolean(),
    reminderTime: z.enum(["24", "2", "1", "0.5"]),
  }),
});

// Get user profile
export const GET = withErrorHandler(async (_request: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized", message: "Please sign in to view profile" },
      { status: 401 }
    );
  }

  const userId = session.user.id;

  try {
    // Find user with profile data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        emergencyContactName: true,
        emergencyContactPhone: true,
        emailNotifications: true,
        smsReminders: true,
        reminderTime: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundError("User");
    }

    logger.info("Profile data retrieved", { userId });

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        emergencyContactName: user.emergencyContactName,
        emergencyContactPhone: user.emergencyContactPhone,
        emailNotifications: user.emailNotifications ?? true,
        smsReminders: user.smsReminders ?? false,
        reminderTime: user.reminderTime || "24",
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    logger.error(
      "Error retrieving profile data",
      error instanceof Error ? error : new Error(String(error))
    );
    throw error;
  }
});

// Update user profile
export const PUT = withErrorHandler(async (request: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized", message: "Please sign in to update profile" },
      { status: 401 }
    );
  }

  const userId = session.user.id;

  logger.info("Updating user profile", { userId });

  try {
    // Parse and validate request body
    const body = await request.json();
    const validatedData = updateProfileSchema.parse(body);

    // Clean phone numbers (remove formatting)
    const cleanPhone = validatedData.phone
      ? validatedData.phone.replace(/\D/g, "")
      : null;
    const cleanEmergencyPhone = validatedData.emergencyContactPhone
      ? validatedData.emergencyContactPhone.replace(/\D/g, "")
      : null;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      throw new NotFoundError("User");
    }

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name: validatedData.name.trim(),
        phone: cleanPhone,
        emergencyContactName:
          validatedData.emergencyContactName?.trim() || null,
        emergencyContactPhone: cleanEmergencyPhone,
        emailNotifications:
          validatedData.communicationPreferences.emailNotifications,
        smsReminders: validatedData.communicationPreferences.smsReminders,
        reminderTime: validatedData.communicationPreferences.reminderTime,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        emergencyContactName: true,
        emergencyContactPhone: true,
        emailNotifications: true,
        smsReminders: true,
        reminderTime: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    logger.info("Profile updated successfully", { userId });

    return NextResponse.json({
      success: true,
      data: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        emergencyContactName: updatedUser.emergencyContactName,
        emergencyContactPhone: updatedUser.emergencyContactPhone,
        emailNotifications: updatedUser.emailNotifications,
        smsReminders: updatedUser.smsReminders,
        reminderTime: updatedUser.reminderTime,
        createdAt: updatedUser.createdAt.toISOString(),
        updatedAt: updatedUser.updatedAt.toISOString(),
      },
      message: "Profile updated successfully",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0];
      throw new ValidationError(firstError.message);
    }

    logger.error(
      "Error updating profile",
      error instanceof Error ? error : new Error(String(error))
    );
    throw error;
  }
});

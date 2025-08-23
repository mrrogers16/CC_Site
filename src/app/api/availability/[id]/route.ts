import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { withErrorHandler } from "@/lib/api/error-handler";
import { availabilitySchema } from "@/lib/validations/appointments";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { authOptions } from "@/lib/auth";
import { NotFoundError, ValidationError } from "@/lib/errors";

// GET /api/availability/[id] - Get specific availability window
export const GET = withErrorHandler(
  async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const { id: availabilityId } = await params;

    const availability = await prisma.availability.findUnique({
      where: { id: availabilityId },
    });

    if (!availability) {
      throw new NotFoundError("Availability window not found");
    }

    const dayName = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ][availability.dayOfWeek];

    return NextResponse.json({
      success: true,
      data: {
        id: availability.id,
        dayOfWeek: availability.dayOfWeek,
        dayName,
        startTime: availability.startTime,
        endTime: availability.endTime,
        isActive: availability.isActive,
        createdAt: availability.createdAt.toISOString(),
        updatedAt: availability.updatedAt.toISOString(),
      },
    });
  }
);

// PATCH /api/availability/[id] - Update availability window (admin only)
export const PATCH = withErrorHandler(
  async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          message: "Please sign in to manage availability",
        },
        { status: 401 }
      );
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden", message: "Admin access required" },
        { status: 403 }
      );
    }

    const { id: availabilityId } = await params;
    const data = await request.json();

    // Validate request data (allow partial updates)
    const validated = availabilitySchema.partial().parse(data);

    // Find the existing availability window
    const existingAvailability = await prisma.availability.findUnique({
      where: { id: availabilityId },
    });

    if (!existingAvailability) {
      throw new NotFoundError("Availability window not found");
    }

    // If updating time slots, check for conflicts
    if (
      validated.dayOfWeek !== undefined ||
      validated.startTime ||
      validated.endTime
    ) {
      const dayOfWeek = validated.dayOfWeek ?? existingAvailability.dayOfWeek;
      const startTime = validated.startTime ?? existingAvailability.startTime;
      const endTime = validated.endTime ?? existingAvailability.endTime;

      // Check for overlapping windows on the same day (excluding current window)
      const overlappingWindows = await prisma.availability.findMany({
        where: {
          id: { not: availabilityId },
          dayOfWeek,
          isActive: true,
          OR: [
            // Updated window starts within existing window
            {
              startTime: { lte: startTime },
              endTime: { gt: startTime },
            },
            // Updated window ends within existing window
            {
              startTime: { lt: endTime },
              endTime: { gte: endTime },
            },
            // Updated window completely contains existing window
            {
              startTime: { gte: startTime },
              endTime: { lte: endTime },
            },
          ],
        },
      });

      if (overlappingWindows.length > 0) {
        throw new ValidationError(
          "Updated availability window would overlap with existing active window"
        );
      }
    }

    // Update the availability window
    // Filter out undefined values for exactOptionalPropertyTypes compliance
    const updateData = Object.fromEntries(
      Object.entries(validated).filter(([, value]) => value !== undefined)
    );

    const updatedAvailability = await prisma.availability.update({
      where: { id: availabilityId },
      data: updateData,
    });

    const dayName = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ][updatedAvailability.dayOfWeek];

    logger.info("Availability window updated", {
      availabilityId,
      dayOfWeek: updatedAvailability.dayOfWeek,
      dayName,
      changes: validated,
      updatedBy: session.user.id,
    });

    return NextResponse.json({
      success: true,
      message: "Availability window updated successfully",
      data: {
        id: updatedAvailability.id,
        dayOfWeek: updatedAvailability.dayOfWeek,
        dayName,
        startTime: updatedAvailability.startTime,
        endTime: updatedAvailability.endTime,
        isActive: updatedAvailability.isActive,
        createdAt: updatedAvailability.createdAt.toISOString(),
        updatedAt: updatedAvailability.updatedAt.toISOString(),
      },
    });
  }
);

// DELETE /api/availability/[id] - Delete availability window (admin only)
export const DELETE = withErrorHandler(
  async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          message: "Please sign in to manage availability",
        },
        { status: 401 }
      );
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden", message: "Admin access required" },
        { status: 403 }
      );
    }

    const { id: availabilityId } = await params;

    // Find the availability window
    const availability = await prisma.availability.findUnique({
      where: { id: availabilityId },
    });

    if (!availability) {
      throw new NotFoundError("Availability window not found");
    }

    // Check if this would leave any day without availability (optional warning)
    const remainingWindowsForDay = await prisma.availability.count({
      where: {
        dayOfWeek: availability.dayOfWeek,
        isActive: true,
        id: { not: availabilityId },
      },
    });

    const dayName = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ][availability.dayOfWeek];

    // Delete the availability window
    await prisma.availability.delete({
      where: { id: availabilityId },
    });

    logger.info("Availability window deleted", {
      availabilityId,
      dayOfWeek: availability.dayOfWeek,
      dayName,
      remainingWindowsForDay,
      deletedBy: session.user.id,
    });

    return NextResponse.json({
      success: true,
      message: "Availability window deleted successfully",
      data: {
        id: availabilityId,
        dayOfWeek: availability.dayOfWeek,
        dayName,
        remainingWindowsForDay,
        warning:
          remainingWindowsForDay === 0
            ? `No active availability windows remaining for ${dayName}`
            : undefined,
      },
    });
  }
);

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { withErrorHandler } from "@/lib/api/error-handler";
import { UnauthorizedError } from "@/lib/errors";
import { z } from "zod";
import { isTimeSlotAvailable, generateTimeSlots } from "@/lib/utils/time-slots";

const conflictCheckSchema = z.object({
  dateTime: z.string().transform(str => new Date(str)),
  serviceId: z.string().cuid(),
  serviceDuration: z.number().int().positive(),
  excludeAppointmentId: z.string().cuid().optional(),
});

interface ConflictingAppointment {
  id: string;
  dateTime: string;
  status: string;
  service: {
    title: string;
    duration: number;
  };
  user: {
    name: string;
  };
}

interface ConflictDetection {
  hasConflict: boolean;
  conflictType: "appointment" | "blocked" | "outside_hours" | null;
  conflictingAppointments: ConflictingAppointment[];
  reason: string;
  suggestedAlternatives: Array<{
    dateTime: string;
    displayTime: string;
  }>;
}

export const POST = withErrorHandler(async (request: NextRequest) => {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "ADMIN") {
    throw new UnauthorizedError("Admin access required");
  }

  const body = await request.json();
  const validatedData = conflictCheckSchema.parse(body);

  logger.info("Checking appointment conflicts", {
    dateTime: validatedData.dateTime.toISOString(),
    serviceId: validatedData.serviceId,
    excludeAppointmentId: validatedData.excludeAppointmentId,
    adminId: session.user.id,
  });

  // Check if the time slot is available
  const availabilityCheck = await isTimeSlotAvailable(
    validatedData.dateTime,
    validatedData.serviceId,
    validatedData.excludeAppointmentId
  );

  if (availabilityCheck.available) {
    return NextResponse.json({
      hasConflict: false,
      conflictType: null,
      conflictingAppointments: [],
      reason: "",
      suggestedAlternatives: [],
    } as ConflictDetection);
  }

  // If not available, find the specific conflicts
  const conflicts: ConflictDetection = {
    hasConflict: true,
    conflictType: "appointment",
    conflictingAppointments: [],
    reason: availabilityCheck.reason || "Time slot not available",
    suggestedAlternatives: [],
  };

  // Determine conflict type based on reason
  if (availabilityCheck.reason?.includes("business hours")) {
    conflicts.conflictType = "outside_hours";
  } else if (availabilityCheck.reason?.includes("blocked")) {
    conflicts.conflictType = "blocked";
  } else if (availabilityCheck.reason?.includes("conflict")) {
    conflicts.conflictType = "appointment";

    // Get conflicting appointments for detailed display
    const startOfDay = new Date(validatedData.dateTime);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(validatedData.dateTime);
    endOfDay.setHours(23, 59, 59, 999);

    const existingAppointments = await prisma.appointment.findMany({
      where: {
        dateTime: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: {
          in: ["PENDING", "CONFIRMED"],
        },
        ...(validatedData.excludeAppointmentId && {
          id: { not: validatedData.excludeAppointmentId },
        }),
      },
      include: {
        user: {
          select: {
            name: true,
          },
        },
        service: {
          select: {
            title: true,
            duration: true,
          },
        },
      },
    });

    // Filter to only appointments that actually conflict with the requested time
    const requestedStart = validatedData.dateTime.getTime();
    const requestedEnd =
      requestedStart + validatedData.serviceDuration * 60 * 1000;

    conflicts.conflictingAppointments = existingAppointments
      .filter(appointment => {
        const appointmentStart = appointment.dateTime.getTime();
        const appointmentEnd =
          appointmentStart + appointment.service.duration * 60 * 1000;

        // Add 15-minute buffer
        const bufferMs = 15 * 60 * 1000;
        const bufferedStart = appointmentStart - bufferMs;
        const bufferedEnd = appointmentEnd + bufferMs;

        // Check if they overlap
        return !(
          requestedEnd <= bufferedStart || requestedStart >= bufferedEnd
        );
      })
      .map(appointment => ({
        id: appointment.id,
        dateTime: appointment.dateTime.toISOString(),
        status: appointment.status,
        service: {
          title: appointment.service.title,
          duration: appointment.service.duration,
        },
        user: {
          name: appointment.user.name,
        },
      }));
  }

  // Generate suggested alternative times
  try {
    const targetDate = new Date(validatedData.dateTime);
    const allSlots = await generateTimeSlots(
      targetDate,
      validatedData.serviceId
    );

    const availableSlots = allSlots
      .filter(slot => slot.available)
      .slice(0, 6) // Limit to 6 suggestions
      .map(slot => ({
        dateTime: slot.dateTime.toISOString(),
        displayTime: slot.dateTime.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        }),
      }));

    conflicts.suggestedAlternatives = availableSlots;

    // If no slots available for this day, try the next day
    if (availableSlots.length === 0) {
      const nextDay = new Date(targetDate);
      nextDay.setDate(nextDay.getDate() + 1);

      const nextDaySlots = await generateTimeSlots(
        nextDay,
        validatedData.serviceId
      );
      const nextDayAvailable = nextDaySlots
        .filter(slot => slot.available)
        .slice(0, 6)
        .map(slot => ({
          dateTime: slot.dateTime.toISOString(),
          displayTime: `Tomorrow ${slot.dateTime.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          })}`,
        }));

      conflicts.suggestedAlternatives = nextDayAvailable;
    }
  } catch (error) {
    logger.error(
      "Failed to generate suggested alternatives",
      error instanceof Error ? error : new Error(String(error)),
      {
        dateTime: validatedData.dateTime.toISOString(),
        serviceId: validatedData.serviceId,
      }
    );
  }

  logger.info("Conflict detection completed", {
    dateTime: validatedData.dateTime.toISOString(),
    hasConflict: conflicts.hasConflict,
    conflictType: conflicts.conflictType,
    conflictingCount: conflicts.conflictingAppointments.length,
    suggestedCount: conflicts.suggestedAlternatives.length,
  });

  return NextResponse.json(conflicts);
});

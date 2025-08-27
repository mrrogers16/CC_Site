import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { withErrorHandler } from "@/lib/api/error-handler";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { authOptions } from "@/lib/auth";
import { NotFoundError, ValidationError, ConflictError } from "@/lib/errors";
import { canRescheduleAppointment } from "@/lib/utils/rescheduling-policy";

const rescheduleSchema = z.object({
  newDateTime: z.string().datetime(),
  reason: z.string().optional().default("Client requested reschedule"),
});

export const PUT = withErrorHandler(
  async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          message: "Please sign in to reschedule appointments",
        },
        { status: 401 }
      );
    }

    const { id } = await params;
    const userId = session.user.id;

    logger.info("Rescheduling appointment", { appointmentId: id, userId });

    try {
      // Parse and validate request body
      const body = await request.json();
      const { newDateTime, reason } = rescheduleSchema.parse(body);

      // Find the existing appointment
      const existingAppointment = await prisma.appointment.findFirst({
        where: {
          id,
          userId,
        },
        include: {
          service: {
            select: {
              id: true,
              title: true,
              duration: true,
              price: true,
            },
          },
        },
      });

      if (!existingAppointment) {
        throw new NotFoundError("Appointment");
      }

      // Check if appointment can be rescheduled
      if (
        !canRescheduleAppointment(
          existingAppointment.status,
          existingAppointment.dateTime.toISOString()
        )
      ) {
        throw new ValidationError("This appointment cannot be rescheduled");
      }

      // Check if new date/time is in the future
      const newDate = new Date(newDateTime);
      const now = new Date();
      if (newDate <= now) {
        throw new ValidationError("Cannot reschedule to a past date or time");
      }

      // Check for conflicts with existing appointments (same user, same time)
      const conflict = await prisma.appointment.findFirst({
        where: {
          userId,
          dateTime: newDate,
          status: {
            in: ["PENDING", "CONFIRMED"],
          },
          id: {
            not: id, // Exclude current appointment
          },
        },
      });

      if (conflict) {
        throw new ConflictError("You already have an appointment at this time");
      }

      // Check service availability at the new time
      // This is a simplified check - in production you might want more complex availability logic
      const _serviceEndTime = new Date(
        newDate.getTime() + existingAppointment.service.duration * 60 * 1000
      );

      // Check if it's within business hours (9 AM - 5 PM weekdays, 10 AM - 2 PM Saturday)
      // Use UTC hours for consistent behavior across timezones
      const dayOfWeek = newDate.getUTCDay();
      const hour = newDate.getUTCHours();

      if (dayOfWeek === 0) {
        // Sunday
        throw new ValidationError("We are closed on Sundays");
      }

      if (dayOfWeek === 6) {
        // Saturday
        if (hour < 10 || hour >= 14) {
          throw new ValidationError(
            "Saturday appointments are only available from 10 AM to 2 PM"
          );
        }
      } else {
        // Weekdays
        if (hour < 9 || hour >= 17) {
          throw new ValidationError(
            "Weekday appointments are only available from 9 AM to 5 PM"
          );
        }
      }

      // Update the appointment
      const updatedAppointment = await prisma.appointment.update({
        where: { id },
        data: {
          dateTime: newDate,
          notes: existingAppointment.notes
            ? `${existingAppointment.notes}\n\nRescheduled: ${reason}`
            : `Rescheduled: ${reason}`,
          updatedAt: new Date(),
        },
        include: {
          service: {
            select: {
              title: true,
              duration: true,
              price: true,
            },
          },
        },
      });

      // Format response data
      const formattedAppointment = {
        id: updatedAppointment.id,
        dateTime: updatedAppointment.dateTime.toISOString(),
        status: updatedAppointment.status,
        notes: updatedAppointment.notes,
        service: {
          title: updatedAppointment.service.title,
          duration: updatedAppointment.service.duration,
          price: updatedAppointment.service.price.toString(),
        },
        createdAt: updatedAppointment.createdAt.toISOString(),
        updatedAt: updatedAppointment.updatedAt.toISOString(),
      };

      logger.info("Appointment rescheduled successfully", {
        appointmentId: id,
        userId,
        oldDateTime: existingAppointment.dateTime.toISOString(),
        newDateTime: newDateTime,
      });

      return NextResponse.json({
        success: true,
        data: formattedAppointment,
        message: "Appointment rescheduled successfully",
      });
    } catch (error) {
      logger.error(
        "Error rescheduling appointment",
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }
);

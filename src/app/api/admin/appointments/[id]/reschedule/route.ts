import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { withErrorHandler } from "@/lib/api/error-handler";
import {
  NotFoundError,
  UnauthorizedError,
  ConflictError,
  ValidationError,
} from "@/lib/errors";
import { rescheduleAppointmentSchema } from "@/lib/validations/appointments";
import { isTimeSlotAvailable } from "@/lib/utils/time-slots";

export const POST = withErrorHandler(
  async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      throw new UnauthorizedError("Admin access required");
    }

    const { id } = await params;
    const body = await request.json();

    const validatedData = rescheduleAppointmentSchema.parse(body);

    // Check if appointment exists
    const existingAppointment = await prisma.appointment.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        service: {
          select: {
            id: true,
            title: true,
            description: true,
            duration: true,
            price: true,
          },
        },
      },
    });

    if (!existingAppointment) {
      throw new NotFoundError("Appointment");
    }

    // Prevent rescheduling completed or cancelled appointments
    if (
      ["COMPLETED", "CANCELLED", "NO_SHOW"].includes(existingAppointment.status)
    ) {
      throw new ValidationError(
        "Cannot reschedule completed, cancelled, or no-show appointments"
      );
    }

    // Check if the new time slot is available (excluding current appointment)
    const availabilityCheck = await isTimeSlotAvailable(
      validatedData.newDateTime,
      existingAppointment.serviceId,
      existingAppointment.id
    );

    if (!availabilityCheck.available) {
      throw new ConflictError(
        `New time slot is not available: ${availabilityCheck.reason || "Unknown reason"}`
      );
    }

    // Create appointment history record
    const appointmentHistory = await prisma.$transaction(async tx => {
      // Create history record for the reschedule
      const historyRecord = await tx.appointmentHistory.create({
        data: {
          appointmentId: existingAppointment.id,
          action: "RESCHEDULED",
          oldDateTime: existingAppointment.dateTime,
          newDateTime: validatedData.newDateTime,
          ...(validatedData.reason && { reason: validatedData.reason }),
          adminId: session.user.id,
          adminName: session.user.name || "Admin",
        },
      });

      // Update the appointment with new date/time
      const updatedAppointment = await tx.appointment.update({
        where: { id },
        data: {
          dateTime: validatedData.newDateTime,
          status: "PENDING", // Reset to pending after reschedule
          updatedAt: new Date(),
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          service: {
            select: {
              id: true,
              title: true,
              description: true,
              duration: true,
              price: true,
            },
          },
        },
      });

      return { historyRecord, updatedAppointment };
    });

    logger.info("Appointment rescheduled successfully", {
      appointmentId: id,
      oldDateTime: existingAppointment.dateTime.toISOString(),
      newDateTime: validatedData.newDateTime.toISOString(),
      adminId: session.user.id,
      reason: validatedData.reason,
      historyId: appointmentHistory.historyRecord.id,
    });

    return NextResponse.json({
      success: true,
      appointment: {
        ...appointmentHistory.updatedAppointment,
        service: {
          ...appointmentHistory.updatedAppointment.service,
          price: Number(appointmentHistory.updatedAppointment.service.price),
        },
      },
      historyRecord: appointmentHistory.historyRecord,
      message: "Appointment rescheduled successfully",
    });
  }
);

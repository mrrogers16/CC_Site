import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { withErrorHandler } from "@/lib/api/error-handler";
import {
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "@/lib/errors";
import { z } from "zod";
import { sendAppointmentCancellation } from "@/lib/email";

const cancelAppointmentSchema = z.object({
  reason: z
    .string()
    .max(200, "Reason cannot exceed 200 characters")
    .optional()
    .transform(val => val?.trim() || undefined),
  sendNotification: z.boolean().default(true),
  cancellationPolicy: z.string().optional(),
});

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

    const validatedData = cancelAppointmentSchema.parse(body);

    // Check if appointment exists and get full details
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

    // Prevent cancelling already cancelled appointments
    if (existingAppointment.status === "CANCELLED") {
      throw new ValidationError("Appointment is already cancelled");
    }

    // Prevent cancelling completed appointments
    if (["COMPLETED", "NO_SHOW"].includes(existingAppointment.status)) {
      throw new ValidationError(
        "Cannot cancel completed or no-show appointments"
      );
    }

    // Cancel appointment and create history record
    const result = await prisma.$transaction(async tx => {
      // Create history record for the cancellation
      const historyRecord = await tx.appointmentHistory.create({
        data: {
          appointmentId: existingAppointment.id,
          action: "CANCELLED",
          oldStatus: existingAppointment.status,
          newStatus: "CANCELLED",
          ...(validatedData.reason && { reason: validatedData.reason }),
          adminId: session.user.id,
          adminName: session.user.name || "Admin",
        },
      });

      // Update the appointment status to cancelled
      const cancelledAppointment = await tx.appointment.update({
        where: { id },
        data: {
          status: "CANCELLED",
          ...(validatedData.reason && {
            cancellationReason: validatedData.reason,
          }),
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

      return { historyRecord, cancelledAppointment };
    });

    // Send cancellation notification email if requested
    let emailResult = null;
    if (validatedData.sendNotification) {
      try {
        emailResult = await sendAppointmentCancellation(
          result.cancelledAppointment.user.email,
          result.cancelledAppointment.user.name,
          result.cancelledAppointment.dateTime.toISOString(),
          {
            service: result.cancelledAppointment.service.title,
            duration: result.cancelledAppointment.service.duration,
            price: Number(result.cancelledAppointment.service.price).toString(),
          },
          validatedData.reason,
          validatedData.cancellationPolicy
        );

        if (emailResult.success) {
          logger.info("Cancellation notification sent successfully", {
            appointmentId: id,
            clientEmail: result.cancelledAppointment.user.email,
            messageId: emailResult.messageId,
          });
        } else {
          logger.warn("Failed to send cancellation notification", {
            appointmentId: id,
            clientEmail: result.cancelledAppointment.user.email,
            error: emailResult.error,
          });
        }
      } catch (error) {
        logger.error(
          "Error sending cancellation notification",
          error instanceof Error ? error : new Error(String(error)),
          {
            appointmentId: id,
            clientEmail: result.cancelledAppointment.user.email,
          }
        );
      }
    }

    logger.info("Appointment cancelled successfully", {
      appointmentId: id,
      oldStatus: existingAppointment.status,
      adminId: session.user.id,
      reason: validatedData.reason,
      notificationSent: emailResult?.success || false,
      historyId: result.historyRecord.id,
    });

    return NextResponse.json({
      success: true,
      appointment: {
        ...result.cancelledAppointment,
        service: {
          ...result.cancelledAppointment.service,
          price: Number(result.cancelledAppointment.service.price),
        },
      },
      historyRecord: result.historyRecord,
      notificationSent: emailResult?.success || false,
      notificationError: emailResult?.success ? undefined : emailResult?.error,
      message: "Appointment cancelled successfully",
    });
  }
);

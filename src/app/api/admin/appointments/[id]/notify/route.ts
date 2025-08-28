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
import {
  sendAppointmentConfirmation,
  sendAppointmentReschedule,
  sendAppointmentCancellation,
} from "@/lib/email";

const notificationSchema = z.object({
  type: z.enum(["confirmation", "reschedule", "cancellation", "reminder"]),
  customMessage: z.string().max(500).optional(),
  includeCustomMessage: z.boolean().default(false),
  // For reschedule notifications
  oldDateTime: z
    .string()
    .transform(str => new Date(str))
    .optional(),
  reason: z.string().max(200).optional(),
  // For cancellation notifications
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

    const validatedData = notificationSchema.parse(body);

    // Get appointment details
    const appointment = await prisma.appointment.findUnique({
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

    if (!appointment) {
      throw new NotFoundError("Appointment");
    }

    let emailResult;
    const appointmentDetails = {
      service: appointment.service.title,
      duration: appointment.service.duration,
      price: Number(appointment.service.price).toString(),
    };

    try {
      switch (validatedData.type) {
        case "confirmation":
          emailResult = await sendAppointmentConfirmation(
            appointment.user.email,
            appointment.user.name,
            {
              id: appointment.id,
              service: appointment.service.title,
              dateTime: appointment.dateTime.toISOString(),
              duration: appointment.service.duration,
              price: Number(appointment.service.price).toString(),
            }
          );
          break;

        case "reschedule":
          if (!validatedData.oldDateTime) {
            throw new ValidationError(
              "Old date/time is required for reschedule notifications"
            );
          }

          emailResult = await sendAppointmentReschedule(
            appointment.user.email,
            appointment.user.name,
            validatedData.oldDateTime.toISOString(),
            appointment.dateTime.toISOString(),
            appointmentDetails,
            validatedData.reason
          );
          break;

        case "cancellation":
          emailResult = await sendAppointmentCancellation(
            appointment.user.email,
            appointment.user.name,
            appointment.dateTime.toISOString(),
            appointmentDetails,
            validatedData.reason,
            validatedData.cancellationPolicy
          );
          break;

        case "reminder":
          // For reminder, we'll use the confirmation email template
          emailResult = await sendAppointmentConfirmation(
            appointment.user.email,
            appointment.user.name,
            {
              id: appointment.id,
              service: appointment.service.title,
              dateTime: appointment.dateTime.toISOString(),
              duration: appointment.service.duration,
              price: Number(appointment.service.price).toString(),
            }
          );
          break;

        default:
          throw new ValidationError("Invalid notification type");
      }

      // Update reminder sent timestamp if this was a reminder
      if (validatedData.type === "reminder" && emailResult.success) {
        await prisma.appointment.update({
          where: { id },
          data: { reminderSent: new Date() },
        });
      }

      // Update confirmation sent timestamp if this was a confirmation
      if (validatedData.type === "confirmation" && emailResult.success) {
        await prisma.appointment.update({
          where: { id },
          data: { confirmationSent: new Date() },
        });
      }

      logger.info("Appointment notification sent", {
        appointmentId: id,
        notificationType: validatedData.type,
        clientEmail: appointment.user.email,
        success: emailResult.success,
        messageId: emailResult.messageId,
        adminId: session.user.id,
      });

      return NextResponse.json({
        success: true,
        notificationSent: emailResult.success,
        notificationError: emailResult.success ? undefined : emailResult.error,
        messageId: emailResult.messageId,
        message: `${validatedData.type.charAt(0).toUpperCase() + validatedData.type.slice(1)} notification ${emailResult.success ? "sent successfully" : "failed to send"}`,
      });
    } catch (error) {
      logger.error(
        "Failed to send appointment notification",
        error instanceof Error ? error : new Error(String(error)),
        {
          appointmentId: id,
          notificationType: validatedData.type,
          clientEmail: appointment.user.email,
          adminId: session.user.id,
        }
      );

      return NextResponse.json({
        success: false,
        notificationSent: false,
        notificationError:
          error instanceof Error ? error.message : "Unknown error",
        message: "Failed to send notification",
      });
    }
  }
);

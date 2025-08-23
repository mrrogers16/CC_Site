import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { withErrorHandler } from "@/lib/api/error-handler";
import {
  updateAppointmentSchema,
  rescheduleAppointmentSchema,
} from "@/lib/validations/appointments";
import { isTimeSlotAvailable } from "@/lib/utils/time-slots";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { authOptions } from "@/lib/auth";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { AppointmentStatus } from "@/generated/prisma";

// GET /api/appointments/[id] - Get appointment details
export const GET = withErrorHandler(
  async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          message: "Please sign in to view appointments",
        },
        { status: 401 }
      );
    }

    const { id: appointmentId } = await params;
    const userId = session.user.id;
    const isAdmin = session.user.role === "ADMIN";

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        service: {
          select: {
            title: true,
            duration: true,
            price: true,
          },
        },
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!appointment) {
      throw new NotFoundError("Appointment not found");
    }

    // Check if user can access this appointment (own appointment or admin)
    if (appointment.userId !== userId && !isAdmin) {
      return NextResponse.json(
        {
          error: "Forbidden",
          message: "You can only view your own appointments",
        },
        { status: 403 }
      );
    }

    logger.info("Appointment retrieved", {
      appointmentId,
      userId: appointment.userId,
      requestedBy: userId,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: appointment.id,
        dateTime: appointment.dateTime.toISOString(),
        status: appointment.status,
        notes: appointment.notes,
        cancellationReason: appointment.cancellationReason,
        service: {
          title: appointment.service.title,
          duration: appointment.service.duration,
          price: appointment.service.price.toString(),
        },
        user: appointment.user,
        createdAt: appointment.createdAt.toISOString(),
        updatedAt: appointment.updatedAt.toISOString(),
      },
    });
  }
);

// PATCH /api/appointments/[id] - Update appointment (status, notes, etc.)
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
          message: "Please sign in to update appointments",
        },
        { status: 401 }
      );
    }

    const { id: appointmentId } = await params;
    const userId = session.user.id;
    const isAdmin = session.user.role === "ADMIN";
    const data = await request.json();

    // Validate request data
    const validated = updateAppointmentSchema.parse(data);

    // Find the appointment
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { service: true },
    });

    if (!appointment) {
      throw new NotFoundError("Appointment not found");
    }

    // Check permissions
    if (appointment.userId !== userId && !isAdmin) {
      return NextResponse.json(
        {
          error: "Forbidden",
          message: "You can only update your own appointments",
        },
        { status: 403 }
      );
    }

    // Status change validation
    if (validated.status) {
      // Only allow certain status transitions
      const allowedTransitions: Record<AppointmentStatus, AppointmentStatus[]> =
        {
          PENDING: ["CONFIRMED", "CANCELLED"],
          CONFIRMED: ["COMPLETED", "CANCELLED", "NO_SHOW"],
          CANCELLED: [], // Cannot change from cancelled
          COMPLETED: [], // Cannot change from completed
          NO_SHOW: [], // Cannot change from no show
        };

      // Type-safe status validation with proper type guard
      const currentStatus = appointment.status as AppointmentStatus;
      const newStatus = validated.status as AppointmentStatus;

      if (!allowedTransitions[currentStatus].includes(newStatus)) {
        throw new ValidationError(
          `Cannot change status from ${currentStatus} to ${newStatus}`
        );
      }

      // Cancellation requires reason
      if (validated.status === "CANCELLED" && !validated.cancellationReason) {
        throw new ValidationError("Cancellation reason is required");
      }
    }

    // Update the appointment
    const updateData: any = {};
    if (validated.status !== undefined) updateData.status = validated.status;
    if (validated.notes !== undefined) updateData.notes = validated.notes;
    if (validated.cancellationReason !== undefined)
      updateData.cancellationReason = validated.cancellationReason;

    const updatedAppointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: updateData,
      include: {
        service: {
          select: {
            title: true,
            duration: true,
            price: true,
          },
        },
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    logger.info("Appointment updated", {
      appointmentId,
      updatedBy: userId,
      changes: validated,
    });

    return NextResponse.json({
      success: true,
      message: "Appointment updated successfully",
      data: {
        id: updatedAppointment.id,
        dateTime: updatedAppointment.dateTime.toISOString(),
        status: updatedAppointment.status,
        notes: updatedAppointment.notes,
        cancellationReason: updatedAppointment.cancellationReason,
        service: {
          title: updatedAppointment.service.title,
          duration: updatedAppointment.service.duration,
          price: updatedAppointment.service.price.toString(),
        },
        user: {
          name: updatedAppointment.user.name,
          email: updatedAppointment.user.email,
        },
        updatedAt: updatedAppointment.updatedAt.toISOString(),
      },
    });
  }
);

// PUT /api/appointments/[id]/reschedule - Reschedule appointment
export const PUT = withErrorHandler(
  async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
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

    const { id: appointmentId } = await params;
    const userId = session.user.id;
    const isAdmin = session.user.role === "ADMIN";
    const data = await request.json();

    // Validate request data
    const validated = rescheduleAppointmentSchema.parse(data);

    // Find the appointment
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { service: true },
    });

    if (!appointment) {
      throw new NotFoundError("Appointment not found");
    }

    // Check permissions
    if (appointment.userId !== userId && !isAdmin) {
      return NextResponse.json(
        {
          error: "Forbidden",
          message: "You can only reschedule your own appointments",
        },
        { status: 403 }
      );
    }

    // Can only reschedule PENDING or CONFIRMED appointments
    if (!["PENDING", "CONFIRMED"].includes(appointment.status)) {
      throw new ValidationError(
        `Cannot reschedule appointment with status: ${appointment.status}`
      );
    }

    // Check if new time slot is available
    const availability = await isTimeSlotAvailable(
      validated.newDateTime,
      appointment.serviceId,
      appointmentId // Exclude current appointment from conflict check
    );

    if (!availability.available) {
      throw new ValidationError(
        availability.reason || "New time slot is not available"
      );
    }

    // Update the appointment
    const rescheduledAppointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        dateTime: validated.newDateTime,
        notes: validated.reason
          ? `${appointment.notes || ""}\n\nRescheduled: ${validated.reason}`.trim()
          : appointment.notes,
      },
      include: {
        service: {
          select: {
            title: true,
            duration: true,
            price: true,
          },
        },
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    logger.info("Appointment rescheduled", {
      appointmentId,
      oldDateTime: appointment.dateTime.toISOString(),
      newDateTime: validated.newDateTime.toISOString(),
      rescheduledBy: userId,
      reason: validated.reason,
    });

    return NextResponse.json({
      success: true,
      message: "Appointment rescheduled successfully",
      data: {
        id: rescheduledAppointment.id,
        dateTime: rescheduledAppointment.dateTime.toISOString(),
        status: rescheduledAppointment.status,
        notes: rescheduledAppointment.notes,
        service: {
          title: rescheduledAppointment.service.title,
          duration: rescheduledAppointment.service.duration,
          price: rescheduledAppointment.service.price.toString(),
        },
        user: {
          name: rescheduledAppointment.user.name,
          email: rescheduledAppointment.user.email,
        },
        updatedAt: rescheduledAppointment.updatedAt.toISOString(),
      },
    });
  }
);

// DELETE /api/appointments/[id] - Cancel appointment
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
          message: "Please sign in to cancel appointments",
        },
        { status: 401 }
      );
    }

    const { id: appointmentId } = await params;
    const userId = session.user.id;
    const isAdmin = session.user.role === "ADMIN";

    // Get cancellation reason from query params or body
    const url = new URL(request.url);
    const reason = url.searchParams.get("reason") || "Cancelled by user";

    // Find the appointment
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    if (!appointment) {
      throw new NotFoundError("Appointment not found");
    }

    // Check permissions
    if (appointment.userId !== userId && !isAdmin) {
      return NextResponse.json(
        {
          error: "Forbidden",
          message: "You can only cancel your own appointments",
        },
        { status: 403 }
      );
    }

    // Can only cancel PENDING or CONFIRMED appointments
    if (!["PENDING", "CONFIRMED"].includes(appointment.status)) {
      throw new ValidationError(
        `Cannot cancel appointment with status: ${appointment.status}`
      );
    }

    // Update appointment to cancelled status
    const cancelledAppointment = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: "CANCELLED",
        cancellationReason: reason,
      },
    });

    logger.info("Appointment cancelled", {
      appointmentId,
      cancelledBy: userId,
      reason,
    });

    return NextResponse.json({
      success: true,
      message: "Appointment cancelled successfully",
      data: {
        id: cancelledAppointment.id,
        status: cancelledAppointment.status,
        cancellationReason: cancelledAppointment.cancellationReason,
        updatedAt: cancelledAppointment.updatedAt.toISOString(),
      },
    });
  }
);

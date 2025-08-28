import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { withErrorHandler } from "@/lib/api/error-handler";
import { NotFoundError, UnauthorizedError } from "@/lib/errors";
import { z } from "zod";

const updateAppointmentSchema = z.object({
  status: z
    .enum(["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"])
    .optional(),
  adminNotes: z.string().optional(),
  clientNotes: z.string().optional(),
});

export const GET = withErrorHandler(
  async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      throw new UnauthorizedError("Admin access required");
    }

    const { id } = await params;

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

    logger.info("Retrieved appointment details", {
      appointmentId: appointment.id,
      userId: appointment.user.id,
      adminId: session.user.id,
    });

    return NextResponse.json({
      success: true,
      appointment: {
        ...appointment,
        price: Number(appointment.service.price),
      },
    });
  }
);

export const PATCH = withErrorHandler(
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

    const validatedData = updateAppointmentSchema.parse(body);

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

    // Update appointment
    const updatedAppointment = await prisma.appointment.update({
      where: { id },
      data: {
        ...(validatedData.status && { status: validatedData.status }),
        ...(validatedData.adminNotes !== undefined && {
          adminNotes: validatedData.adminNotes,
        }),
        ...(validatedData.clientNotes !== undefined && {
          clientNotes: validatedData.clientNotes,
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

    logger.info("Updated appointment", {
      appointmentId: updatedAppointment.id,
      oldStatus: existingAppointment.status,
      newStatus: updatedAppointment.status,
      adminId: session.user.id,
      changes: Object.keys(validatedData),
    });

    return NextResponse.json({
      success: true,
      appointment: {
        ...updatedAppointment,
        price: Number(updatedAppointment.service.price),
      },
    });
  }
);

export const DELETE = withErrorHandler(
  async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      throw new UnauthorizedError("Admin access required");
    }

    const { id } = await params;

    // Check if appointment exists
    const existingAppointment = await prisma.appointment.findUnique({
      where: { id },
    });

    if (!existingAppointment) {
      throw new NotFoundError("Appointment");
    }

    // Delete appointment
    await prisma.appointment.delete({
      where: { id },
    });

    logger.info("Deleted appointment", {
      appointmentId: id,
      adminId: session.user.id,
    });

    return NextResponse.json({
      success: true,
      message: "Appointment deleted successfully",
    });
  }
);

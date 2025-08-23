import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { withErrorHandler } from "@/lib/api/error-handler";
import { bookAppointmentSchema } from "@/lib/validations/appointments";
import { isTimeSlotAvailable } from "@/lib/utils/time-slots";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { authOptions } from "@/lib/auth";
import { ValidationError, NotFoundError } from "@/lib/errors";

export const POST = withErrorHandler(async (request: NextRequest) => {
  // Check authentication
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized", message: "Please sign in to book appointments" },
      { status: 401 }
    );
  }

  const userId = session.user.id;
  const data = await request.json();

  // Validate request data
  const validated = bookAppointmentSchema.parse(data);

  logger.info("Processing appointment booking", {
    userId,
    serviceId: validated.serviceId,
    dateTime: validated.dateTime.toISOString(),
  });

  // Verify service exists and is active
  const service = await prisma.service.findUnique({
    where: { id: validated.serviceId, isActive: true },
    select: { id: true, title: true, duration: true, price: true },
  });

  if (!service) {
    throw new NotFoundError("Service not found or inactive");
  }

  // Check if the time slot is still available
  const availability = await isTimeSlotAvailable(
    validated.dateTime,
    validated.serviceId
  );

  if (!availability.available) {
    throw new ValidationError(
      availability.reason || "Time slot is no longer available"
    );
  }

  // Check for existing pending/confirmed appointments for this user at the same time
  const existingAppointment = await prisma.appointment.findFirst({
    where: {
      userId,
      dateTime: validated.dateTime,
      status: {
        in: ["PENDING", "CONFIRMED"],
      },
    },
  });

  if (existingAppointment) {
    throw new ValidationError("You already have an appointment at this time");
  }

  // Create the appointment
  const createData: any = {
    userId,
    serviceId: validated.serviceId,
    dateTime: validated.dateTime,
    status: "PENDING",
  };
  if (validated.notes) createData.notes = validated.notes;

  const appointment = await prisma.appointment.create({
    data: createData,
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

  logger.info("Appointment booked successfully", {
    appointmentId: appointment.id,
    userId,
    serviceId: validated.serviceId,
    dateTime: validated.dateTime.toISOString(),
  });

  // Format response
  return NextResponse.json(
    {
      success: true,
      message: "Appointment booked successfully",
      data: {
        id: appointment.id,
        dateTime: appointment.dateTime.toISOString(),
        status: appointment.status,
        notes: appointment.notes,
        service: {
          title: appointment.service.title,
          duration: appointment.service.duration,
          price: appointment.service.price.toString(),
        },
        user: {
          name: appointment.user.name,
          email: appointment.user.email,
        },
        createdAt: appointment.createdAt.toISOString(),
      },
    },
    { status: 201 }
  );
});

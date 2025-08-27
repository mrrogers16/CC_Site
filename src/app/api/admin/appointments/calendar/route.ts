import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { withErrorHandler } from "@/lib/api/error-handler";

export const GET = withErrorHandler(async (_request: NextRequest) => {
  const session = await getServerSession(authOptions);

  if (!session || session.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get all appointments for calendar view
  const appointments = await prisma.appointment.findMany({
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
      service: {
        select: {
          title: true,
          duration: true,
        },
      },
    },
    orderBy: {
      dateTime: "asc",
    },
  });

  // Group appointments by date
  const appointmentsByDate: Record<string, unknown[]> = {};

  appointments.forEach(appointment => {
    const date = appointment.dateTime.toISOString().split("T")[0];

    if (!appointmentsByDate[date]) {
      appointmentsByDate[date] = [];
    }

    appointmentsByDate[date]!.push({
      id: appointment.id,
      dateTime: appointment.dateTime.toISOString(),
      status: appointment.status,
      service: appointment.service,
      user: appointment.user,
    });
  });

  return NextResponse.json({ success: true, appointments: appointmentsByDate });
});

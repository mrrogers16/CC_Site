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

  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Get total clients (excluding admins)
  const totalClients = await prisma.user.count({
    where: {
      role: "CLIENT",
    },
  });

  // Get appointments today
  const appointmentsToday = await prisma.appointment.count({
    where: {
      dateTime: {
        gte: startOfToday,
        lt: new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000),
      },
    },
  });

  // Get pending appointments
  const pendingAppointments = await prisma.appointment.count({
    where: {
      status: "PENDING",
    },
  });

  // Get unread messages
  const unreadMessages = await prisma.contactSubmission.count({
    where: {
      isRead: false,
    },
  });

  // Get this month's revenue from completed appointments
  const completedAppointmentsThisMonth = await prisma.appointment.findMany({
    where: {
      status: "COMPLETED",
      dateTime: {
        gte: startOfMonth,
        lt: new Date(now.getFullYear(), now.getMonth() + 1, 1),
      },
    },
    include: {
      service: true,
    },
  });

  const thisMonthRevenue = completedAppointmentsThisMonth.reduce(
    (total, appointment) => total + Number(appointment.service.price),
    0
  );

  // Get completed appointments count
  const completedAppointments = await prisma.appointment.count({
    where: {
      status: "COMPLETED",
    },
  });

  const metrics = {
    totalClients,
    appointmentsToday,
    pendingAppointments,
    unreadMessages,
    thisMonthRevenue: Math.round(thisMonthRevenue),
    completedAppointments,
  };

  return NextResponse.json({ success: true, metrics });
});

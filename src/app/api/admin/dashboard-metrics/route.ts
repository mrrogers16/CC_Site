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
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  try {
    // Existing metrics (keeping backwards compatibility)
    const totalClients = await prisma.user.count({
      where: { role: "CLIENT" },
    });

    const appointmentsToday = await prisma.appointment.count({
      where: {
        dateTime: {
          gte: startOfToday,
          lt: new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000),
        },
      },
    });

    const pendingAppointments = await prisma.appointment.count({
      where: { status: "PENDING" },
    });

    const unreadMessages = await prisma.contactSubmission.count({
      where: { isRead: false },
    });

    const completedAppointments = await prisma.appointment.count({
      where: { status: "COMPLETED" },
    });

    // Enhanced metrics for new widgets

    // 1. This Month's Revenue (with percentage change)
    const thisMonthCompleted = await prisma.appointment.findMany({
      where: {
        status: "COMPLETED",
        dateTime: {
          gte: startOfMonth,
          lt: new Date(now.getFullYear(), now.getMonth() + 1, 1),
        },
      },
      include: { service: true },
    });

    const lastMonthCompleted = await prisma.appointment.findMany({
      where: {
        status: "COMPLETED",
        dateTime: {
          gte: startOfLastMonth,
          lte: endOfLastMonth,
        },
      },
      include: { service: true },
    });

    const thisMonthRevenue = thisMonthCompleted.reduce(
      (total, apt) => total + Number(apt.service.price),
      0
    );

    const lastMonthRevenue = lastMonthCompleted.reduce(
      (total, apt) => total + Number(apt.service.price),
      0
    );

    const revenueChange =
      lastMonthRevenue > 0
        ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
        : thisMonthRevenue > 0
          ? 100
          : 0;

    // 2. Appointment Utilization (this week)
    const thisWeekAppointments = await prisma.appointment.count({
      where: {
        dateTime: {
          gte: startOfWeek,
          lte: now,
        },
      },
    });

    // Assuming 8-hour days, 5 days per week, 1-hour slots
    const daysInWeek = Math.min(
      7,
      Math.ceil((now.getTime() - startOfWeek.getTime()) / (1000 * 60 * 60 * 24))
    );
    const workDaysThisWeek = Math.min(5, daysInWeek);
    const availableSlots = workDaysThisWeek * 8;
    const utilizationRate =
      availableSlots > 0 ? (thisWeekAppointments / availableSlots) * 100 : 0;

    // 3. New vs Returning Clients (this month)
    const thisMonthAppointments = await prisma.appointment.findMany({
      where: {
        dateTime: {
          gte: startOfMonth,
          lt: new Date(now.getFullYear(), now.getMonth() + 1, 1),
        },
      },
      include: {
        user: {
          include: {
            appointments: {
              orderBy: { dateTime: "asc" },
              take: 1,
            },
          },
        },
      },
    });

    const newClientsThisMonth = thisMonthAppointments.filter(apt => {
      const firstAppointment = apt.user.appointments[0];
      return firstAppointment && firstAppointment.dateTime >= startOfMonth;
    }).length;

    const returningClientsThisMonth = thisMonthAppointments.filter(apt => {
      const firstAppointment = apt.user.appointments[0];
      return firstAppointment && firstAppointment.dateTime < startOfMonth;
    }).length;

    const clientRatio =
      returningClientsThisMonth > 0
        ? (newClientsThisMonth / returningClientsThisMonth) * 100
        : newClientsThisMonth > 0
          ? 100
          : 0;

    const metrics = {
      // Existing metrics
      totalClients,
      appointmentsToday,
      pendingAppointments,
      unreadMessages,
      thisMonthRevenue: Math.round(thisMonthRevenue),
      completedAppointments,

      // New analytics metrics
      revenueChange: Math.round(revenueChange * 100) / 100,
      lastMonthRevenue: Math.round(lastMonthRevenue),
      utilizationRate: Math.round(utilizationRate * 100) / 100,
      availableSlots,
      bookedSlotsThisWeek: thisWeekAppointments,
      newClientsThisMonth,
      returningClientsThisMonth,
      clientRatio: Math.round(clientRatio * 100) / 100,
    };

    return NextResponse.json({ success: true, metrics });
  } catch (error) {
    console.error("Dashboard metrics error:", error);
    return NextResponse.json(
      { error: "Failed to calculate metrics" },
      { status: 500 }
    );
  }
});

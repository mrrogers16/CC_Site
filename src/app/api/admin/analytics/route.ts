import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { withErrorHandler } from "@/lib/api/error-handler";
import { z } from "zod";

const analyticsQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  period: z.enum(["week", "month", "quarter", "year"]).optional(),
});

export const GET = withErrorHandler(async (request: NextRequest) => {
  const session = await getServerSession(authOptions);

  if (!session || session.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const queryParams = {
    startDate: searchParams.get("startDate"),
    endDate: searchParams.get("endDate"),
    period: searchParams.get("period"),
  };

  const validatedParams = analyticsQuerySchema.parse(queryParams);

  // Default to current month if no date range provided
  const now = new Date();
  const defaultStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const defaultEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const startDate = validatedParams.startDate
    ? new Date(validatedParams.startDate)
    : defaultStartDate;
  const endDate = validatedParams.endDate
    ? new Date(validatedParams.endDate)
    : defaultEndDate;

  // Ensure end date is end of day
  endDate.setHours(23, 59, 59, 999);

  try {
    // Revenue Analytics
    const revenueData = await calculateRevenueAnalytics(startDate, endDate);

    // Appointment Analytics
    const appointmentData = await calculateAppointmentAnalytics(
      startDate,
      endDate
    );

    // Client Analytics
    const clientData = await calculateClientAnalytics(startDate, endDate);

    // Service Analytics
    const serviceData = await calculateServiceAnalytics(startDate, endDate);

    // Dashboard-specific metrics (for enhanced widgets)
    const dashboardMetrics = await calculateDashboardMetrics();

    return NextResponse.json({
      success: true,
      analytics: {
        dateRange: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        revenue: revenueData,
        appointments: appointmentData,
        clients: clientData,
        services: serviceData,
        dashboard: dashboardMetrics,
      },
    });
  } catch (error) {
    console.error("Analytics calculation error:", error);
    return NextResponse.json(
      { error: "Failed to calculate analytics" },
      { status: 500 }
    );
  }
});

async function calculateRevenueAnalytics(startDate: Date, endDate: Date) {
  // Current period revenue
  const currentRevenue = await prisma.appointment.findMany({
    where: {
      status: "COMPLETED",
      dateTime: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      service: true,
    },
  });

  const currentTotal = currentRevenue.reduce(
    (total, apt) => total + Number(apt.service.price),
    0
  );

  // Previous period for comparison
  const periodLength = endDate.getTime() - startDate.getTime();
  const prevStartDate = new Date(startDate.getTime() - periodLength);
  const prevEndDate = new Date(startDate.getTime() - 1);

  const previousRevenue = await prisma.appointment.findMany({
    where: {
      status: "COMPLETED",
      dateTime: {
        gte: prevStartDate,
        lte: prevEndDate,
      },
    },
    include: {
      service: true,
    },
  });

  const previousTotal = previousRevenue.reduce(
    (total, apt) => total + Number(apt.service.price),
    0
  );

  const percentageChange =
    previousTotal > 0
      ? ((currentTotal - previousTotal) / previousTotal) * 100
      : currentTotal > 0
        ? 100
        : 0;

  // Average session value
  const avgSessionValue =
    currentRevenue.length > 0 ? currentTotal / currentRevenue.length : 0;

  return {
    currentTotal: Math.round(currentTotal),
    previousTotal: Math.round(previousTotal),
    percentageChange: Math.round(percentageChange * 100) / 100,
    avgSessionValue: Math.round(avgSessionValue),
    totalSessions: currentRevenue.length,
  };
}

async function calculateAppointmentAnalytics(startDate: Date, endDate: Date) {
  // All appointments in period
  const appointments = await prisma.appointment.findMany({
    where: {
      dateTime: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  // Calculate utilization (assuming 8 hours per day, 5 days per week)
  const workDays =
    Math.floor(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    ) *
    (5 / 7);
  const availableSlots = workDays * 8; // 8 hour-long slots per day
  const bookedSlots = appointments.length;
  const utilizationRate =
    availableSlots > 0 ? (bookedSlots / availableSlots) * 100 : 0;

  // Status breakdown
  const statusCounts = {
    completed: appointments.filter(apt => apt.status === "COMPLETED").length,
    cancelled: appointments.filter(apt => apt.status === "CANCELLED").length,
    pending: appointments.filter(apt => apt.status === "PENDING").length,
    confirmed: appointments.filter(apt => apt.status === "CONFIRMED").length,
    noShow: appointments.filter(apt => apt.status === "NO_SHOW").length,
  };

  // Cancellation rate
  const cancellationRate =
    appointments.length > 0
      ? ((statusCounts.cancelled + statusCounts.noShow) / appointments.length) *
        100
      : 0;

  return {
    totalAppointments: appointments.length,
    utilizationRate: Math.round(utilizationRate * 100) / 100,
    cancellationRate: Math.round(cancellationRate * 100) / 100,
    statusBreakdown: statusCounts,
    availableSlots: Math.round(availableSlots),
    bookedSlots,
  };
}

async function calculateClientAnalytics(startDate: Date, endDate: Date) {
  // New clients (first appointment in this period)
  const newClientAppointments = await prisma.appointment.findMany({
    where: {
      dateTime: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      user: {
        include: {
          appointments: {
            orderBy: {
              dateTime: "asc",
            },
            take: 1,
          },
        },
      },
    },
  });

  const newClients = newClientAppointments.filter(apt => {
    const firstAppointment = apt.user.appointments[0];
    return firstAppointment && firstAppointment.dateTime >= startDate;
  });

  // Returning clients
  const returningClients = newClientAppointments.filter(apt => {
    const firstAppointment = apt.user.appointments[0];
    return firstAppointment && firstAppointment.dateTime < startDate;
  });

  // Unique clients this period
  const uniqueClientIds = new Set(newClientAppointments.map(apt => apt.userId));

  // Average sessions per client
  const avgSessionsPerClient =
    uniqueClientIds.size > 0
      ? newClientAppointments.length / uniqueClientIds.size
      : 0;

  return {
    newClients: newClients.length,
    returningClients: returningClients.length,
    totalUniqueClients: uniqueClientIds.size,
    newVsReturningRatio:
      returningClients.length > 0
        ? Math.round((newClients.length / returningClients.length) * 100) / 100
        : newClients.length > 0
          ? Infinity
          : 0,
    avgSessionsPerClient: Math.round(avgSessionsPerClient * 100) / 100,
  };
}

async function calculateServiceAnalytics(startDate: Date, endDate: Date) {
  const serviceAppointments = await prisma.appointment.findMany({
    where: {
      dateTime: {
        gte: startDate,
        lte: endDate,
      },
      status: {
        not: "CANCELLED",
      },
    },
    include: {
      service: true,
    },
  });

  // Group by service
  const serviceStats = serviceAppointments.reduce(
    (acc, apt) => {
      const serviceId = apt.service.id;
      if (!acc[serviceId]) {
        acc[serviceId] = {
          id: serviceId,
          title: apt.service.title,
          bookingCount: 0,
          revenue: 0,
          avgDuration: apt.service.duration,
        };
      }
      acc[serviceId].bookingCount++;
      acc[serviceId].revenue += Number(apt.service.price);
      return acc;
    },
    {} as Record<string, any>
  );

  const serviceArray = Object.values(serviceStats).sort(
    (a: any, b: any) => b.bookingCount - a.bookingCount
  );

  return {
    totalServices: serviceArray.length,
    mostPopularService: serviceArray[0] || null,
    serviceBreakdown: serviceArray,
    totalServiceRevenue: serviceArray.reduce(
      (total, service: any) => total + service.revenue,
      0
    ),
  };
}

async function calculateDashboardMetrics() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));

  // This month's revenue with percentage change
  const thisMonthRevenue = await calculateRevenueAnalytics(
    startOfMonth,
    new Date()
  );

  // This week's utilization
  const thisWeekUtilization = await calculateAppointmentAnalytics(
    startOfWeek,
    new Date()
  );

  // This month's client metrics
  const thisMonthClients = await calculateClientAnalytics(
    startOfMonth,
    new Date()
  );

  return {
    revenueChange: {
      current: thisMonthRevenue.currentTotal,
      percentageChange: thisMonthRevenue.percentageChange,
    },
    utilizationRate: thisWeekUtilization.utilizationRate,
    clientRatio: {
      newClients: thisMonthClients.newClients,
      returningClients: thisMonthClients.returningClients,
      ratio: thisMonthClients.newVsReturningRatio,
    },
  };
}

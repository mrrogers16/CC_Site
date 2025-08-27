import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { withErrorHandler } from "@/lib/api/error-handler";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { authOptions } from "@/lib/auth";

export const GET = withErrorHandler(async (request: NextRequest) => {
  // Check authentication
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized", message: "Please sign in to view appointments" },
      { status: 401 }
    );
  }

  const userId = session.user.id;
  const url = new URL(request.url);

  // Parse query parameters
  const upcoming = url.searchParams.get("upcoming") === "true";
  const status = url.searchParams.get("status");
  const serviceId = url.searchParams.get("serviceId");
  const dateRange = url.searchParams.get("dateRange");
  const search = url.searchParams.get("search");
  const limit = url.searchParams.get("limit")
    ? parseInt(url.searchParams.get("limit")!) || undefined
    : undefined;
  const page = url.searchParams.get("page")
    ? parseInt(url.searchParams.get("page")!) || 1
    : 1;
  const pageSize = 10;

  logger.info("Fetching appointments", {
    userId,
    upcoming,
    status,
    serviceId,
    dateRange,
    search,
    limit,
    page,
  });

  try {
    // Build where clause
    const now = new Date();
    const whereClause: any = {
      userId,
    };

    // Handle appointment timing (upcoming vs history)
    if (upcoming) {
      whereClause.dateTime = { gte: now };
      whereClause.status = { in: ["PENDING", "CONFIRMED"] };
    } else {
      // For history, get past appointments with any status
      whereClause.dateTime = { lt: now };
    }

    // Filter by specific status if provided
    if (status && status !== "all") {
      whereClause.status = status;
    }

    // Filter by service if provided
    if (serviceId && serviceId !== "all") {
      whereClause.serviceId = serviceId;
    }

    // Handle date range filtering for history
    if (dateRange && dateRange !== "all" && !upcoming) {
      const now = new Date();
      let startDate: Date;

      switch (dateRange) {
        case "last_month":
          startDate = new Date(
            now.getFullYear(),
            now.getMonth() - 1,
            now.getDate()
          );
          break;
        case "last_3_months":
          startDate = new Date(
            now.getFullYear(),
            now.getMonth() - 3,
            now.getDate()
          );
          break;
        case "last_6_months":
          startDate = new Date(
            now.getFullYear(),
            now.getMonth() - 6,
            now.getDate()
          );
          break;
        case "last_year":
          startDate = new Date(
            now.getFullYear() - 1,
            now.getMonth(),
            now.getDate()
          );
          break;
        default:
          startDate = new Date(0); // Beginning of time
      }

      whereClause.dateTime = {
        lt: now,
        gte: startDate,
      };
    }

    // Handle search functionality (simplified for now)
    if (search) {
      whereClause.notes = { contains: search, mode: "insensitive" };
    }

    // Get appointments with pagination
    const skip = limit ? 0 : (page - 1) * pageSize;
    const take = limit || pageSize;

    const [appointments, totalCount] = await Promise.all([
      prisma.appointment.findMany({
        where: whereClause,
        include: {
          service: {
            select: {
              title: true,
              duration: true,
              price: true,
            },
          },
        },
        orderBy: {
          dateTime: upcoming ? "asc" : "desc",
        },
        skip,
        take,
      }),
      prisma.appointment.count({
        where: whereClause,
      }),
    ]);

    // Format response data
    const formattedAppointments = appointments.map(appointment => ({
      id: appointment.id,
      dateTime: appointment.dateTime.toISOString(),
      status: appointment.status,
      notes: appointment.notes,
      service: {
        title: appointment.service?.title || "Unknown Service",
        duration: appointment.service?.duration || 0,
        price: appointment.service?.price?.toString() || "0",
      },
      createdAt: appointment.createdAt.toISOString(),
      updatedAt: appointment.updatedAt.toISOString(),
    }));

    // Calculate pagination info (if not using limit)
    const pagination = limit
      ? undefined
      : {
          page,
          limit: pageSize,
          total: totalCount,
          totalPages: Math.ceil(totalCount / pageSize),
          hasNext: page * pageSize < totalCount,
          hasPrev: page > 1,
        };

    logger.info("Appointments fetched successfully", {
      userId,
      count: appointments.length,
      totalCount,
    });

    return NextResponse.json({
      success: true,
      data: {
        appointments: formattedAppointments,
        ...(pagination && { pagination }),
      },
    });
  } catch (error) {
    logger.error(
      "Error fetching appointments",
      error instanceof Error ? error : new Error(String(error))
    );
    throw error;
  }
});

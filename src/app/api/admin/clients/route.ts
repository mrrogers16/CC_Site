import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { withErrorHandler } from "@/lib/api/error-handler";
import { logger } from "@/lib/logger";
import { AppError, ValidationError } from "@/lib/errors";

export const GET = withErrorHandler(async (request: NextRequest) => {
  const session = await getServerSession(authOptions);
  
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new AppError("Unauthorized access", 401);
  }

  const { searchParams } = new URL(request.url);
  
  // Parse query parameters
  const search = searchParams.get("search") || "";
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "10")));
  const sortBy = searchParams.get("sortBy") || "createdAt";
  const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const status = searchParams.get("status"); // active, inactive, new
  
  // Validate sort field
  const allowedSortFields = ["createdAt", "name", "email", "lastAppointment", "appointmentCount"];
  if (!allowedSortFields.includes(sortBy)) {
    throw new ValidationError("Invalid sort field");
  }

  // Build where clause for search and filters
  const where: any = {
    role: "CLIENT",
  };

  // Search functionality
  if (search.trim()) {
    where.OR = [
      {
        name: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        email: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        phone: {
          contains: search,
          mode: "insensitive",
        },
      },
    ];
  }

  // Date range filter
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) {
      where.createdAt.gte = new Date(dateFrom);
    }
    if (dateTo) {
      where.createdAt.lte = new Date(dateTo);
    }
  }

  // Calculate offset
  const offset = (page - 1) * limit;

  try {
    // Get total count
    const total = await prisma.user.count({ where });

    // Get clients with appointment and contact submission counts
    let clients = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
        _count: {
          select: {
            appointments: {
              where: {
                status: {
                  not: "CANCELLED",
                },
              },
            },
            contactSubmissions: true,
          },
        },
        appointments: {
          where: {
            status: {
              not: "CANCELLED",
            },
          },
          select: {
            dateTime: true,
          },
          orderBy: {
            dateTime: "desc",
          },
          take: 1,
        },
      },
      skip: offset,
      take: limit,
      orderBy: sortBy === "lastAppointment" 
        ? { appointments: { _count: "desc" } }
        : sortBy === "appointmentCount"
        ? { appointments: { _count: sortOrder as any } }
        : { [sortBy]: sortOrder },
    });

    // Apply status filter after fetching (for complex logic)
    if (status) {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      
      clients = clients.filter(client => {
        const appointmentCount = client._count.appointments;
        const lastAppointment = client.appointments[0]?.dateTime;
        const isNewClient = new Date(client.createdAt) > thirtyDaysAgo;
        
        switch (status) {
          case "active":
            return appointmentCount > 0 && (!lastAppointment || new Date(lastAppointment) > thirtyDaysAgo);
          case "inactive":
            return appointmentCount === 0 || (lastAppointment && new Date(lastAppointment) <= thirtyDaysAgo);
          case "new":
            return isNewClient;
          default:
            return true;
        }
      });
    }

    // Transform data for response
    const transformedClients = clients.map(client => ({
      id: client.id,
      name: client.name,
      email: client.email,
      phone: client.phone,
      createdAt: client.createdAt,
      appointmentCount: client._count.appointments,
      lastAppointment: client.appointments[0]?.dateTime || null,
      contactSubmissions: client._count.contactSubmissions,
    }));

    // Calculate pagination
    const totalPages = Math.ceil(total / limit);
    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    logger.info("Admin accessed client list", {
      adminId: session.user.id,
      page,
      limit,
      search: search || undefined,
      total,
      sortBy,
      sortOrder,
    });

    return NextResponse.json({
      success: true,
      data: {
        clients: transformedClients,
        pagination: {
          page,
          totalPages,
          total,
          hasNext,
          hasPrev,
          limit,
        },
      },
    });
  } catch (error) {
    logger.error("Failed to fetch client list", error instanceof Error ? error : new Error("Unknown error"));
    throw error;
  }
});

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { withErrorHandler } from "@/lib/api/error-handler";
import { availabilitySchema } from "@/lib/validations/appointments";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { authOptions } from "@/lib/auth";
import { ValidationError } from "@/lib/errors";

// GET /api/availability - Get all availability windows
export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const dayOfWeek = searchParams.get("dayOfWeek");
  const isActiveOnly = searchParams.get("activeOnly") === "true";

  // Build where clause
  const where: any = {};
  if (dayOfWeek !== null) {
    const day = parseInt(dayOfWeek);
    if (!isNaN(day) && day >= 0 && day <= 6) {
      where.dayOfWeek = day;
    }
  }
  if (isActiveOnly) {
    where.isActive = true;
  }

  const availability = await prisma.availability.findMany({
    where,
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });

  // Group by day of week for easier consumption
  const groupedAvailability = availability.reduce(
    (acc, window) => {
      const dayNames = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];
      
      // Ensure dayOfWeek is within valid range (0-6)
      const dayName = dayNames[window.dayOfWeek];
      if (!dayName) {
        logger.warn(`Invalid dayOfWeek value: ${window.dayOfWeek} for availability window ${window.id}`);
        return acc;
      }

      if (!acc[dayName]) {
        acc[dayName] = [];
      }

      acc[dayName].push({
        id: window.id,
        startTime: window.startTime,
        endTime: window.endTime,
        isActive: window.isActive,
        createdAt: window.createdAt.toISOString(),
        updatedAt: window.updatedAt.toISOString(),
      });

      return acc;
    },
    {} as Record<string, any[]>
  );

  logger.info("Availability windows retrieved", {
    totalWindows: availability.length,
    dayOfWeekFilter: dayOfWeek,
    activeOnly: isActiveOnly,
  });

  return NextResponse.json({
    success: true,
    data: {
      windows: availability.map(window => ({
        id: window.id,
        dayOfWeek: window.dayOfWeek,
        dayName: [
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ][window.dayOfWeek],
        startTime: window.startTime,
        endTime: window.endTime,
        isActive: window.isActive,
        createdAt: window.createdAt.toISOString(),
        updatedAt: window.updatedAt.toISOString(),
      })),
      grouped: groupedAvailability,
      total: availability.length,
    },
  });
});

// POST /api/availability - Create new availability window (admin only)
export const POST = withErrorHandler(async (request: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      {
        error: "Unauthorized",
        message: "Please sign in to manage availability",
      },
      { status: 401 }
    );
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Forbidden", message: "Admin access required" },
      { status: 403 }
    );
  }

  const data = await request.json();

  // Validate request data
  const validated = availabilitySchema.parse(data);

  // Check for overlapping windows on the same day
  const overlappingWindows = await prisma.availability.findMany({
    where: {
      dayOfWeek: validated.dayOfWeek,
      isActive: true,
      OR: [
        // New window starts within existing window
        {
          startTime: { lte: validated.startTime },
          endTime: { gt: validated.startTime },
        },
        // New window ends within existing window
        {
          startTime: { lt: validated.endTime },
          endTime: { gte: validated.endTime },
        },
        // New window completely contains existing window
        {
          startTime: { gte: validated.startTime },
          endTime: { lte: validated.endTime },
        },
      ],
    },
  });

  if (overlappingWindows.length > 0) {
    throw new ValidationError(
      "New availability window overlaps with existing active window"
    );
  }

  // Create the availability window
  const availability = await prisma.availability.create({
    data: validated,
  });

  const dayName = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ][availability.dayOfWeek];

  logger.info("Availability window created", {
    availabilityId: availability.id,
    dayOfWeek: availability.dayOfWeek,
    dayName,
    startTime: availability.startTime,
    endTime: availability.endTime,
    createdBy: session.user.id,
  });

  return NextResponse.json(
    {
      success: true,
      message: "Availability window created successfully",
      data: {
        id: availability.id,
        dayOfWeek: availability.dayOfWeek,
        dayName,
        startTime: availability.startTime,
        endTime: availability.endTime,
        isActive: availability.isActive,
        createdAt: availability.createdAt.toISOString(),
        updatedAt: availability.updatedAt.toISOString(),
      },
    },
    { status: 201 }
  );
});

// PUT /api/availability - Bulk update availability (admin only)
export const PUT = withErrorHandler(async (request: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      {
        error: "Unauthorized",
        message: "Please sign in to manage availability",
      },
      { status: 401 }
    );
  }

  if (session.user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Forbidden", message: "Admin access required" },
      { status: 403 }
    );
  }

  const data = await request.json();

  if (!Array.isArray(data.windows)) {
    throw new ValidationError("Windows array is required for bulk update");
  }

  const validatedWindows = data.windows.map((window: any) => {
    if (window.id) {
      // Updating existing window - validate against update schema
      return {
        id: window.id,
        ...availabilitySchema.partial().parse(window),
      };
    } else {
      // Creating new window
      return availabilitySchema.parse(window);
    }
  });

  // Process updates and creates in a transaction
  const result = await prisma.$transaction(async tx => {
    const updated: any[] = [];
    const created: any[] = [];

    for (const window of validatedWindows) {
      if (window.id) {
        // Update existing window
        const updatedWindow = await tx.availability.update({
          where: { id: window.id },
          data: {
            dayOfWeek: window.dayOfWeek,
            startTime: window.startTime,
            endTime: window.endTime,
            isActive: window.isActive,
          },
        });
        updated.push(updatedWindow);
      } else {
        // Create new window
        const createdWindow = await tx.availability.create({
          data: window,
        });
        created.push(createdWindow);
      }
    }

    return { updated, created };
  });

  logger.info("Bulk availability update completed", {
    updatedCount: result.updated.length,
    createdCount: result.created.length,
    updatedBy: session.user.id,
  });

  return NextResponse.json({
    success: true,
    message: `Updated ${result.updated.length} and created ${result.created.length} availability windows`,
    data: {
      updated: result.updated.map(window => ({
        id: window.id,
        dayOfWeek: window.dayOfWeek,
        dayName: [
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ][window.dayOfWeek],
        startTime: window.startTime,
        endTime: window.endTime,
        isActive: window.isActive,
        updatedAt: window.updatedAt.toISOString(),
      })),
      created: result.created.map(window => ({
        id: window.id,
        dayOfWeek: window.dayOfWeek,
        dayName: [
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ][window.dayOfWeek],
        startTime: window.startTime,
        endTime: window.endTime,
        isActive: window.isActive,
        createdAt: window.createdAt.toISOString(),
      })),
    },
  });
});

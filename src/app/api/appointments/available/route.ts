import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api/error-handler";
import { availableSlotsQuerySchema } from "@/lib/validations/appointments";
import { getAvailableSlots } from "@/lib/utils/time-slots";
import { logger } from "@/lib/logger";
import { ValidationError } from "@/lib/errors";

export const GET = withErrorHandler(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);

  // Extract and validate query parameters
  const rawDate = searchParams.get("date");
  const serviceId = searchParams.get("serviceId") || undefined;

  if (!rawDate) {
    throw new ValidationError("Date parameter is required");
  }

  // Validate query parameters
  const queryData = availableSlotsQuerySchema.parse({
    date: rawDate,
    serviceId,
  });

  logger.info("Fetching available appointment slots", {
    date: queryData.date.toISOString().split("T")[0],
    serviceId: queryData.serviceId,
  });

  // Get available time slots
  const availableSlots = await getAvailableSlots(
    queryData.date,
    queryData.serviceId
  );

  // Format response
  const formattedSlots = availableSlots.map(dateTime => ({
    dateTime: dateTime.toISOString(),
    displayTime: dateTime.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "UTC",
    }),
  }));

  logger.info("Available slots retrieved", {
    date: queryData.date.toISOString().split("T")[0],
    totalSlots: formattedSlots.length,
    serviceId: queryData.serviceId,
  });

  return NextResponse.json({
    success: true,
    data: {
      date: queryData.date.toISOString().split("T")[0],
      serviceId: queryData.serviceId,
      slots: formattedSlots,
      totalAvailable: formattedSlots.length,
    },
  });
});

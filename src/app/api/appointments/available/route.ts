import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api/error-handler";
import { availableSlotsQuerySchema } from "@/lib/validations/appointments";
import { generateTimeSlots } from "@/lib/utils/time-slots";
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

  // Get all time slots with availability status
  const allTimeSlots = await generateTimeSlots(
    queryData.date,
    queryData.serviceId
  );

  // Format response with availability status
  const formattedSlots = allTimeSlots.map(slot => ({
    dateTime: slot.dateTime.toISOString(),
    available: slot.available,
    ...(slot.reason && { reason: slot.reason }),
    displayTime: slot.dateTime.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "UTC",
    }),
  }));

  const availableCount = formattedSlots.filter(slot => slot.available).length;

  logger.info("Time slots retrieved with availability status", {
    date: queryData.date.toISOString().split("T")[0],
    totalSlots: formattedSlots.length,
    availableSlots: availableCount,
    serviceId: queryData.serviceId,
  });

  return NextResponse.json({
    success: true,
    slots: formattedSlots,
    totalSlots: formattedSlots.length,
    availableSlots: availableCount,
    date: queryData.date.toISOString().split("T")[0],
    serviceId: queryData.serviceId,
  });
});

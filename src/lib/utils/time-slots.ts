import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { BUSINESS_RULES } from "@/lib/validations/appointments";

export interface TimeSlot {
  dateTime: Date;
  available: boolean;
  reason?: string;
}

export interface AvailabilityWindow {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

/**
 * Converts time string "HH:MM" to minutes since midnight
 */
function timeStringToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(":").map(Number);
  if (hours === undefined || minutes === undefined) {
    throw new Error(`Invalid time format: ${timeStr}`);
  }
  return hours * 60 + minutes;
}

/**
 * Converts minutes since midnight to time string "HH:MM"
 */
function _minutesToTimeString(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

/**
 * Checks if a date/time falls within business availability hours
 */
function isWithinAvailability(
  dateTime: Date,
  availability: AvailabilityWindow[]
): boolean {
  const dayOfWeek = dateTime.getDay();
  const timeInMinutes = dateTime.getHours() * 60 + dateTime.getMinutes();

  return availability.some(window => {
    if (window.dayOfWeek !== dayOfWeek) return false;

    const startMinutes = timeStringToMinutes(window.startTime);
    const endMinutes = timeStringToMinutes(window.endTime);

    return timeInMinutes >= startMinutes && timeInMinutes < endMinutes;
  });
}

/**
 * Checks if a time slot conflicts with existing appointments
 */
function hasAppointmentConflict(
  dateTime: Date,
  serviceDuration: number,
  existingAppointments: Array<{ dateTime: Date; duration: number }>
): boolean {
  const slotStart = dateTime.getTime();
  const slotEnd = slotStart + serviceDuration * 60 * 1000;

  return existingAppointments.some(appointment => {
    const appointmentStart = appointment.dateTime.getTime();
    const appointmentEnd = appointmentStart + appointment.duration * 60 * 1000;

    // Add buffer time around existing appointments
    const bufferMs = BUSINESS_RULES.BUFFER_MINUTES * 60 * 1000;
    const bufferedStart = appointmentStart - bufferMs;
    const bufferedEnd = appointmentEnd + bufferMs;

    // Check if slots overlap (including buffer)
    return !(slotEnd <= bufferedStart || slotStart >= bufferedEnd);
  });
}

/**
 * Checks if a time slot is blocked by admin-defined blocked slots
 */
function hasBlockedSlotConflict(
  dateTime: Date,
  serviceDuration: number,
  blockedSlots: Array<{ dateTime: Date; duration: number }>
): boolean {
  const slotStart = dateTime.getTime();
  const slotEnd = slotStart + serviceDuration * 60 * 1000;

  return blockedSlots.some(blocked => {
    const blockedStart = blocked.dateTime.getTime();
    const blockedEnd = blockedStart + blocked.duration * 60 * 1000;

    // Check if slots overlap
    return !(slotEnd <= blockedStart || slotStart >= blockedEnd);
  });
}

/**
 * Generate all possible time slots for a given date
 */
export async function generateTimeSlots(
  targetDate: Date,
  serviceId?: string
): Promise<TimeSlot[]> {
  try {
    logger.info("Generating time slots", {
      date: targetDate.toISOString().split("T")[0],
      serviceId,
    });

    // Get service information if provided
    let serviceDuration = 60; // Default 1 hour
    if (serviceId) {
      const service = await prisma.service.findUnique({
        where: { id: serviceId, isActive: true },
        select: { duration: true },
      });

      if (!service) {
        throw new Error("Service not found or inactive");
      }

      serviceDuration = service.duration;
    }

    // Get availability windows for the target date's day of week
    const dayOfWeek = targetDate.getDay();
    const availability = await prisma.availability.findMany({
      where: {
        dayOfWeek,
        isActive: true,
      },
      select: {
        dayOfWeek: true,
        startTime: true,
        endTime: true,
      },
    });

    if (availability.length === 0) {
      logger.info("No availability found for day", { dayOfWeek });
      return [];
    }

    // Get existing appointments for the target date
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existingAppointments = await prisma.appointment.findMany({
      where: {
        dateTime: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: {
          in: ["PENDING", "CONFIRMED"],
        },
      },
      include: {
        service: {
          select: { duration: true },
        },
      },
    });

    // Get blocked slots for the target date
    const blockedSlots = await prisma.blockedSlot.findMany({
      where: {
        dateTime: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      select: {
        dateTime: true,
        duration: true,
      },
    });

    // Generate time slots
    const slots: TimeSlot[] = [];
    const slotInterval = 15; // Generate slots every 15 minutes

    // For each availability window
    for (const window of availability) {
      const startMinutes = timeStringToMinutes(window.startTime);
      const endMinutes = timeStringToMinutes(window.endTime);

      // Generate slots within this window
      for (
        let minutes = startMinutes;
        minutes < endMinutes;
        minutes += slotInterval
      ) {
        const slotDateTime = new Date(targetDate);
        slotDateTime.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);

        // Skip if slot + service duration would exceed availability window
        const slotEndMinutes = minutes + serviceDuration;
        if (slotEndMinutes > endMinutes) {
          continue;
        }

        // Check availability
        let available = true;
        let reason: string | undefined;

        // Check if within availability (should be true, but double-check)
        if (!isWithinAvailability(slotDateTime, availability)) {
          available = false;
          reason = "Outside business hours";
        }

        // Check for appointment conflicts
        if (
          available &&
          hasAppointmentConflict(
            slotDateTime,
            serviceDuration,
            existingAppointments.map(apt => ({
              dateTime: apt.dateTime,
              duration: apt.service.duration,
            }))
          )
        ) {
          available = false;
          reason = "Time slot unavailable";
        }

        // Check for blocked slots
        if (
          available &&
          hasBlockedSlotConflict(slotDateTime, serviceDuration, blockedSlots)
        ) {
          available = false;
          reason = "Time slot blocked";
        }

        // Check minimum advance booking requirement
        if (available) {
          const now = new Date();
          const minAdvanceTime = new Date(
            now.getTime() + BUSINESS_RULES.MIN_ADVANCE_HOURS * 60 * 60 * 1000
          );

          if (slotDateTime < minAdvanceTime) {
            available = false;
            reason = "Insufficient advance notice";
          }
        }

        slots.push({
          dateTime: slotDateTime,
          available,
          ...(reason && { reason }),
        });
      }
    }

    // Sort slots by time
    slots.sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());

    logger.info("Generated time slots", {
      date: targetDate.toISOString().split("T")[0],
      totalSlots: slots.length,
      availableSlots: slots.filter(s => s.available).length,
    });

    return slots;
  } catch (error) {
    logger.error(
      "Failed to generate time slots",
      error instanceof Error ? error : new Error(String(error)),
      { date: targetDate.toISOString().split("T")[0], serviceId }
    );
    throw error;
  }
}

/**
 * Get only available time slots for a specific date and service
 */
export async function getAvailableSlots(
  targetDate: Date,
  serviceId?: string
): Promise<Date[]> {
  const allSlots = await generateTimeSlots(targetDate, serviceId);
  return allSlots.filter(slot => slot.available).map(slot => slot.dateTime);
}

/**
 * Check if a specific date/time is available for booking
 */
export async function isTimeSlotAvailable(
  dateTime: Date,
  serviceId: string,
  excludeAppointmentId?: string
): Promise<{ available: boolean; reason?: string }> {
  try {
    // Get service information
    const service = await prisma.service.findUnique({
      where: { id: serviceId, isActive: true },
      select: { duration: true },
    });

    if (!service || !service.duration) {
      return { available: false, reason: "Service not found or inactive" };
    }

    // Check if within availability hours
    const dayOfWeek = dateTime.getDay();
    const availability = await prisma.availability.findMany({
      where: {
        dayOfWeek,
        isActive: true,
      },
    });

    if (!isWithinAvailability(dateTime, availability)) {
      return { available: false, reason: "Outside business hours" };
    }

    // Check for appointment conflicts
    const existingAppointments = await prisma.appointment.findMany({
      where: {
        ...(excludeAppointmentId && { id: { not: excludeAppointmentId } }),
        status: {
          in: ["PENDING", "CONFIRMED"],
        },
      },
      include: {
        service: {
          select: { duration: true },
        },
      },
    });

    if (
      hasAppointmentConflict(
        dateTime,
        service.duration,
        existingAppointments.map(apt => ({
          dateTime: apt.dateTime,
          duration: apt.service.duration,
        }))
      )
    ) {
      return {
        available: false,
        reason: "Time slot conflicts with existing appointment",
      };
    }

    // Check for blocked slots
    const blockedSlots = await prisma.blockedSlot.findMany({
      where: {
        dateTime: {
          lte: new Date(dateTime.getTime() + service.duration * 60 * 1000),
        },
      },
    });

    if (hasBlockedSlotConflict(dateTime, service.duration, blockedSlots)) {
      return { available: false, reason: "Time slot is blocked" };
    }

    // Check minimum advance booking requirement
    const now = new Date();
    const minAdvanceTime = new Date(
      now.getTime() + BUSINESS_RULES.MIN_ADVANCE_HOURS * 60 * 60 * 1000
    );

    if (dateTime < minAdvanceTime) {
      return {
        available: false,
        reason: `Must be booked at least ${BUSINESS_RULES.MIN_ADVANCE_HOURS} hours in advance`,
      };
    }

    return { available: true };
  } catch (error) {
    logger.error(
      "Failed to check time slot availability",
      error instanceof Error ? error : new Error(String(error)),
      { dateTime: dateTime.toISOString(), serviceId }
    );
    return { available: false, reason: "Error checking availability" };
  }
}

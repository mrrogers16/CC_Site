import { z } from "zod";

// Time validation helpers
const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
const timeString = z.string().regex(timeRegex, "Time must be in HH:MM format");

// Business rules constants
export const BUSINESS_RULES = {
  MIN_ADVANCE_HOURS: 24,
  MAX_ADVANCE_DAYS: 30,
  BUFFER_MINUTES: 15,
  MIN_DURATION: 15,
  MAX_DURATION: 480,
} as const;

// Date/time validation
const futureDateTime = z.coerce
  .date()
  .refine(
    date => {
      const now = new Date();
      const minAdvanceTime = new Date(
        now.getTime() + BUSINESS_RULES.MIN_ADVANCE_HOURS * 60 * 60 * 1000
      );
      return date >= minAdvanceTime;
    },
    {
      message: `Appointments must be booked at least ${BUSINESS_RULES.MIN_ADVANCE_HOURS} hours in advance`,
    }
  )
  .refine(
    date => {
      const now = new Date();
      const maxAdvanceTime = new Date(
        now.getTime() + BUSINESS_RULES.MAX_ADVANCE_DAYS * 24 * 60 * 60 * 1000
      );
      return date <= maxAdvanceTime;
    },
    {
      message: `Appointments cannot be booked more than ${BUSINESS_RULES.MAX_ADVANCE_DAYS} days in advance`,
    }
  );

// Appointment booking validation
export const bookAppointmentSchema = z.object({
  serviceId: z.string().cuid("Invalid service ID"),
  dateTime: futureDateTime,
  notes: z
    .string()
    .max(500, "Notes cannot exceed 500 characters")
    .optional()
    .transform(val => val?.trim() || undefined),
});

// Available slots query validation
export const availableSlotsQuerySchema = z.object({
  date: z.coerce.date().refine(
    date => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return date >= today;
    },
    { message: "Date cannot be in the past" }
  ),
  serviceId: z.string().cuid("Invalid service ID").optional(),
});

// Appointment update validation
export const updateAppointmentSchema = z.object({
  status: z
    .enum(["PENDING", "CONFIRMED", "CANCELLED", "COMPLETED", "NO_SHOW"])
    .optional(),
  notes: z
    .string()
    .max(500, "Notes cannot exceed 500 characters")
    .optional()
    .transform(val => val?.trim() || undefined),
  cancellationReason: z
    .string()
    .max(200, "Cancellation reason cannot exceed 200 characters")
    .optional()
    .transform(val => val?.trim() || undefined),
});

// Availability management validation
export const availabilitySchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6, "Day of week must be 0-6"),
    startTime: timeString,
    endTime: timeString,
    isActive: z.boolean().default(true),
  })
  .refine(
    data => {
      // Validate that endTime is after startTime
      const [startHour, startMinute] = data.startTime.split(":").map(Number);
      const [endHour, endMinute] = data.endTime.split(":").map(Number);

      if (startHour === undefined || startMinute === undefined || endHour === undefined || endMinute === undefined) {
        return false;
      }

      const startTotalMinutes = startHour * 60 + startMinute;
      const endTotalMinutes = endHour * 60 + endMinute;

      return endTotalMinutes > startTotalMinutes;
    },
    {
      message: "End time must be after start time",
      path: ["endTime"],
    }
  );

// Blocked slot validation
export const blockedSlotSchema = z.object({
  dateTime: z.coerce.date(),
  duration: z
    .number()
    .int()
    .min(
      BUSINESS_RULES.MIN_DURATION,
      `Duration must be at least ${BUSINESS_RULES.MIN_DURATION} minutes`
    )
    .max(
      BUSINESS_RULES.MAX_DURATION,
      `Duration cannot exceed ${BUSINESS_RULES.MAX_DURATION} minutes`
    ),
  reason: z
    .string()
    .max(200, "Reason cannot exceed 200 characters")
    .optional()
    .transform(val => val?.trim() || undefined),
});

// Reschedule appointment validation
export const rescheduleAppointmentSchema = z.object({
  newDateTime: futureDateTime,
  reason: z
    .string()
    .max(200, "Reason cannot exceed 200 characters")
    .optional()
    .transform(val => val?.trim() || undefined),
});

// Type exports
export type BookAppointmentData = z.infer<typeof bookAppointmentSchema>;
export type AvailableSlotsQuery = z.infer<typeof availableSlotsQuerySchema>;
export type UpdateAppointmentData = z.infer<typeof updateAppointmentSchema>;
export type AvailabilityData = z.infer<typeof availabilitySchema>;
export type BlockedSlotData = z.infer<typeof blockedSlotSchema>;
export type RescheduleAppointmentData = z.infer<
  typeof rescheduleAppointmentSchema
>;

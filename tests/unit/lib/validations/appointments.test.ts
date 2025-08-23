import {
  bookAppointmentSchema,
  availableSlotsQuerySchema,
  updateAppointmentSchema,
  availabilitySchema,
  blockedSlotSchema,
  rescheduleAppointmentSchema,
  BUSINESS_RULES,
} from "@/lib/validations/appointments";

describe("Appointment Validation Schemas", () => {
  beforeEach(() => {
    // Mock current time for consistent testing
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2025-08-23T10:00:00Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("BUSINESS_RULES constants", () => {
    it("should have correct business rule values", () => {
      expect(BUSINESS_RULES.MIN_ADVANCE_HOURS).toBe(24);
      expect(BUSINESS_RULES.MAX_ADVANCE_DAYS).toBe(30);
      expect(BUSINESS_RULES.BUFFER_MINUTES).toBe(15);
      expect(BUSINESS_RULES.MIN_DURATION).toBe(15);
      expect(BUSINESS_RULES.MAX_DURATION).toBe(480);
    });
  });

  describe("bookAppointmentSchema", () => {
    const validBookingData = {
      serviceId: "clxxxxxxxxxxxxxxxxxxxxxxx",
      dateTime: new Date("2025-08-25T10:00:00Z"), // 2 days from mock current time
      notes: "Looking forward to the session",
    };

    it("should accept valid booking data", () => {
      const result = bookAppointmentSchema.safeParse(validBookingData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.serviceId).toBe(validBookingData.serviceId);
        expect(result.data.dateTime).toEqual(validBookingData.dateTime);
        expect(result.data.notes).toBe(validBookingData.notes);
      }
    });

    it("should accept booking without notes", () => {
      const dataWithoutNotes = {
        serviceId: "clxxxxxxxxxxxxxxxxxxxxxxx",
        dateTime: new Date("2025-08-25T10:00:00Z"),
      };

      const result = bookAppointmentSchema.safeParse(dataWithoutNotes);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.notes).toBeUndefined();
      }
    });

    it("should trim and handle empty notes", () => {
      const dataWithEmptyNotes = {
        serviceId: "clxxxxxxxxxxxxxxxxxxxxxxx",
        dateTime: new Date("2025-08-25T10:00:00Z"),
        notes: "   ",
      };

      const result = bookAppointmentSchema.safeParse(dataWithEmptyNotes);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.notes).toBeUndefined();
      }
    });

    it("should reject invalid service ID format", () => {
      const invalidData = {
        ...validBookingData,
        serviceId: "invalid-id-format",
      };

      const result = bookAppointmentSchema.safeParse(invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Invalid service ID");
      }
    });

    it("should reject appointments in the past", () => {
      const pastAppointment = {
        ...validBookingData,
        dateTime: new Date("2025-08-22T10:00:00Z"), // Yesterday
      };

      const result = bookAppointmentSchema.safeParse(pastAppointment);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe(
          `Appointments must be booked at least ${BUSINESS_RULES.MIN_ADVANCE_HOURS} hours in advance`
        );
      }
    });

    it("should reject appointments too far in advance", () => {
      const tooFarInFuture = {
        ...validBookingData,
        dateTime: new Date("2025-10-23T10:00:00Z"), // More than 30 days
      };

      const result = bookAppointmentSchema.safeParse(tooFarInFuture);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe(
          `Appointments cannot be booked more than ${BUSINESS_RULES.MAX_ADVANCE_DAYS} days in advance`
        );
      }
    });

    it("should reject notes that are too long", () => {
      const longNotesData = {
        ...validBookingData,
        notes: "a".repeat(501), // 501 characters, over 500 limit
      };

      const result = bookAppointmentSchema.safeParse(longNotesData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe(
          "Notes cannot exceed 500 characters"
        );
      }
    });
  });

  describe("availableSlotsQuerySchema", () => {
    it("should accept valid query parameters", () => {
      const validQuery = {
        date: new Date("2025-08-25T00:00:00Z"),
        serviceId: "clxxxxxxxxxxxxxxxxxxxxxxx",
      };

      const result = availableSlotsQuerySchema.safeParse(validQuery);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.date).toEqual(validQuery.date);
        expect(result.data.serviceId).toBe(validQuery.serviceId);
      }
    });

    it("should accept query without serviceId", () => {
      const queryWithoutService = {
        date: new Date("2025-08-25T00:00:00Z"),
      };

      const result = availableSlotsQuerySchema.safeParse(queryWithoutService);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.serviceId).toBeUndefined();
      }
    });

    it("should reject dates in the past", () => {
      const pastDateQuery = {
        date: new Date("2025-08-22T00:00:00Z"), // Yesterday
        serviceId: "clxxxxxxxxxxxxxxxxxxxxxxx",
      };

      const result = availableSlotsQuerySchema.safeParse(pastDateQuery);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe(
          "Date cannot be in the past"
        );
      }
    });

    it("should coerce string dates to Date objects", () => {
      const stringDateQuery = {
        date: "2025-08-25",
        serviceId: "clxxxxxxxxxxxxxxxxxxxxxxx",
      };

      const result = availableSlotsQuerySchema.safeParse(stringDateQuery);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.date).toBeInstanceOf(Date);
      }
    });
  });

  describe("updateAppointmentSchema", () => {
    it("should accept valid status update", () => {
      const validUpdate = {
        status: "CONFIRMED" as const,
        notes: "Confirmed by admin",
      };

      const result = updateAppointmentSchema.safeParse(validUpdate);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe("CONFIRMED");
        expect(result.data.notes).toBe("Confirmed by admin");
      }
    });

    it("should accept cancellation with reason", () => {
      const cancellation = {
        status: "CANCELLED" as const,
        cancellationReason: "Client requested cancellation",
      };

      const result = updateAppointmentSchema.safeParse(cancellation);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe("CANCELLED");
        expect(result.data.cancellationReason).toBe(
          "Client requested cancellation"
        );
      }
    });

    it("should trim and handle empty strings", () => {
      const updateWithWhitespace = {
        notes: "   Important note   ",
        cancellationReason: "   ",
      };

      const result = updateAppointmentSchema.safeParse(updateWithWhitespace);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.notes).toBe("Important note");
        expect(result.data.cancellationReason).toBeUndefined();
      }
    });

    it("should reject invalid appointment status", () => {
      const invalidStatus = {
        status: "INVALID_STATUS",
      };

      const result = updateAppointmentSchema.safeParse(invalidStatus);

      expect(result.success).toBe(false);
    });

    it("should reject overly long notes", () => {
      const longNotes = {
        notes: "a".repeat(501),
      };

      const result = updateAppointmentSchema.safeParse(longNotes);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe(
          "Notes cannot exceed 500 characters"
        );
      }
    });

    it("should reject overly long cancellation reason", () => {
      const longReason = {
        cancellationReason: "a".repeat(201),
      };

      const result = updateAppointmentSchema.safeParse(longReason);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe(
          "Cancellation reason cannot exceed 200 characters"
        );
      }
    });
  });

  describe("availabilitySchema", () => {
    const validAvailability = {
      dayOfWeek: 1, // Monday
      startTime: "09:00",
      endTime: "17:00",
      isActive: true,
    };

    it("should accept valid availability data", () => {
      const result = availabilitySchema.safeParse(validAvailability);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.dayOfWeek).toBe(1);
        expect(result.data.startTime).toBe("09:00");
        expect(result.data.endTime).toBe("17:00");
        expect(result.data.isActive).toBe(true);
      }
    });

    it("should default isActive to true", () => {
      const availabilityWithoutActive = {
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "17:00",
      };

      const result = availabilitySchema.safeParse(availabilityWithoutActive);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isActive).toBe(true);
      }
    });

    it("should reject invalid day of week", () => {
      const invalidDay = {
        ...validAvailability,
        dayOfWeek: 7, // Invalid, should be 0-6
      };

      const result = availabilitySchema.safeParse(invalidDay);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Day of week must be 0-6");
      }
    });

    it("should reject invalid time format", () => {
      const invalidTime = {
        ...validAvailability,
        startTime: "9:00", // Should be "09:00"
      };

      const result = availabilitySchema.safeParse(invalidTime);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe(
          "Time must be in HH:MM format"
        );
      }
    });

    it("should reject when end time is before start time", () => {
      const invalidTimeRange = {
        ...validAvailability,
        startTime: "17:00",
        endTime: "09:00",
      };

      const result = availabilitySchema.safeParse(invalidTimeRange);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe(
          "End time must be after start time"
        );
        expect(result.error.errors[0].path).toEqual(["endTime"]);
      }
    });

    it("should reject when end time equals start time", () => {
      const sameTime = {
        ...validAvailability,
        startTime: "09:00",
        endTime: "09:00",
      };

      const result = availabilitySchema.safeParse(sameTime);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe(
          "End time must be after start time"
        );
      }
    });
  });

  describe("blockedSlotSchema", () => {
    const validBlockedSlot = {
      dateTime: new Date("2025-08-25T10:00:00Z"),
      duration: 60,
      reason: "Doctor unavailable",
    };

    it("should accept valid blocked slot data", () => {
      const result = blockedSlotSchema.safeParse(validBlockedSlot);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.dateTime).toEqual(validBlockedSlot.dateTime);
        expect(result.data.duration).toBe(60);
        expect(result.data.reason).toBe("Doctor unavailable");
      }
    });

    it("should accept blocked slot without reason", () => {
      const slotWithoutReason = {
        dateTime: new Date("2025-08-25T10:00:00Z"),
        duration: 60,
      };

      const result = blockedSlotSchema.safeParse(slotWithoutReason);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.reason).toBeUndefined();
      }
    });

    it("should reject duration below minimum", () => {
      const shortDuration = {
        ...validBlockedSlot,
        duration: 10, // Below 15-minute minimum
      };

      const result = blockedSlotSchema.safeParse(shortDuration);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe(
          `Duration must be at least ${BUSINESS_RULES.MIN_DURATION} minutes`
        );
      }
    });

    it("should reject duration above maximum", () => {
      const longDuration = {
        ...validBlockedSlot,
        duration: 500, // Above 480-minute (8 hour) maximum
      };

      const result = blockedSlotSchema.safeParse(longDuration);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe(
          `Duration cannot exceed ${BUSINESS_RULES.MAX_DURATION} minutes`
        );
      }
    });

    it("should reject overly long reason", () => {
      const longReason = {
        ...validBlockedSlot,
        reason: "a".repeat(201),
      };

      const result = blockedSlotSchema.safeParse(longReason);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe(
          "Reason cannot exceed 200 characters"
        );
      }
    });

    it("should coerce string dates to Date objects", () => {
      const stringDateSlot = {
        dateTime: "2025-08-25T10:00:00Z",
        duration: 60,
      };

      const result = blockedSlotSchema.safeParse(stringDateSlot);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.dateTime).toBeInstanceOf(Date);
      }
    });
  });

  describe("rescheduleAppointmentSchema", () => {
    const validReschedule = {
      newDateTime: new Date("2025-08-26T10:00:00Z"), // 3 days from mock current time
      reason: "Client requested different time",
    };

    it("should accept valid reschedule data", () => {
      const result = rescheduleAppointmentSchema.safeParse(validReschedule);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.newDateTime).toEqual(validReschedule.newDateTime);
        expect(result.data.reason).toBe(validReschedule.reason);
      }
    });

    it("should accept reschedule without reason", () => {
      const rescheduleWithoutReason = {
        newDateTime: new Date("2025-08-26T10:00:00Z"),
      };

      const result = rescheduleAppointmentSchema.safeParse(
        rescheduleWithoutReason
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.reason).toBeUndefined();
      }
    });

    it("should reject new date time in the past", () => {
      const pastDateTime = {
        ...validReschedule,
        newDateTime: new Date("2025-08-22T10:00:00Z"), // Yesterday
      };

      const result = rescheduleAppointmentSchema.safeParse(pastDateTime);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe(
          `Appointments must be booked at least ${BUSINESS_RULES.MIN_ADVANCE_HOURS} hours in advance`
        );
      }
    });

    it("should reject overly long reason", () => {
      const longReason = {
        ...validReschedule,
        reason: "a".repeat(201),
      };

      const result = rescheduleAppointmentSchema.safeParse(longReason);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe(
          "Reason cannot exceed 200 characters"
        );
      }
    });
  });
});

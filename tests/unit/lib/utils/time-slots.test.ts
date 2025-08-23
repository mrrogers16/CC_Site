import {
  generateTimeSlots,
  getAvailableSlots,
  isTimeSlotAvailable,
} from "@/lib/utils/time-slots";
import { prisma } from "@/lib/db";
import { BUSINESS_RULES } from "@/lib/validations/appointments";

// Mock Prisma
jest.mock("@/lib/db", () => ({
  prisma: {
    service: {
      findUnique: jest.fn(),
    },
    availability: {
      findMany: jest.fn(),
    },
    appointment: {
      findMany: jest.fn(),
    },
    blockedSlot: {
      findMany: jest.fn(),
    },
  },
}));

// Mock logger
jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe("Time Slot Utilities", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock current time to a specific date for consistent testing
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2025-08-23T10:00:00Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("generateTimeSlots", () => {
    it("should generate available time slots for a valid date", async () => {
      const targetDate = new Date("2025-08-25T00:00:00Z"); // Monday
      const serviceId = "service-123";

      // Mock service
      mockPrisma.service.findUnique.mockResolvedValue({
        duration: 60,
      } as any);

      // Mock availability (Monday 9-12, 13-17)
      mockPrisma.availability.findMany.mockResolvedValue([
        {
          dayOfWeek: 1,
          startTime: "09:00",
          endTime: "12:00",
        },
        {
          dayOfWeek: 1,
          startTime: "13:00",
          endTime: "17:00",
        },
      ] as any);

      // Mock no existing appointments
      mockPrisma.appointment.findMany.mockResolvedValue([]);

      // Mock no blocked slots
      mockPrisma.blockedSlot.findMany.mockResolvedValue([]);

      const slots = await generateTimeSlots(targetDate, serviceId);

      expect(slots).toHaveLength(28); // 12 slots (9-12) + 16 slots (13-17) = 28 slots
      expect(slots[0].available).toBe(true);
      expect(slots[0].dateTime.getHours()).toBe(9);
      expect(slots[0].dateTime.getMinutes()).toBe(0);
    });

    it("should mark slots as unavailable when they conflict with appointments", async () => {
      const targetDate = new Date("2025-08-25T00:00:00Z");

      mockPrisma.service.findUnique.mockResolvedValue({
        duration: 60,
      } as any);

      mockPrisma.availability.findMany.mockResolvedValue([
        {
          dayOfWeek: 1,
          startTime: "09:00",
          endTime: "12:00",
        },
      ] as any);

      // Mock existing appointment at 10:00 with 15-minute buffer
      mockPrisma.appointment.findMany.mockResolvedValue([
        {
          dateTime: new Date("2025-08-25T10:00:00Z"),
          service: { duration: 60 },
        },
      ] as any);

      mockPrisma.blockedSlot.findMany.mockResolvedValue([]);

      const slots = await generateTimeSlots(targetDate);

      // Find slots around 10:00 - they should be unavailable due to conflict + buffer
      const conflictedSlots = slots.filter(slot => {
        const hour = slot.dateTime.getHours();
        const minute = slot.dateTime.getMinutes();
        // Should be unavailable from 9:45 to 11:15 (15 min buffer + 60 min duration + 15 min buffer)
        return (
          (hour === 9 && minute >= 45) ||
          hour === 10 ||
          (hour === 11 && minute <= 15)
        );
      });

      conflictedSlots.forEach(slot => {
        expect(slot.available).toBe(false);
        expect(slot.reason).toBe("Time slot unavailable");
      });
    });

    it("should mark slots as unavailable when they are blocked", async () => {
      const targetDate = new Date("2025-08-25T00:00:00Z");

      mockPrisma.service.findUnique.mockResolvedValue({
        duration: 60,
      } as any);

      mockPrisma.availability.findMany.mockResolvedValue([
        {
          dayOfWeek: 1,
          startTime: "09:00",
          endTime: "12:00",
        },
      ] as any);

      mockPrisma.appointment.findMany.mockResolvedValue([]);

      // Mock blocked slot at 10:00 for 60 minutes
      mockPrisma.blockedSlot.findMany.mockResolvedValue([
        {
          dateTime: new Date("2025-08-25T10:00:00Z"),
          duration: 60,
        },
      ] as any);

      const slots = await generateTimeSlots(targetDate);

      // Find the 10:00 slot - should be unavailable due to blocking
      const blockedSlot = slots.find(
        slot =>
          slot.dateTime.getHours() === 10 && slot.dateTime.getMinutes() === 0
      );

      expect(blockedSlot?.available).toBe(false);
      expect(blockedSlot?.reason).toBe("Time slot blocked");
    });

    it("should mark slots as unavailable when they don&apos;t meet advance booking requirement", async () => {
      const targetDate = new Date("2025-08-23T00:00:00Z"); // Today
      jest.setSystemTime(new Date("2025-08-23T12:00:00Z")); // Noon today

      mockPrisma.service.findUnique.mockResolvedValue({
        duration: 60,
      } as any);

      mockPrisma.availability.findMany.mockResolvedValue([
        {
          dayOfWeek: 6, // Saturday
          startTime: "13:00",
          endTime: "17:00",
        },
      ] as any);

      mockPrisma.appointment.findMany.mockResolvedValue([]);
      mockPrisma.blockedSlot.findMany.mockResolvedValue([]);

      const slots = await generateTimeSlots(targetDate);

      // All slots should be unavailable due to insufficient advance notice (24 hours required)
      const earlySlots = slots.filter(
        slot => slot.dateTime < new Date("2025-08-24T12:00:00Z")
      );

      earlySlots.forEach(slot => {
        expect(slot.available).toBe(false);
        expect(slot.reason).toBe("Insufficient advance notice");
      });
    });

    it("should return empty array when no availability windows exist", async () => {
      const targetDate = new Date("2025-08-24T00:00:00Z"); // Sunday

      mockPrisma.service.findUnique.mockResolvedValue({
        duration: 60,
      } as any);

      // No availability on Sunday
      mockPrisma.availability.findMany.mockResolvedValue([]);

      const slots = await generateTimeSlots(targetDate);

      expect(slots).toHaveLength(0);
    });

    it("should throw error when service is not found", async () => {
      const targetDate = new Date("2025-08-25T00:00:00Z");
      const serviceId = "nonexistent-service";

      mockPrisma.service.findUnique.mockResolvedValue(null);

      await expect(generateTimeSlots(targetDate, serviceId)).rejects.toThrow(
        "Service not found or inactive"
      );
    });
  });

  describe("getAvailableSlots", () => {
    it("should return only available time slots", async () => {
      const targetDate = new Date("2025-08-25T00:00:00Z");

      mockPrisma.service.findUnique.mockResolvedValue({
        duration: 60,
      } as any);

      mockPrisma.availability.findMany.mockResolvedValue([
        {
          dayOfWeek: 1,
          startTime: "09:00",
          endTime: "11:00",
        },
      ] as any);

      mockPrisma.appointment.findMany.mockResolvedValue([]);
      mockPrisma.blockedSlot.findMany.mockResolvedValue([]);

      const availableSlots = await getAvailableSlots(targetDate);

      expect(availableSlots).toHaveLength(8); // 9:00, 9:15, 9:30, 9:45, 10:00, 10:15, 10:30, 10:45
      expect(availableSlots[0]).toBeInstanceOf(Date);
      expect(availableSlots[0].getHours()).toBe(9);
      expect(availableSlots[0].getMinutes()).toBe(0);
    });
  });

  describe("isTimeSlotAvailable", () => {
    it("should return available true for valid time slot", async () => {
      const dateTime = new Date("2025-08-25T10:00:00Z");
      const serviceId = "service-123";

      mockPrisma.service.findUnique.mockResolvedValue({
        duration: 60,
      } as any);

      mockPrisma.availability.findMany.mockResolvedValue([
        {
          dayOfWeek: 1,
          startTime: "09:00",
          endTime: "17:00",
        },
      ] as any);

      mockPrisma.appointment.findMany.mockResolvedValue([]);
      mockPrisma.blockedSlot.findMany.mockResolvedValue([]);

      const result = await isTimeSlotAvailable(dateTime, serviceId);

      expect(result.available).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it("should return available false when service is not found", async () => {
      const dateTime = new Date("2025-08-25T10:00:00Z");
      const serviceId = "nonexistent-service";

      mockPrisma.service.findUnique.mockResolvedValue(null);

      const result = await isTimeSlotAvailable(dateTime, serviceId);

      expect(result.available).toBe(false);
      expect(result.reason).toBe("Service not found or inactive");
    });

    it("should return available false when outside business hours", async () => {
      const dateTime = new Date("2025-08-25T08:00:00Z"); // 8 AM, before business hours
      const serviceId = "service-123";

      mockPrisma.service.findUnique.mockResolvedValue({
        duration: 60,
      } as any);

      mockPrisma.availability.findMany.mockResolvedValue([
        {
          dayOfWeek: 1,
          startTime: "09:00",
          endTime: "17:00",
        },
      ] as any);

      const result = await isTimeSlotAvailable(dateTime, serviceId);

      expect(result.available).toBe(false);
      expect(result.reason).toBe("Outside business hours");
    });

    it("should return available false when appointment conflict exists", async () => {
      const dateTime = new Date("2025-08-25T10:00:00Z");
      const serviceId = "service-123";

      mockPrisma.service.findUnique.mockResolvedValue({
        duration: 60,
      } as any);

      mockPrisma.availability.findMany.mockResolvedValue([
        {
          dayOfWeek: 1,
          startTime: "09:00",
          endTime: "17:00",
        },
      ] as any);

      // Conflicting appointment
      mockPrisma.appointment.findMany.mockResolvedValue([
        {
          dateTime: new Date("2025-08-25T10:00:00Z"),
          service: { duration: 60 },
        },
      ] as any);

      mockPrisma.blockedSlot.findMany.mockResolvedValue([]);

      const result = await isTimeSlotAvailable(dateTime, serviceId);

      expect(result.available).toBe(false);
      expect(result.reason).toBe(
        "Time slot conflicts with existing appointment"
      );
    });

    it("should exclude specified appointment from conflict check", async () => {
      const dateTime = new Date("2025-08-25T10:00:00Z");
      const serviceId = "service-123";
      const excludeAppointmentId = "appointment-to-exclude";

      mockPrisma.service.findUnique.mockResolvedValue({
        duration: 60,
      } as any);

      mockPrisma.availability.findMany.mockResolvedValue([
        {
          dayOfWeek: 1,
          startTime: "09:00",
          endTime: "17:00",
        },
      ] as any);

      // Mock appointment query to verify exclude logic
      mockPrisma.appointment.findMany.mockResolvedValue([]);
      mockPrisma.blockedSlot.findMany.mockResolvedValue([]);

      const result = await isTimeSlotAvailable(
        dateTime,
        serviceId,
        excludeAppointmentId
      );

      expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith({
        where: {
          id: { not: excludeAppointmentId },
          status: { in: ["PENDING", "CONFIRMED"] },
        },
        include: {
          service: {
            select: { duration: true },
          },
        },
      });

      expect(result.available).toBe(true);
    });

    it("should return available false when insufficient advance booking time", async () => {
      const dateTime = new Date("2025-08-23T15:00:00Z"); // 3 PM today
      const serviceId = "service-123";

      // Set current time to 2 PM today (only 1 hour advance, need 24)
      jest.setSystemTime(new Date("2025-08-23T14:00:00Z"));

      mockPrisma.service.findUnique.mockResolvedValue({
        duration: 60,
      } as any);

      mockPrisma.availability.findMany.mockResolvedValue([
        {
          dayOfWeek: 6, // Saturday
          startTime: "09:00",
          endTime: "17:00",
        },
      ] as any);

      mockPrisma.appointment.findMany.mockResolvedValue([]);
      mockPrisma.blockedSlot.findMany.mockResolvedValue([]);

      const result = await isTimeSlotAvailable(dateTime, serviceId);

      expect(result.available).toBe(false);
      expect(result.reason).toBe(
        `Must be booked at least ${BUSINESS_RULES.MIN_ADVANCE_HOURS} hours in advance`
      );
    });
  });
});

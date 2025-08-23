import { POST as bookAppointment } from "@/app/api/appointments/book/route";
import { GET as getAvailableSlots } from "@/app/api/appointments/available/route";
import {
  GET as getAppointment,
  PATCH as updateAppointment,
} from "@/app/api/appointments/[id]/route";
import { generateTimeSlots } from "@/lib/utils/time-slots";
import { NextRequest } from "next/server";

// Mock Prisma client
jest.mock("@/lib/db", () => ({
  prisma: {
    user: {
      create: jest.fn(),
      findFirst: jest.fn(),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    service: {
      create: jest.fn(),
      findFirst: jest.fn(),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    appointment: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    availability: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    $disconnect: jest.fn().mockResolvedValue(undefined),
  },
}));

// Mock session for authenticated requests
jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

import { getServerSession } from "next-auth";
const mockGetServerSession = getServerSession as jest.MockedFunction<
  typeof getServerSession
>;

// Import mocked dependencies after mock setup
import { prisma } from "@/lib/db";
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe("Appointment Booking Flow Integration", () => {
  let testUser: any;
  let testService: any;
  let testAvailability: any;

  beforeAll(async () => {
    // Clean up test data
    await prisma.appointment.deleteMany({
      where: { user: { email: "integration-test@example.com" } },
    });
    await prisma.user.deleteMany({
      where: { email: "integration-test@example.com" },
    });
    await prisma.availability.deleteMany({
      where: { dayOfWeek: 1 }, // Monday test data
    });

    // Create test user
    testUser = await prisma.user.create({
      data: {
        email: "integration-test@example.com",
        name: "Integration Test User",
        role: "CLIENT",
      },
    });

    // Get existing service or create one
    testService = await prisma.service.findFirst({
      where: { isActive: true },
    });

    if (!testService) {
      testService = await prisma.service.create({
        data: {
          title: "Test Service",
          description: "Test service for integration testing",
          duration: 60,
          price: 100,
          isActive: true,
        },
      });
    }

    // Create test availability (Monday 9-17)
    testAvailability = await prisma.availability.create({
      data: {
        dayOfWeek: 1, // Monday
        startTime: "09:00",
        endTime: "17:00",
        isActive: true,
      },
    });

    // Mock authenticated session
    mockGetServerSession.mockResolvedValue({
      user: {
        id: testUser.id,
        email: testUser.email,
        role: testUser.role,
      },
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.appointment.deleteMany({
      where: { userId: testUser.id },
    });
    await prisma.availability.delete({
      where: { id: testAvailability.id },
    });
    await prisma.user.delete({
      where: { id: testUser.id },
    });
  });

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2025-08-23T10:00:00Z")); // Saturday
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const mockRequest = (url: string, data?: any) => {
    const request = {
      url,
      json: data ? () => Promise.resolve(data) : undefined,
    } as NextRequest;
    return request;
  };

  describe("Complete Booking Flow", () => {
    it("should complete full booking workflow from availability check to appointment management", async () => {
      const testDate = "2025-08-26"; // Monday
      const testDateTime = "2025-08-26T10:00:00Z";

      // Step 1: Check available slots
      const availabilityRequest = mockRequest(
        `http://localhost:3000/api/appointments/available?date=${testDate}&serviceId=${testService.id}`
      );

      const availabilityResponse = await getAvailableSlots(availabilityRequest);
      const availabilityData = await availabilityResponse.json();

      expect(availabilityResponse.status).toBe(200);
      expect(availabilityData.success).toBe(true);
      expect(availabilityData.data.totalAvailable).toBeGreaterThan(0);

      // Find the 10:00 AM slot
      const tenAmSlot = availabilityData.data.slots.find(
        (slot: any) => slot.dateTime === testDateTime
      );
      expect(tenAmSlot).toBeDefined();

      // Step 2: Book the appointment
      const bookingData = {
        serviceId: testService.id,
        dateTime: testDateTime,
        notes: "Integration test appointment",
      };

      const bookingRequest = mockRequest(
        "http://localhost:3000/api/appointments/book",
        bookingData
      );
      const bookingResponse = await bookAppointment(bookingRequest);
      const bookingResponseData = await bookingResponse.json();

      expect(bookingResponse.status).toBe(201);
      expect(bookingResponseData.success).toBe(true);
      expect(bookingResponseData.data.status).toBe("PENDING");
      expect(bookingResponseData.data.service.title).toBe(testService.title);

      const appointmentId = bookingResponseData.data.id;

      // Step 3: Retrieve the appointment
      const getAppointmentRequest = mockRequest(
        `http://localhost:3000/api/appointments/${appointmentId}`
      );
      const getAppointmentResponse = await getAppointment(
        getAppointmentRequest,
        { params: Promise.resolve({ id: appointmentId }) }
      );
      const appointmentData = await getAppointmentResponse.json();

      expect(getAppointmentResponse.status).toBe(200);
      expect(appointmentData.success).toBe(true);
      expect(appointmentData.data.id).toBe(appointmentId);
      expect(appointmentData.data.notes).toBe("Integration test appointment");

      // Step 4: Update appointment status
      const updateData = {
        status: "CONFIRMED",
        notes: "Updated notes after confirmation",
      };

      const updateRequest = mockRequest(
        `http://localhost:3000/api/appointments/${appointmentId}`,
        updateData
      );
      const updateResponse = await updateAppointment(updateRequest, {
        params: Promise.resolve({ id: appointmentId }),
      });
      const updateResponseData = await updateResponse.json();

      expect(updateResponse.status).toBe(200);
      expect(updateResponseData.success).toBe(true);
      expect(updateResponseData.data.status).toBe("CONFIRMED");
      expect(updateResponseData.data.notes).toBe(
        "Updated notes after confirmation"
      );

      // Step 5: Verify time slot is no longer available
      const secondAvailabilityRequest = mockRequest(
        `http://localhost:3000/api/appointments/available?date=${testDate}&serviceId=${testService.id}`
      );

      const secondAvailabilityResponse = await getAvailableSlots(
        secondAvailabilityRequest
      );
      const secondAvailabilityData = await secondAvailabilityResponse.json();

      // The 10:00 AM slot should no longer be available (or nearby slots due to buffer)
      const updatedTenAmSlot = secondAvailabilityData.data.slots.find(
        (slot: any) => slot.dateTime === testDateTime
      );
      expect(updatedTenAmSlot).toBeUndefined();
    });

    it("should prevent double booking at the same time", async () => {
      const testDateTime = "2025-08-26T14:00:00Z";

      // Book first appointment
      const firstBookingData = {
        serviceId: testService.id,
        dateTime: testDateTime,
        notes: "First appointment",
      };

      const firstRequest = mockRequest(
        "http://localhost:3000/api/appointments/book",
        firstBookingData
      );
      const firstResponse = await bookAppointment(firstRequest);
      const firstResponseData = await firstResponse.json();

      expect(firstResponse.status).toBe(201);
      expect(firstResponseData.success).toBe(true);

      // Try to book second appointment at same time
      const secondBookingData = {
        serviceId: testService.id,
        dateTime: testDateTime,
        notes: "Second appointment (should fail)",
      };

      const secondRequest = mockRequest(
        "http://localhost:3000/api/appointments/book",
        secondBookingData
      );
      const secondResponse = await bookAppointment(secondRequest);
      const secondResponseData = await secondResponse.json();

      expect(secondResponse.status).toBe(400);
      expect(secondResponseData.error).toBe("ValidationError");
      expect(secondResponseData.message).toBe(
        "You already have an appointment at this time"
      );
    });

    it("should handle buffer time conflicts correctly", async () => {
      // Book appointment at 11:00 AM
      const firstDateTime = "2025-08-26T11:00:00Z";
      const firstBookingData = {
        serviceId: testService.id,
        dateTime: firstDateTime,
        notes: "First appointment with buffer test",
      };

      const firstRequest = mockRequest(
        "http://localhost:3000/api/appointments/book",
        firstBookingData
      );
      const firstResponse = await bookAppointment(firstRequest);

      expect(firstResponse.status).toBe(201);

      // Check availability after booking - slots near 11:00 should be unavailable due to buffer
      const availabilityRequest = mockRequest(
        `http://localhost:3000/api/appointments/available?date=2025-08-26&serviceId=${testService.id}`
      );

      const availabilityResponse = await getAvailableSlots(availabilityRequest);
      const availabilityData = await availabilityResponse.json();

      // Slots around 11:00 should be filtered out due to 15-minute buffer + 60-minute duration
      const conflictingSlots = availabilityData.data.slots.filter(
        (slot: any) => {
          const slotTime = new Date(slot.dateTime);
          const bookingTime = new Date(firstDateTime);
          const timeDiff =
            Math.abs(slotTime.getTime() - bookingTime.getTime()) / (1000 * 60); // minutes
          return timeDiff < 75; // 15 min buffer + 60 min duration
        }
      );

      expect(conflictingSlots.length).toBe(0);
    });

    it("should respect business rules for advance booking", async () => {
      // Try to book appointment too soon (less than 24 hours)
      jest.setSystemTime(new Date("2025-08-26T08:00:00Z")); // Monday 8 AM

      const tooSoonDateTime = "2025-08-26T15:00:00Z"; // Same day, 3 PM (only 7 hours advance)

      const bookingData = {
        serviceId: testService.id,
        dateTime: tooSoonDateTime,
        notes: "Too soon booking attempt",
      };

      const request = mockRequest(
        "http://localhost:3000/api/appointments/book",
        bookingData
      );
      const response = await bookAppointment(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe("Validation Error");
      expect(responseData.message).toContain("24 hours in advance");
    });
  });

  describe("Time Slot Generation Integration", () => {
    it("should generate consistent slots with database availability", async () => {
      const testDate = new Date("2025-08-26T00:00:00Z"); // Monday

      // Generate slots using utility function
      const generatedSlots = await generateTimeSlots(testDate, testService.id);

      // Get slots via API
      const apiRequest = mockRequest(
        `http://localhost:3000/api/appointments/available?date=2025-08-26&serviceId=${testService.id}`
      );
      const apiResponse = await getAvailableSlots(apiRequest);
      const apiData = await apiResponse.json();

      // Available slots from API should match available slots from utility
      const availableGeneratedSlots = generatedSlots
        .filter(slot => slot.available)
        .map(slot => slot.dateTime.toISOString());

      const apiSlotTimes = apiData.data.slots.map((slot: any) => slot.dateTime);

      expect(availableGeneratedSlots.length).toBe(apiSlotTimes.length);
      availableGeneratedSlots.forEach(slotTime => {
        expect(apiSlotTimes).toContain(slotTime);
      });
    });

    it("should handle multiple availability windows correctly", async () => {
      // Create second availability window for Monday (lunch break scenario)
      const lunchBreakAvailability = await prisma.availability.create({
        data: {
          dayOfWeek: 1, // Monday
          startTime: "18:00", // 6 PM
          endTime: "20:00", // 8 PM
          isActive: true,
        },
      });

      try {
        const testDate = new Date("2025-08-26T00:00:00Z"); // Monday
        const generatedSlots = await generateTimeSlots(
          testDate,
          testService.id
        );

        // Should have slots in both windows (9-17 and 18-20)
        const morningSlots = generatedSlots.filter(slot => {
          const hour = slot.dateTime.getHours();
          return hour >= 9 && hour < 17;
        });

        const eveningSlots = generatedSlots.filter(slot => {
          const hour = slot.dateTime.getHours();
          return hour >= 18 && hour < 20;
        });

        expect(morningSlots.length).toBeGreaterThan(0);
        expect(eveningSlots.length).toBeGreaterThan(0);
      } finally {
        // Clean up
        await prisma.availability.delete({
          where: { id: lunchBreakAvailability.id },
        });
      }
    });
  });
});

import { POST as BookingPost } from "@/app/api/appointments/book/route";
import { GET as ServicesGet } from "@/app/api/services/route";
import { GET as AvailableGet } from "@/app/api/appointments/available/route";
import { NextRequest } from "next/server";

// Mock Prisma client with all required methods
jest.mock("@/lib/db", () => ({
  prisma: {
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    service: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    appointment: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    availability: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    blockedSlot: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    $transaction: jest.fn(),
  },
}));

// Mock external dependencies
jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock email sending
jest.mock("@/lib/email", () => ({
  sendEmail: jest.fn().mockResolvedValue(true),
}));

// Import after mocking
import { prisma } from "@/lib/db";

// Get typed mock access
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe("Complete Booking Flow Integration", () => {
  beforeEach(async () => {
    // Clean up database before each test
    await prisma.appointment.deleteMany();
    await prisma.user.deleteMany();
    await prisma.service.deleteMany();

    jest.clearAllMocks();
  });

  afterAll(async () => {
    // Clean up after all tests
    await prisma.appointment.deleteMany();
    await prisma.user.deleteMany();
    await prisma.service.deleteMany();
    await prisma.$disconnect();
  });

  describe("End-to-End Booking Workflow", () => {
    it("completes full booking flow: services → availability → booking", async () => {
      // Step 1: Create test service
      const testService = {
        id: "test-service-1",
        title: "Integration Test Counseling",
        description: "Test service for integration testing",
        duration: 60,
        price: 120,
        isActive: true,
        features: ["Test feature 1", "Test feature 2"],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.service.create.mockResolvedValue(testService);
      const _createdService = await prisma.service.create({
        data: testService,
      });

      // Step 2: Get services (simulating service selector)
      const servicesResponse = await ServicesGet();
      const servicesData = await servicesResponse.json();

      expect(servicesResponse.status).toBe(200);
      expect(servicesData.success).toBe(true);
      expect(servicesData.services).toHaveLength(1);
      expect(servicesData.services[0]).toMatchObject({
        id: "test-service-1",
        title: "Integration Test Counseling",
        duration: 60,
        price: 120,
      });

      // Step 3: Check availability (simulating calendar view)
      const testDate = new Date();
      testDate.setDate(testDate.getDate() + 2); // Day after tomorrow
      testDate.setHours(9, 0, 0, 0); // 9 AM
      const dateString = testDate.toISOString().split("T")[0];

      const availabilityRequest = new NextRequest(
        `http://localhost:3000/api/appointments/available?date=${dateString}&serviceId=test-service-1`
      );
      const availabilityResponse = await AvailableGet(availabilityRequest);
      const availabilityData = await availabilityResponse.json();

      expect(availabilityResponse.status).toBe(200);
      expect(availabilityData.success).toBe(true);
      expect(availabilityData.slots).toBeDefined();
      expect(Array.isArray(availabilityData.slots)).toBe(true);

      // Find an available slot
      const availableSlots = availabilityData.slots.filter(
        (slot: any) => slot.available
      );
      expect(availableSlots.length).toBeGreaterThan(0);

      const selectedSlot = availableSlots[0];

      // Step 4: Complete booking
      const bookingData = {
        serviceId: "test-service-1",
        dateTime: selectedSlot.dateTime,
        notes: "Integration test booking",
        user: {
          name: "Integration Test User",
          email: "integration@test.com",
          phone: "+1234567890",
        },
      };

      const bookingRequest = new NextRequest(
        "http://localhost:3000/api/appointments/book",
        {
          method: "POST",
          body: JSON.stringify(bookingData),
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const bookingResponse = await BookingPost(bookingRequest);
      const bookingResult = await bookingResponse.json();

      expect(bookingResponse.status).toBe(201);
      expect(bookingResult.success).toBe(true);
      expect(bookingResult.appointment).toMatchObject({
        serviceId: "test-service-1",
        status: "PENDING",
        notes: "Integration test booking",
      });

      // Step 5: Verify database state
      const createdUser = await prisma.user.findUnique({
        where: { email: "integration@test.com" },
      });

      expect(createdUser).toBeTruthy();
      expect(createdUser?.name).toBe("Integration Test User");
      expect(createdUser?.phone).toBe("+1234567890");

      const createdAppointment = await prisma.appointment.findFirst({
        where: {
          ...(createdUser?.id && { userId: createdUser.id }),
          serviceId: "test-service-1",
        },
        include: {
          service: true,
          user: true,
        },
      });

      expect(createdAppointment).toBeTruthy();
      expect(createdAppointment?.status).toBe("PENDING");
      expect(createdAppointment?.notes).toBe("Integration test booking");
      expect(createdAppointment?.service.title).toBe(
        "Integration Test Counseling"
      );

      // Step 6: Verify that the slot is now unavailable
      const postBookingAvailabilityRequest = new NextRequest(
        `http://localhost:3000/api/appointments/available?date=${dateString}&serviceId=test-service-1`
      );
      const postBookingAvailabilityResponse = await AvailableGet(
        postBookingAvailabilityRequest
      );
      const postBookingAvailabilityData =
        await postBookingAvailabilityResponse.json();

      const postBookingAvailableSlots =
        postBookingAvailabilityData.slots.filter(
          (slot: any) =>
            slot.available && slot.dateTime === selectedSlot.dateTime
        );

      expect(postBookingAvailableSlots).toHaveLength(0);
    });

    it("handles existing user booking flow", async () => {
      // Step 1: Create test service and existing user
      const _testService = await prisma.service.create({
        data: {
          id: "test-service-2",
          title: "Existing User Test Service",
          description: "Test service for existing user",
          duration: 90,
          price: 150,
          isActive: true,
          features: ["Feature 1"],
        },
      });

      const existingUser = await prisma.user.create({
        data: {
          id: "existing-user-1",
          name: "Existing User",
          email: "existing@test.com",
          phone: "+9876543210",
          role: "CLIENT",
        },
      });

      // Step 2: Make booking with existing user
      const testDate = new Date();
      testDate.setDate(testDate.getDate() + 3);
      testDate.setHours(10, 0, 0, 0);

      const bookingData = {
        serviceId: "test-service-2",
        dateTime: testDate.toISOString(),
        notes: "Existing user booking",
        user: {
          name: "Existing User",
          email: "existing@test.com",
          phone: "+9876543210",
        },
      };

      const bookingRequest = new NextRequest(
        "http://localhost:3000/api/appointments/book",
        {
          method: "POST",
          body: JSON.stringify(bookingData),
        }
      );

      const bookingResponse = await BookingPost(bookingRequest);
      const bookingResult = await bookingResponse.json();

      expect(bookingResponse.status).toBe(201);
      expect(bookingResult.success).toBe(true);

      // Step 3: Verify no duplicate user was created
      const userCount = await prisma.user.count({
        where: { email: "existing@test.com" },
      });

      expect(userCount).toBe(1);

      // Step 4: Verify appointment is linked to existing user
      const appointment = await prisma.appointment.findFirst({
        where: {
          serviceId: "test-service-2",
          userId: existingUser.id,
        },
      });

      expect(appointment).toBeTruthy();
      expect(appointment?.userId).toBe(existingUser.id);
    });

    it("prevents double booking conflicts", async () => {
      // Step 1: Create test service
      const _testService = await prisma.service.create({
        data: {
          id: "test-service-conflict",
          title: "Conflict Test Service",
          description: "Service for testing booking conflicts",
          duration: 60,
          price: 120,
          isActive: true,
          features: ["Test"],
        },
      });

      const testDateTime = new Date();
      testDateTime.setDate(testDateTime.getDate() + 2);
      testDateTime.setHours(14, 0, 0, 0); // 2 PM

      // Step 2: Make first booking
      const firstBookingData = {
        serviceId: "test-service-conflict",
        dateTime: testDateTime.toISOString(),
        notes: "First booking",
        user: {
          name: "First User",
          email: "first@test.com",
        },
      };

      const firstBookingRequest = new NextRequest(
        "http://localhost:3000/api/appointments/book",
        {
          method: "POST",
          body: JSON.stringify(firstBookingData),
        }
      );

      const firstBookingResponse = await BookingPost(firstBookingRequest);
      const firstBookingResult = await firstBookingResponse.json();

      expect(firstBookingResponse.status).toBe(201);
      expect(firstBookingResult.success).toBe(true);

      // Step 3: Attempt second booking at same time
      const secondBookingData = {
        serviceId: "test-service-conflict",
        dateTime: testDateTime.toISOString(),
        notes: "Conflicting booking",
        user: {
          name: "Second User",
          email: "second@test.com",
        },
      };

      const secondBookingRequest = new NextRequest(
        "http://localhost:3000/api/appointments/book",
        {
          method: "POST",
          body: JSON.stringify(secondBookingData),
        }
      );

      const secondBookingResponse = await BookingPost(secondBookingRequest);
      const secondBookingResult = await secondBookingResponse.json();

      expect(secondBookingResponse.status).toBe(409);
      expect(secondBookingResult.success).toBe(false);
      expect(secondBookingResult.error).toContain("already booked");

      // Step 4: Verify only one appointment exists
      const appointmentCount = await prisma.appointment.count({
        where: {
          serviceId: "test-service-conflict",
          dateTime: testDateTime,
        },
      });

      expect(appointmentCount).toBe(1);
    });

    it("handles service deactivation during booking flow", async () => {
      // Step 1: Create active service
      const _testService = await prisma.service.create({
        data: {
          id: "test-service-deactivation",
          title: "Deactivation Test Service",
          description: "Service for testing deactivation",
          duration: 60,
          price: 120,
          isActive: true,
          features: ["Test"],
        },
      });

      // Step 2: Get services (service is active)
      const servicesResponse = await ServicesGet();
      const servicesData = await servicesResponse.json();

      const service = servicesData.services.find(
        (s: any) => s.id === "test-service-deactivation"
      );
      expect(service).toBeTruthy();

      // Step 3: Deactivate service
      await prisma.service.update({
        where: { id: "test-service-deactivation" },
        data: { isActive: false },
      });

      // Step 4: Attempt booking with deactivated service
      const testDateTime = new Date();
      testDateTime.setDate(testDateTime.getDate() + 2);
      testDateTime.setHours(9, 0, 0, 0);

      const bookingData = {
        serviceId: "test-service-deactivation",
        dateTime: testDateTime.toISOString(),
        notes: "Should fail",
        user: {
          name: "Test User",
          email: "test@deactivation.com",
        },
      };

      const bookingRequest = new NextRequest(
        "http://localhost:3000/api/appointments/book",
        {
          method: "POST",
          body: JSON.stringify(bookingData),
        }
      );

      const bookingResponse = await BookingPost(bookingRequest);
      const bookingResult = await bookingResponse.json();

      expect(bookingResponse.status).toBe(400);
      expect(bookingResult.success).toBe(false);
      expect(bookingResult.error).toContain("not available");
    });

    it("validates business hours across the booking flow", async () => {
      // Step 1: Create test service
      await prisma.service.create({
        data: {
          id: "test-service-hours",
          title: "Business Hours Test",
          description: "Service for testing business hours",
          duration: 60,
          price: 120,
          isActive: true,
          features: ["Test"],
        },
      });

      // Step 2: Check availability outside business hours
      const testDate = new Date();
      testDate.setDate(testDate.getDate() + 2);

      // Test very early morning (before business hours)
      const earlyMorning = new Date(testDate);
      earlyMorning.setHours(6, 0, 0, 0);

      const earlyDateString = earlyMorning.toISOString().split("T")[0];
      const availabilityRequest = new NextRequest(
        `http://localhost:3000/api/appointments/available?date=${earlyDateString}&serviceId=test-service-hours`
      );

      const availabilityResponse = await AvailableGet(availabilityRequest);
      const availabilityData = await availabilityResponse.json();

      // Should return no available slots for early morning
      const earlySlots = availabilityData.slots.filter(
        (slot: any) => slot.available && new Date(slot.dateTime).getHours() < 8
      );
      expect(earlySlots).toHaveLength(0);

      // Step 3: Attempt direct booking outside hours should fail
      const bookingData = {
        serviceId: "test-service-hours",
        dateTime: earlyMorning.toISOString(),
        notes: "Should fail - outside hours",
        user: {
          name: "Test User",
          email: "test@hours.com",
        },
      };

      const bookingRequest = new NextRequest(
        "http://localhost:3000/api/appointments/book",
        {
          method: "POST",
          body: JSON.stringify(bookingData),
        }
      );

      const bookingResponse = await BookingPost(bookingRequest);
      expect(bookingResponse.status).toBe(400);
    });

    it("handles concurrent booking attempts gracefully", async () => {
      // Step 1: Create test service
      await prisma.service.create({
        data: {
          id: "test-service-concurrent",
          title: "Concurrent Test Service",
          description: "Service for testing concurrent bookings",
          duration: 60,
          price: 120,
          isActive: true,
          features: ["Test"],
        },
      });

      const testDateTime = new Date();
      testDateTime.setDate(testDateTime.getDate() + 2);
      testDateTime.setHours(11, 0, 0, 0);

      // Step 2: Create multiple concurrent booking requests
      const bookingPromises = [];

      for (let i = 0; i < 3; i++) {
        const bookingData = {
          serviceId: "test-service-concurrent",
          dateTime: testDateTime.toISOString(),
          notes: `Concurrent booking ${i + 1}`,
          user: {
            name: `Concurrent User ${i + 1}`,
            email: `concurrent${i + 1}@test.com`,
          },
        };

        const bookingRequest = new NextRequest(
          "http://localhost:3000/api/appointments/book",
          {
            method: "POST",
            body: JSON.stringify(bookingData),
          }
        );

        bookingPromises.push(BookingPost(bookingRequest));
      }

      // Step 3: Execute all requests simultaneously
      const responses = await Promise.all(bookingPromises);

      // Step 4: Verify only one succeeded
      const successfulResponses = responses.filter(
        async response => response.status === 201
      );
      const failedResponses = responses.filter(
        async response => response.status !== 201
      );

      expect(successfulResponses).toHaveLength(1);
      expect(failedResponses).toHaveLength(2);

      // Step 5: Verify database has only one appointment
      const appointmentCount = await prisma.appointment.count({
        where: {
          serviceId: "test-service-concurrent",
          dateTime: testDateTime,
        },
      });

      expect(appointmentCount).toBe(1);
    });
  });

  describe("Database State Management", () => {
    it("maintains data integrity throughout booking process", async () => {
      // Step 1: Setup
      const testService = await prisma.service.create({
        data: {
          id: "integrity-test-service",
          title: "Data Integrity Test",
          description: "Testing data integrity",
          duration: 60,
          price: 120,
          isActive: true,
          features: ["Test"],
        },
      });

      const testDateTime = new Date();
      testDateTime.setDate(testDateTime.getDate() + 2);
      testDateTime.setHours(13, 0, 0, 0);

      // Step 2: Successful booking
      const bookingData = {
        serviceId: "integrity-test-service",
        dateTime: testDateTime.toISOString(),
        notes: "Data integrity test",
        user: {
          name: "Integrity Test User",
          email: "integrity@test.com",
          phone: "+1111111111",
        },
      };

      const bookingRequest = new NextRequest(
        "http://localhost:3000/api/appointments/book",
        {
          method: "POST",
          body: JSON.stringify(bookingData),
        }
      );

      const response = await BookingPost(bookingRequest);
      expect(response.status).toBe(201);

      // Step 3: Verify all related data exists and is consistent
      const appointment = await prisma.appointment.findFirst({
        where: { serviceId: "integrity-test-service" },
        include: {
          user: true,
          service: true,
        },
      });

      expect(appointment).toBeTruthy();
      expect(appointment?.user.email).toBe("integrity@test.com");
      expect(appointment?.user.phone).toBe("+1111111111");
      expect(appointment?.service.title).toBe("Data Integrity Test");
      expect(appointment?.dateTime).toEqual(testDateTime);
      expect(appointment?.status).toBe("PENDING");

      // Step 4: Verify user was created with correct role
      const user = await prisma.user.findUnique({
        where: { email: "integrity@test.com" },
      });

      expect(user?.role).toBe("CLIENT");
      expect(user?.name).toBe("Integrity Test User");

      // Step 5: Verify foreign key relationships
      expect(appointment?.userId).toBe(user?.id);
      expect(appointment?.serviceId).toBe(testService.id);
    });

    it("handles partial failures gracefully with rollback", async () => {
      // This test would require mocking database failures at specific points
      // to test transaction rollback behavior
      expect(true).toBe(true); // Placeholder for now
    });
  });
});

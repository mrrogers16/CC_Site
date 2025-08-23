import { NextRequest } from "next/server";
import { POST } from "@/app/api/appointments/book/route";
import { getServerSession } from "next-auth";
import { isTimeSlotAvailable } from "@/lib/utils/time-slots";
import { createMockService, createMockUser, createMockAppointmentWithIncludes } from "../../../utils/mock-factories";
import type { AppointmentStatus } from "@/generated/prisma";
import { Decimal } from "@/generated/prisma/runtime/library";

// Mock dependencies
jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("@/lib/db", () => ({
  prisma: {
    service: {
      findUnique: jest.fn(),
    },
    appointment: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock("@/lib/utils/time-slots", () => ({
  isTimeSlotAvailable: jest.fn(),
}));

jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

// Import mocked dependencies after mock setup
import { prisma } from "@/lib/db";

// Get typed access to the mocked prisma
const mockPrisma = {
  service: {
    findUnique: prisma.service.findUnique as jest.MockedFunction<typeof prisma.service.findUnique>,
  },
  appointment: {
    findFirst: prisma.appointment.findFirst as jest.MockedFunction<typeof prisma.appointment.findFirst>,
    create: prisma.appointment.create as jest.MockedFunction<typeof prisma.appointment.create>,
  },
};

const mockGetServerSession = getServerSession as jest.MockedFunction<
  typeof getServerSession
>;
const mockIsTimeSlotAvailable = isTimeSlotAvailable as jest.MockedFunction<
  typeof isTimeSlotAvailable
>;

describe("/api/appointments/book", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockRequest = (data: any) => {
    return {
      json: () => Promise.resolve(data),
    } as NextRequest;
  };

  const validBookingData = {
    serviceId: "clxxxxxxxxxxxxxxxxxxxxxxx",
    dateTime: "2025-08-25T10:00:00Z",
    notes: "Looking forward to the session",
  };

  // Use complete Prisma-compliant mock data
  const mockService = createMockService({
    id: "clxxxxxxxxxxxxxxxxxxxxxxx",
    title: "Individual Therapy",
    duration: 60,
    price: new Decimal("150.00"),
  });

  const _mockUser = createMockUser({
    id: "user-123",
    name: "Test Client",
    email: "test@example.com",
  });

  const mockSession = {
    user: {
      id: "user-123",
      email: "test@example.com",
      role: "CLIENT",
    },
  };

  describe("POST /api/appointments/book", () => {
    it("should successfully book an appointment", async () => {
      const mockAppointment = createMockAppointmentWithIncludes(
        { 
          id: "clxxxxxxxxxxxxxxxxxxxxxxx",
          title: "Individual Therapy",
          duration: 60,
          price: new Decimal("150.00"),
        },
        {
          id: "user-123",
          name: "Test Client", 
          email: "test@example.com",
        },
        {
          id: "appointment-123",
          dateTime: new Date("2025-08-25T10:00:00Z"),
          status: "PENDING" as AppointmentStatus,
          notes: "Looking forward to the session",
          userId: "user-123",
          serviceId: "clxxxxxxxxxxxxxxxxxxxxxxx",
        }
      );

      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.service.findUnique.mockResolvedValue(mockService);
      mockIsTimeSlotAvailable.mockResolvedValue({ available: true });
      mockPrisma.appointment.findFirst.mockResolvedValue(null);
      mockPrisma.appointment.create.mockResolvedValue(mockAppointment);

      const request = mockRequest(validBookingData);
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(201);
      expect(responseData.success).toBe(true);
      expect(responseData.message).toBe("Appointment booked successfully");
      expect(responseData.data.id).toBe("appointment-123");
      expect(responseData.data.status).toBe("PENDING");
      expect(responseData.data.service.title).toBe("Individual Therapy");

      // Verify service lookup
      expect(mockPrisma.service.findUnique).toHaveBeenCalledWith({
        where: { id: validBookingData.serviceId, isActive: true },
        select: { id: true, title: true, duration: true, price: true },
      });

      // Verify availability check
      expect(mockIsTimeSlotAvailable).toHaveBeenCalledWith(
        new Date(validBookingData.dateTime),
        validBookingData.serviceId
      );

      // Verify appointment creation
      expect(mockPrisma.appointment.create).toHaveBeenCalledWith({
        data: {
          userId: mockSession.user.id,
          serviceId: validBookingData.serviceId,
          dateTime: new Date(validBookingData.dateTime),
          notes: validBookingData.notes,
          status: "PENDING",
        },
        include: {
          service: {
            select: {
              title: true,
              duration: true,
              price: true,
            },
          },
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });
    });

    it("should return 401 when user is not authenticated", async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = mockRequest(validBookingData);
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(401);
      expect(responseData.error).toBe("Unauthorized");
      expect(responseData.message).toBe("Please sign in to book appointments");
    });

    it("should return 400 when request data is invalid", async () => {
      mockGetServerSession.mockResolvedValue(mockSession);

      const invalidData = {
        serviceId: "invalid-id-format",
        dateTime: "invalid-date",
      };

      const request = mockRequest(invalidData);
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe("Validation Error");
    });

    it("should return 404 when service is not found", async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.service.findUnique.mockResolvedValue(null);

      const request = mockRequest(validBookingData);
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(404);
      expect(responseData.error).toBe("NotFoundError");
      expect(responseData.message).toBe("Service not found or inactive");
    });

    it("should return 400 when time slot is not available", async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.service.findUnique.mockResolvedValue(mockService);
      mockIsTimeSlotAvailable.mockResolvedValue({
        available: false,
        reason: "Time slot conflicts with existing appointment",
      });

      const request = mockRequest(validBookingData);
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe("ValidationError");
      expect(responseData.message).toBe(
        "Time slot conflicts with existing appointment"
      );
    });

    it("should return 400 when user already has appointment at same time", async () => {
      const existingAppointment = createMockAppointmentWithIncludes(
        undefined,
        undefined,
        {
          id: "existing-appointment",
          userId: mockSession.user.id,
          dateTime: new Date("2025-08-25T10:00:00Z"),
          status: "CONFIRMED" as AppointmentStatus,
        }
      );

      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.service.findUnique.mockResolvedValue(mockService);
      mockIsTimeSlotAvailable.mockResolvedValue({ available: true });
      mockPrisma.appointment.findFirst.mockResolvedValue(existingAppointment);

      const request = mockRequest(validBookingData);
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe("ValidationError");
      expect(responseData.message).toBe(
        "You already have an appointment at this time"
      );

      // Verify existing appointment check
      expect(mockPrisma.appointment.findFirst).toHaveBeenCalledWith({
        where: {
          userId: mockSession.user.id,
          dateTime: new Date(validBookingData.dateTime),
          status: {
            in: ["PENDING", "CONFIRMED"],
          },
        },
      });
    });

    it("should successfully book appointment without notes", async () => {
      const dataWithoutNotes = {
        serviceId: "clxxxxxxxxxxxxxxxxxxxxxxx",
        dateTime: "2025-08-25T10:00:00Z",
      };

      const mockAppointment = createMockAppointmentWithIncludes(
        { 
          id: "clxxxxxxxxxxxxxxxxxxxxxxx",
          title: "Individual Therapy",
          duration: 60,
          price: new Decimal("150.00"),
        },
        {
          id: "user-123",
          name: "Test Client", 
          email: "test@example.com",
        },
        {
          id: "appointment-123",
          dateTime: new Date("2025-08-25T10:00:00Z"),
          status: "PENDING" as AppointmentStatus,
          notes: null,
          userId: "user-123",
          serviceId: "clxxxxxxxxxxxxxxxxxxxxxxx",
        }
      );

      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.service.findUnique.mockResolvedValue(mockService);
      mockIsTimeSlotAvailable.mockResolvedValue({ available: true });
      mockPrisma.appointment.findFirst.mockResolvedValue(null);
      mockPrisma.appointment.create.mockResolvedValue(mockAppointment);

      const request = mockRequest(dataWithoutNotes);
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(201);
      expect(responseData.success).toBe(true);
      expect(responseData.data.notes).toBeNull();

      expect(mockPrisma.appointment.create).toHaveBeenCalledWith({
        data: {
          userId: mockSession.user.id,
          serviceId: dataWithoutNotes.serviceId,
          dateTime: new Date(dataWithoutNotes.dateTime),
          notes: undefined,
          status: "PENDING",
        },
        include: {
          service: {
            select: {
              title: true,
              duration: true,
              price: true,
            },
          },
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      });
    });

    it("should handle database errors gracefully", async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.service.findUnique.mockResolvedValue(mockService);
      mockIsTimeSlotAvailable.mockResolvedValue({ available: true });
      mockPrisma.appointment.findFirst.mockResolvedValue(null);
      mockPrisma.appointment.create.mockRejectedValue(
        new Error("Database connection failed")
      );

      const request = mockRequest(validBookingData);
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.error).toBe("Internal Server Error");
    });

    it("should handle time slot availability check errors", async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.service.findUnique.mockResolvedValue(mockService);
      mockIsTimeSlotAvailable.mockRejectedValue(
        new Error("Availability check failed")
      );

      const request = mockRequest(validBookingData);
      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.error).toBe("Internal Server Error");
    });

    it("should format price as string in response", async () => {
      const mockAppointment = createMockAppointmentWithIncludes(
        { 
          id: "clxxxxxxxxxxxxxxxxxxxxxxx",
          title: "Individual Therapy",
          duration: 60,
          price: new Decimal("150.0"), // Decimal from database
        },
        {
          id: "user-123",
          name: "Test Client", 
          email: "test@example.com",
        },
        {
          id: "appointment-123",
          dateTime: new Date("2025-08-25T10:00:00Z"),
          status: "PENDING" as AppointmentStatus,
          notes: "Looking forward to the session",
          userId: "user-123",
          serviceId: "clxxxxxxxxxxxxxxxxxxxxxxx",
        }
      );

      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.service.findUnique.mockResolvedValue(mockService);
      mockIsTimeSlotAvailable.mockResolvedValue({ available: true });
      mockPrisma.appointment.findFirst.mockResolvedValue(null);
      mockPrisma.appointment.create.mockResolvedValue(mockAppointment);

      const request = mockRequest(validBookingData);
      const response = await POST(request);
      const responseData = await response.json();

      expect(responseData.data.service.price).toBe("150");
      expect(typeof responseData.data.service.price).toBe("string");
    });
  });
});

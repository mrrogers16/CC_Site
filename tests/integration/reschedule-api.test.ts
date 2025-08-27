import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { PUT } from "@/app/api/appointments/[id]/reschedule/route";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

// Mock dependencies
jest.mock("next-auth");
jest.mock("@/lib/db");
jest.mock("@/lib/logger");

const mockGetServerSession = getServerSession as jest.MockedFunction<
  typeof getServerSession
>;
const mockLogger = logger as jest.Mocked<typeof logger>;

// Create properly typed mock Prisma
const mockPrisma = {
  appointment: {
    findUnique: jest.fn(),
    update: jest.fn(),
    findFirst: jest.fn(),
  },
} as any;

const mockSession = {
  user: {
    id: "test-user-id",
    email: "test@example.com",
    name: "Test User",
  },
};

const mockAppointment = {
  id: "appointment-123",
  userId: "test-user-id",
  serviceId: "service-123",
  dateTime: new Date("2025-09-15T14:00:00.000Z"), // Future appointment date
  status: "CONFIRMED" as const,
  notes: "Test appointment",
  service: {
    id: "service-123",
    title: "Individual Therapy",
    duration: 60,
    price: 150,
  },
};

// Mock current time for consistent testing
const mockCurrentTime = new Date("2025-08-27T10:00:00.000Z"); // Use current environment date
jest.useFakeTimers();
jest.setSystemTime(mockCurrentTime);

describe("/api/appointments/[id]/reschedule", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup NextAuth mock
    mockGetServerSession.mockResolvedValue(mockSession);

    // Setup Prisma mock
    (prisma as any).appointment = mockPrisma.appointment;
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe("PUT", () => {
    it("should successfully reschedule appointment with valid data", async () => {
      // Mock the appointment lookup (API uses findFirst, not findUnique)
      mockPrisma.appointment.findFirst.mockResolvedValueOnce(mockAppointment);
      // Mock the conflict check (second call to findFirst should return null - no conflicts)
      mockPrisma.appointment.findFirst.mockResolvedValueOnce(null);
      mockPrisma.appointment.update.mockResolvedValue({
        ...mockAppointment,
        dateTime: new Date("2025-09-30T14:00:00.000Z"),
        notes: "Test appointment\n\nRescheduled: Client requested reschedule",
        createdAt: new Date("2025-09-26T09:00:00.000Z"),
        updatedAt: new Date("2025-09-26T10:00:00.000Z"),
        service: {
          ...mockAppointment.service,
          price: 150, // Ensure it's a number that can have toString() called
        },
      });

      const request = new NextRequest(
        "http://localhost:3000/api/appointments/appointment-123/reschedule",
        {
          method: "PUT",
          body: JSON.stringify({
            newDateTime: "2025-09-30T14:00:00.000Z", // 2 PM UTC - weekday business hours
            reason: "Client requested reschedule",
          }),
        }
      );

      const params = Promise.resolve({ id: "appointment-123" });
      const response = await PUT(request, { params });
      const data = await response.json();

      // Debug: log the response to see what's failing
      if (response.status !== 200) {
        console.log("Response status:", response.status);
        console.log("Response data:", data);
      }
      
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe("Appointment rescheduled successfully");

      expect(mockPrisma.appointment.update).toHaveBeenCalledWith({
        where: { id: "appointment-123" },
        data: {
          dateTime: new Date("2025-09-30T14:00:00.000Z"),
          notes: "Test appointment\n\nRescheduled: Client requested reschedule",
          updatedAt: expect.any(Date),
        },
        include: {
          service: {
            select: {
              title: true,
              duration: true,
              price: true,
            },
          },
        },
      });
    });

    it("should return 401 when not authenticated", async () => {
      // Override the default mock for this test
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost:3000/api/appointments/appointment-123/reschedule",
        {
          method: "PUT",
          body: JSON.stringify({
            newDateTime: "2025-09-30T10:00:00.000Z",
            reason: "Client requested reschedule",
          }),
        }
      );

      const params = Promise.resolve({ id: "appointment-123" });
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 400 for invalid request data", async () => {

      const request = new NextRequest(
        "http://localhost:3000/api/appointments/appointment-123/reschedule",
        {
          method: "PUT",
          body: JSON.stringify({
            newDateTime: "invalid-date",
            reason: "Client requested reschedule",
          }),
        }
      );

      const params = Promise.resolve({ id: "appointment-123" });
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Validation Error");
    });

    it("should return 404 when appointment not found", async () => {
      mockPrisma.appointment.findFirst.mockResolvedValueOnce(null);

      const request = new NextRequest(
        "http://localhost:3000/api/appointments/appointment-123/reschedule",
        {
          method: "PUT",
          body: JSON.stringify({
            newDateTime: "2025-09-30T10:00:00.000Z",
            reason: "Client requested reschedule",
          }),
        }
      );

      const params = Promise.resolve({ id: "appointment-123" });
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("NotFoundError");
    });

    it("should return 404 when user doesn't own appointment", async () => {
      // Override the default mock for this test with different user
      mockGetServerSession.mockResolvedValue({
        ...mockSession,
        user: { ...mockSession.user, id: "different-user-id" },
      });
      // findFirst with different userId will return null (not found)
      mockPrisma.appointment.findFirst.mockResolvedValueOnce(null);

      const request = new NextRequest(
        "http://localhost:3000/api/appointments/appointment-123/reschedule",
        {
          method: "PUT",
          body: JSON.stringify({
            newDateTime: "2025-09-30T10:00:00.000Z",
            reason: "Client requested reschedule",
          }),
        }
      );

      const params = Promise.resolve({ id: "appointment-123" });
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("NotFoundError");
      expect(data.message).toBe("Appointment not found");
    });

    it("should prevent rescheduling cancelled appointments", async () => {
      // Mock the appointment lookup (first call) - should fail before conflict check
      mockPrisma.appointment.findFirst.mockResolvedValueOnce({
        ...mockAppointment,
        status: "CANCELLED",
      });

      const request = new NextRequest(
        "http://localhost:3000/api/appointments/appointment-123/reschedule",
        {
          method: "PUT",
          body: JSON.stringify({
            newDateTime: "2025-09-30T10:00:00.000Z",
            reason: "Client requested reschedule",
          }),
        }
      );

      const params = Promise.resolve({ id: "appointment-123" });
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("ValidationError");
      expect(data.message).toBe("This appointment cannot be rescheduled");
    });

    it("should prevent rescheduling within 24 hours", async () => {
      // Mock the appointment lookup (first call) - should fail before conflict check
      mockPrisma.appointment.findFirst.mockResolvedValueOnce({
        ...mockAppointment,
        dateTime: new Date("2025-08-28T10:00:00.000Z"), // Less than 24 hours away
      });

      const request = new NextRequest(
        "http://localhost:3000/api/appointments/appointment-123/reschedule",
        {
          method: "PUT",
          body: JSON.stringify({
            newDateTime: "2025-09-30T10:00:00.000Z",
            reason: "Client requested reschedule",
          }),
        }
      );

      const params = Promise.resolve({ id: "appointment-123" });
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("ValidationError");
      expect(data.message).toBe("This appointment cannot be rescheduled");
    });

    it("should prevent rescheduling to past dates", async () => {
      // Mock the appointment lookup (first call)
      mockPrisma.appointment.findFirst.mockResolvedValueOnce(mockAppointment);
      // Mock the conflict check (second call should return null - no conflicts)
      mockPrisma.appointment.findFirst.mockResolvedValueOnce(null);

      const request = new NextRequest(
        "http://localhost:3000/api/appointments/appointment-123/reschedule",
        {
          method: "PUT",
          body: JSON.stringify({
            newDateTime: "2025-08-25T10:00:00.000Z", // Past date relative to mock current time
            reason: "Client requested reschedule",
          }),
        }
      );

      const params = Promise.resolve({ id: "appointment-123" });
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("ValidationError");
      expect(data.message).toBe("Cannot reschedule to a past date or time");
    });

    it("should prevent rescheduling outside business hours", async () => {
      // Mock the appointment lookup (first call)
      mockPrisma.appointment.findFirst
        .mockResolvedValueOnce(mockAppointment)
        // Mock the conflict check (second call should return null - no conflicts)  
        .mockResolvedValueOnce(null);

      const request = new NextRequest(
        "http://localhost:3000/api/appointments/appointment-123/reschedule",
        {
          method: "PUT",
          body: JSON.stringify({
            newDateTime: "2025-09-15T20:00:00.000Z", // 8 PM - outside business hours
            reason: "Client requested reschedule",
          }),
        }
      );

      const params = Promise.resolve({ id: "appointment-123" });
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("ValidationError");
      expect(data.message).toBe("Weekday appointments are only available from 9 AM to 5 PM");
    });

    it("should prevent rescheduling to weekends", async () => {
      // Mock the appointment lookup (first call)
      mockPrisma.appointment.findFirst
        .mockResolvedValueOnce(mockAppointment)
        // Mock the conflict check (second call should return null - no conflicts)
        .mockResolvedValueOnce(null);

      const request = new NextRequest(
        "http://localhost:3000/api/appointments/appointment-123/reschedule",
        {
          method: "PUT",
          body: JSON.stringify({
            newDateTime: "2025-08-31T10:00:00.000Z", // Sunday (August 31, 2025 is a Sunday)
            reason: "Client requested reschedule",
          }),
        }
      );

      const params = Promise.resolve({ id: "appointment-123" });
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("ValidationError");
      expect(data.message).toBe("We are closed on Sundays");
    });

    it("should prevent rescheduling to conflicting time slots", async () => {
      // Mock the appointment lookup (first call to findFirst returns the appointment)
      mockPrisma.appointment.findFirst
        .mockResolvedValueOnce(mockAppointment)
        // Mock the conflict check (second call to findFirst should return a conflict)
        .mockResolvedValueOnce({
          id: "conflicting-appointment",
          dateTime: new Date("2025-09-30T10:00:00.000Z"),
          userId: "test-user-id", // Same user to trigger conflict
        });

      const request = new NextRequest(
        "http://localhost:3000/api/appointments/appointment-123/reschedule",
        {
          method: "PUT",
          body: JSON.stringify({
            newDateTime: "2025-09-30T10:00:00.000Z",
            reason: "Client requested reschedule",
          }),
        }
      );

      const params = Promise.resolve({ id: "appointment-123" });
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe("ConflictError");
      expect(data.message).toBe("You already have an appointment at this time");
    });

    it("should validate required fields", async () => {

      const request = new NextRequest(
        "http://localhost:3000/api/appointments/appointment-123/reschedule",
        {
          method: "PUT",
          body: JSON.stringify({
            // Missing newDateTime
            reason: "Client requested reschedule",
          }),
        }
      );

      const params = Promise.resolve({ id: "appointment-123" });
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Validation Error");
    });

    it("should handle database errors gracefully", async () => {
      mockPrisma.appointment.findFirst.mockRejectedValueOnce(
        new Error("Database error")
      );

      const request = new NextRequest(
        "http://localhost:3000/api/appointments/appointment-123/reschedule",
        {
          method: "PUT",
          body: JSON.stringify({
            newDateTime: "2025-09-30T10:00:00.000Z",
            reason: "Client requested reschedule",
          }),
        }
      );

      const params = Promise.resolve({ id: "appointment-123" });
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal Server Error");
    });

    it("should include service information in successful response", async () => {
      const updatedAppointment = {
        ...mockAppointment,
        dateTime: new Date("2025-09-30T10:00:00.000Z"),
        createdAt: new Date("2025-09-26T09:00:00.000Z"),
        updatedAt: new Date("2025-09-26T10:00:00.000Z"),
      };

      // Mock the appointment lookup (first call)
      mockPrisma.appointment.findFirst.mockResolvedValueOnce(mockAppointment);
      // Mock the conflict check (second call should return null - no conflicts)
      mockPrisma.appointment.findFirst.mockResolvedValueOnce(null);
      mockPrisma.appointment.update.mockResolvedValue(updatedAppointment);

      const request = new NextRequest(
        "http://localhost:3000/api/appointments/appointment-123/reschedule",
        {
          method: "PUT",
          body: JSON.stringify({
            newDateTime: "2025-09-30T10:00:00.000Z",
            reason: "Client requested reschedule",
          }),
        }
      );

      const params = Promise.resolve({ id: "appointment-123" });
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data).toEqual({
        id: updatedAppointment.id,
        dateTime: updatedAppointment.dateTime.toISOString(),
        status: updatedAppointment.status,
        notes: updatedAppointment.notes,
        service: {
          title: updatedAppointment.service.title,
          duration: updatedAppointment.service.duration,
          price: updatedAppointment.service.price.toString(),
        },
        createdAt: updatedAppointment.createdAt.toISOString(),
        updatedAt: updatedAppointment.updatedAt.toISOString(),
      });
    });
  });
});

import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { jest } from "@jest/globals";
import { POST } from "@/app/api/admin/appointments/[id]/reschedule/route";
import { prisma } from "@/lib/db";
import { isTimeSlotAvailable } from "@/lib/utils/time-slots";

// Mock dependencies
jest.mock("next-auth");
jest.mock("@/lib/db");
jest.mock("@/lib/utils/time-slots");
jest.mock("@/lib/logger");

const mockGetServerSession = getServerSession as jest.MockedFunction<
  typeof getServerSession
>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockIsTimeSlotAvailable = isTimeSlotAvailable as jest.MockedFunction<
  typeof isTimeSlotAvailable
>;

describe("/api/admin/appointments/[id]/reschedule", () => {
  const mockSession = {
    user: {
      id: "admin-1",
      email: "admin@test.com",
      name: "Admin User",
      role: "ADMIN" as const,
    },
  };

  const mockAppointment = {
    id: "appointment-1",
    dateTime: new Date("2025-08-28T10:00:00Z"),
    status: "CONFIRMED",
    serviceId: "service-1",
    user: {
      id: "user-1",
      name: "John Doe",
      email: "john@test.com",
      phone: "+1234567890",
    },
    service: {
      id: "service-1",
      title: "Individual Therapy",
      description: "Individual therapy session",
      duration: 60,
      price: 150,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.$transaction = jest.fn();
  });

  describe("POST", () => {
    it("successfully reschedules an appointment", async () => {
      const requestBody = {
        newDateTime: "2025-08-29T14:00:00Z",
        reason: "Client requested different time",
      };

      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.appointment.findUnique.mockResolvedValue(mockAppointment);
      mockIsTimeSlotAvailable.mockResolvedValue({
        available: true,
        reason: null,
      });

      const mockHistoryRecord = {
        id: "history-1",
        appointmentId: "appointment-1",
        action: "RESCHEDULED",
        oldDateTime: mockAppointment.dateTime,
        newDateTime: new Date("2025-08-29T14:00:00Z"),
        reason: "Client requested different time",
        adminId: "admin-1",
        adminName: "Admin User",
        createdAt: new Date(),
      };

      const mockUpdatedAppointment = {
        ...mockAppointment,
        dateTime: new Date("2025-08-29T14:00:00Z"),
        status: "PENDING",
        updatedAt: new Date(),
      };

      (mockPrisma.$transaction as jest.Mock).mockResolvedValue({
        historyRecord: mockHistoryRecord,
        updatedAppointment: mockUpdatedAppointment,
      });

      const request = new NextRequest(
        "http://localhost/api/admin/appointments/appointment-1/reschedule",
        {
          method: "POST",
          body: JSON.stringify(requestBody),
        }
      );

      const params = Promise.resolve({ id: "appointment-1" });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe("Appointment rescheduled successfully");
      expect(data.appointment.dateTime).toBe("2025-08-29T14:00:00.000Z");
      expect(data.historyRecord).toBeDefined();
    });

    it("requires admin authentication", async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost/api/admin/appointments/appointment-1/reschedule",
        {
          method: "POST",
          body: JSON.stringify({ newDateTime: "2025-08-29T14:00:00Z" }),
        }
      );

      const params = Promise.resolve({ id: "appointment-1" });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Admin access required");
    });

    it("rejects non-admin users", async () => {
      const clientSession = {
        ...mockSession,
        user: { ...mockSession.user, role: "CLIENT" as const },
      };

      mockGetServerSession.mockResolvedValue(clientSession);

      const request = new NextRequest(
        "http://localhost/api/admin/appointments/appointment-1/reschedule",
        {
          method: "POST",
          body: JSON.stringify({ newDateTime: "2025-08-29T14:00:00Z" }),
        }
      );

      const params = Promise.resolve({ id: "appointment-1" });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Admin access required");
    });

    it("returns 404 for non-existent appointment", async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.appointment.findUnique.mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost/api/admin/appointments/nonexistent/reschedule",
        {
          method: "POST",
          body: JSON.stringify({ newDateTime: "2025-08-29T14:00:00Z" }),
        }
      );

      const params = Promise.resolve({ id: "nonexistent" });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Appointment not found");
    });

    it("prevents rescheduling completed appointments", async () => {
      const completedAppointment = {
        ...mockAppointment,
        status: "COMPLETED",
      };

      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.appointment.findUnique.mockResolvedValue(completedAppointment);

      const request = new NextRequest(
        "http://localhost/api/admin/appointments/appointment-1/reschedule",
        {
          method: "POST",
          body: JSON.stringify({ newDateTime: "2025-08-29T14:00:00Z" }),
        }
      );

      const params = Promise.resolve({ id: "appointment-1" });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe(
        "Cannot reschedule completed, cancelled, or no-show appointments"
      );
    });

    it("prevents rescheduling cancelled appointments", async () => {
      const cancelledAppointment = {
        ...mockAppointment,
        status: "CANCELLED",
      };

      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.appointment.findUnique.mockResolvedValue(cancelledAppointment);

      const request = new NextRequest(
        "http://localhost/api/admin/appointments/appointment-1/reschedule",
        {
          method: "POST",
          body: JSON.stringify({ newDateTime: "2025-08-29T14:00:00Z" }),
        }
      );

      const params = Promise.resolve({ id: "appointment-1" });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe(
        "Cannot reschedule completed, cancelled, or no-show appointments"
      );
    });

    it("prevents rescheduling no-show appointments", async () => {
      const noShowAppointment = {
        ...mockAppointment,
        status: "NO_SHOW",
      };

      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.appointment.findUnique.mockResolvedValue(noShowAppointment);

      const request = new NextRequest(
        "http://localhost/api/admin/appointments/appointment-1/reschedule",
        {
          method: "POST",
          body: JSON.stringify({ newDateTime: "2025-08-29T14:00:00Z" }),
        }
      );

      const params = Promise.resolve({ id: "appointment-1" });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe(
        "Cannot reschedule completed, cancelled, or no-show appointments"
      );
    });

    it("rejects unavailable time slots", async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.appointment.findUnique.mockResolvedValue(mockAppointment);
      mockIsTimeSlotAvailable.mockResolvedValue({
        available: false,
        reason: "Time slot conflicts with another appointment",
      });

      const request = new NextRequest(
        "http://localhost/api/admin/appointments/appointment-1/reschedule",
        {
          method: "POST",
          body: JSON.stringify({ newDateTime: "2025-08-29T14:00:00Z" }),
        }
      );

      const params = Promise.resolve({ id: "appointment-1" });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe(
        "New time slot is not available: Time slot conflicts with another appointment"
      );
    });

    it("validates request body schema", async () => {
      mockGetServerSession.mockResolvedValue(mockSession);

      const request = new NextRequest(
        "http://localhost/api/admin/appointments/appointment-1/reschedule",
        {
          method: "POST",
          body: JSON.stringify({ invalidField: "invalid" }),
        }
      );

      const params = Promise.resolve({ id: "appointment-1" });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Validation Error");
      expect(data.details).toContain("newDateTime");
    });

    it("validates newDateTime format", async () => {
      mockGetServerSession.mockResolvedValue(mockSession);

      const request = new NextRequest(
        "http://localhost/api/admin/appointments/appointment-1/reschedule",
        {
          method: "POST",
          body: JSON.stringify({ newDateTime: "invalid-date" }),
        }
      );

      const params = Promise.resolve({ id: "appointment-1" });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Validation Error");
    });

    it("handles optional reason field", async () => {
      const requestBody = {
        newDateTime: "2025-08-29T14:00:00Z",
        // No reason provided
      };

      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.appointment.findUnique.mockResolvedValue(mockAppointment);
      mockIsTimeSlotAvailable.mockResolvedValue({
        available: true,
        reason: null,
      });

      const mockHistoryRecord = {
        id: "history-1",
        appointmentId: "appointment-1",
        action: "RESCHEDULED",
        oldDateTime: mockAppointment.dateTime,
        newDateTime: new Date("2025-08-29T14:00:00Z"),
        adminId: "admin-1",
        adminName: "Admin User",
        createdAt: new Date(),
      };

      const mockUpdatedAppointment = {
        ...mockAppointment,
        dateTime: new Date("2025-08-29T14:00:00Z"),
        status: "PENDING",
      };

      (mockPrisma.$transaction as jest.Mock).mockResolvedValue({
        historyRecord: mockHistoryRecord,
        updatedAppointment: mockUpdatedAppointment,
      });

      const request = new NextRequest(
        "http://localhost/api/admin/appointments/appointment-1/reschedule",
        {
          method: "POST",
          body: JSON.stringify(requestBody),
        }
      );

      const params = Promise.resolve({ id: "appointment-1" });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("trims and validates reason length", async () => {
      const longReason = "a".repeat(501); // Too long

      mockGetServerSession.mockResolvedValue(mockSession);

      const request = new NextRequest(
        "http://localhost/api/admin/appointments/appointment-1/reschedule",
        {
          method: "POST",
          body: JSON.stringify({
            newDateTime: "2025-08-29T14:00:00Z",
            reason: longReason,
          }),
        }
      );

      const params = Promise.resolve({ id: "appointment-1" });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Validation Error");
    });

    it("handles database transaction errors", async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.appointment.findUnique.mockResolvedValue(mockAppointment);
      mockIsTimeSlotAvailable.mockResolvedValue({
        available: true,
        reason: null,
      });
      (mockPrisma.$transaction as jest.Mock).mockRejectedValue(
        new Error("Database error")
      );

      const request = new NextRequest(
        "http://localhost/api/admin/appointments/appointment-1/reschedule",
        {
          method: "POST",
          body: JSON.stringify({ newDateTime: "2025-08-29T14:00:00Z" }),
        }
      );

      const params = Promise.resolve({ id: "appointment-1" });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal Server Error");
    });

    it("resets status to PENDING after reschedule", async () => {
      const confirmedAppointment = {
        ...mockAppointment,
        status: "CONFIRMED",
      };

      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.appointment.findUnique.mockResolvedValue(confirmedAppointment);
      mockIsTimeSlotAvailable.mockResolvedValue({
        available: true,
        reason: null,
      });

      const mockUpdatedAppointment = {
        ...confirmedAppointment,
        dateTime: new Date("2025-08-29T14:00:00Z"),
        status: "PENDING", // Should be reset to PENDING
      };

      (mockPrisma.$transaction as jest.Mock).mockResolvedValue({
        historyRecord: { id: "history-1" },
        updatedAppointment: mockUpdatedAppointment,
      });

      const request = new NextRequest(
        "http://localhost/api/admin/appointments/appointment-1/reschedule",
        {
          method: "POST",
          body: JSON.stringify({ newDateTime: "2025-08-29T14:00:00Z" }),
        }
      );

      const params = Promise.resolve({ id: "appointment-1" });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.appointment.status).toBe("PENDING");
    });

    it("excludes current appointment from availability check", async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.appointment.findUnique.mockResolvedValue(mockAppointment);

      const request = new NextRequest(
        "http://localhost/api/admin/appointments/appointment-1/reschedule",
        {
          method: "POST",
          body: JSON.stringify({ newDateTime: "2025-08-29T14:00:00Z" }),
        }
      );

      const params = Promise.resolve({ id: "appointment-1" });
      await POST(request, { params });

      // Verify that isTimeSlotAvailable was called with the exclusion
      expect(mockIsTimeSlotAvailable).toHaveBeenCalledWith(
        new Date("2025-08-29T14:00:00Z"),
        "service-1",
        "appointment-1"
      );
    });

    it("converts price to number in response", async () => {
      const appointmentWithDecimalPrice = {
        ...mockAppointment,
        service: {
          ...mockAppointment.service,
          price: 150.5, // Decimal price
        },
      };

      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.appointment.findUnique.mockResolvedValue(
        appointmentWithDecimalPrice
      );
      mockIsTimeSlotAvailable.mockResolvedValue({
        available: true,
        reason: null,
      });

      (mockPrisma.$transaction as jest.Mock).mockResolvedValue({
        historyRecord: { id: "history-1" },
        updatedAppointment: appointmentWithDecimalPrice,
      });

      const request = new NextRequest(
        "http://localhost/api/admin/appointments/appointment-1/reschedule",
        {
          method: "POST",
          body: JSON.stringify({ newDateTime: "2025-08-29T14:00:00Z" }),
        }
      );

      const params = Promise.resolve({ id: "appointment-1" });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(data.appointment.service.price).toBe(150.5);
      expect(typeof data.appointment.service.price).toBe("number");
    });
  });
});

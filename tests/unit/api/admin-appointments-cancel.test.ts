import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { jest } from "@jest/globals";
import { POST } from "@/app/api/admin/appointments/[id]/cancel/route";
import { prisma } from "@/lib/db";
import { sendAppointmentCancellation } from "@/lib/email";

// Mock dependencies
jest.mock("next-auth");
jest.mock("@/lib/db");
jest.mock("@/lib/email");
jest.mock("@/lib/logger");

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockSendAppointmentCancellation = sendAppointmentCancellation as jest.MockedFunction<typeof sendAppointmentCancellation>;

describe("/api/admin/appointments/[id]/cancel", () => {
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
    mockSendAppointmentCancellation.mockResolvedValue({
      success: true,
      messageId: "msg-123",
    });
  });

  describe("POST", () => {
    it("successfully cancels an appointment with notification", async () => {
      const requestBody = {
        reason: "Emergency cancellation",
        sendNotification: true,
        cancellationPolicy: "24-hour cancellation policy",
      };

      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.appointment.findUnique.mockResolvedValue(mockAppointment);

      const mockHistoryRecord = {
        id: "history-1",
        appointmentId: "appointment-1",
        action: "CANCELLED",
        oldStatus: "CONFIRMED",
        newStatus: "CANCELLED",
        reason: "Emergency cancellation",
        adminId: "admin-1",
        adminName: "Admin User",
        createdAt: new Date(),
      };

      const mockCancelledAppointment = {
        ...mockAppointment,
        status: "CANCELLED",
        cancellationReason: "Emergency cancellation",
        updatedAt: new Date(),
      };

      (mockPrisma.$transaction as jest.Mock).mockResolvedValue({
        historyRecord: mockHistoryRecord,
        cancelledAppointment: mockCancelledAppointment,
      });

      const request = new NextRequest("http://localhost/api/admin/appointments/appointment-1/cancel", {
        method: "POST",
        body: JSON.stringify(requestBody),
      });

      const params = Promise.resolve({ id: "appointment-1" });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe("Appointment cancelled successfully");
      expect(data.appointment.status).toBe("CANCELLED");
      expect(data.notificationSent).toBe(true);
      expect(data.historyRecord).toBeDefined();
    });

    it("cancels appointment without sending notification", async () => {
      const requestBody = {
        reason: "Emergency cancellation",
        sendNotification: false,
      };

      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.appointment.findUnique.mockResolvedValue(mockAppointment);

      const mockCancelledAppointment = {
        ...mockAppointment,
        status: "CANCELLED",
        cancellationReason: "Emergency cancellation",
      };

      (mockPrisma.$transaction as jest.Mock).mockResolvedValue({
        historyRecord: { id: "history-1" },
        cancelledAppointment: mockCancelledAppointment,
      });

      const request = new NextRequest("http://localhost/api/admin/appointments/appointment-1/cancel", {
        method: "POST",
        body: JSON.stringify(requestBody),
      });

      const params = Promise.resolve({ id: "appointment-1" });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.notificationSent).toBe(false);
      expect(mockSendAppointmentCancellation).not.toHaveBeenCalled();
    });

    it("requires admin authentication", async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/admin/appointments/appointment-1/cancel", {
        method: "POST",
        body: JSON.stringify({ reason: "test" }),
      });

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

      const request = new NextRequest("http://localhost/api/admin/appointments/appointment-1/cancel", {
        method: "POST",
        body: JSON.stringify({ reason: "test" }),
      });

      const params = Promise.resolve({ id: "appointment-1" });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Admin access required");
    });

    it("returns 404 for non-existent appointment", async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.appointment.findUnique.mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/admin/appointments/nonexistent/cancel", {
        method: "POST",
        body: JSON.stringify({ reason: "test" }),
      });

      const params = Promise.resolve({ id: "nonexistent" });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Appointment not found");
    });

    it("prevents cancelling already cancelled appointments", async () => {
      const cancelledAppointment = {
        ...mockAppointment,
        status: "CANCELLED",
      };

      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.appointment.findUnique.mockResolvedValue(cancelledAppointment);

      const request = new NextRequest("http://localhost/api/admin/appointments/appointment-1/cancel", {
        method: "POST",
        body: JSON.stringify({ reason: "test" }),
      });

      const params = Promise.resolve({ id: "appointment-1" });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Appointment is already cancelled");
    });

    it("prevents cancelling completed appointments", async () => {
      const completedAppointment = {
        ...mockAppointment,
        status: "COMPLETED",
      };

      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.appointment.findUnique.mockResolvedValue(completedAppointment);

      const request = new NextRequest("http://localhost/api/admin/appointments/appointment-1/cancel", {
        method: "POST",
        body: JSON.stringify({ reason: "test" }),
      });

      const params = Promise.resolve({ id: "appointment-1" });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Cannot cancel completed or no-show appointments");
    });

    it("prevents cancelling no-show appointments", async () => {
      const noShowAppointment = {
        ...mockAppointment,
        status: "NO_SHOW",
      };

      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.appointment.findUnique.mockResolvedValue(noShowAppointment);

      const request = new NextRequest("http://localhost/api/admin/appointments/appointment-1/cancel", {
        method: "POST",
        body: JSON.stringify({ reason: "test" }),
      });

      const params = Promise.resolve({ id: "appointment-1" });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Cannot cancel completed or no-show appointments");
    });

    it("validates reason length", async () => {
      const longReason = "a".repeat(201); // Too long

      mockGetServerSession.mockResolvedValue(mockSession);

      const request = new NextRequest("http://localhost/api/admin/appointments/appointment-1/cancel", {
        method: "POST",
        body: JSON.stringify({ reason: longReason }),
      });

      const params = Promise.resolve({ id: "appointment-1" });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Validation Error");
    });

    it("trims reason text", async () => {
      const reasonWithSpaces = "  Emergency cancellation  ";

      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.appointment.findUnique.mockResolvedValue(mockAppointment);

      const mockCancelledAppointment = {
        ...mockAppointment,
        status: "CANCELLED",
        cancellationReason: "Emergency cancellation", // Should be trimmed
      };

      (mockPrisma.$transaction as jest.Mock).mockResolvedValue({
        historyRecord: {
          id: "history-1",
          reason: "Emergency cancellation",
        },
        cancelledAppointment: mockCancelledAppointment,
      });

      const request = new NextRequest("http://localhost/api/admin/appointments/appointment-1/cancel", {
        method: "POST",
        body: JSON.stringify({
          reason: reasonWithSpaces,
          sendNotification: false,
        }),
      });

      const params = Promise.resolve({ id: "appointment-1" });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.historyRecord.reason).toBe("Emergency cancellation");
    });

    it("handles email sending failures gracefully", async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.appointment.findUnique.mockResolvedValue(mockAppointment);

      const mockCancelledAppointment = {
        ...mockAppointment,
        status: "CANCELLED",
      };

      (mockPrisma.$transaction as jest.Mock).mockResolvedValue({
        historyRecord: { id: "history-1" },
        cancelledAppointment: mockCancelledAppointment,
      });

      mockSendAppointmentCancellation.mockResolvedValue({
        success: false,
        error: "Email service unavailable",
      });

      const request = new NextRequest("http://localhost/api/admin/appointments/appointment-1/cancel", {
        method: "POST",
        body: JSON.stringify({
          reason: "test",
          sendNotification: true,
        }),
      });

      const params = Promise.resolve({ id: "appointment-1" });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.notificationSent).toBe(false);
      expect(data.notificationError).toBe("Email service unavailable");
    });

    it("handles email sending exceptions", async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.appointment.findUnique.mockResolvedValue(mockAppointment);

      const mockCancelledAppointment = {
        ...mockAppointment,
        status: "CANCELLED",
      };

      (mockPrisma.$transaction as jest.Mock).mockResolvedValue({
        historyRecord: { id: "history-1" },
        cancelledAppointment: mockCancelledAppointment,
      });

      mockSendAppointmentCancellation.mockRejectedValue(new Error("Network error"));

      const request = new NextRequest("http://localhost/api/admin/appointments/appointment-1/cancel", {
        method: "POST",
        body: JSON.stringify({
          reason: "test",
          sendNotification: true,
        }),
      });

      const params = Promise.resolve({ id: "appointment-1" });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.notificationSent).toBe(false);
    });

    it("includes cancellation policy in email when provided", async () => {
      const requestBody = {
        reason: "Emergency cancellation",
        sendNotification: true,
        cancellationPolicy: "24-hour cancellation policy applies",
      };

      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.appointment.findUnique.mockResolvedValue(mockAppointment);

      const mockCancelledAppointment = {
        ...mockAppointment,
        status: "CANCELLED",
      };

      (mockPrisma.$transaction as jest.Mock).mockResolvedValue({
        historyRecord: { id: "history-1" },
        cancelledAppointment: mockCancelledAppointment,
      });

      const request = new NextRequest("http://localhost/api/admin/appointments/appointment-1/cancel", {
        method: "POST",
        body: JSON.stringify(requestBody),
      });

      const params = Promise.resolve({ id: "appointment-1" });
      await POST(request, { params });

      expect(mockSendAppointmentCancellation).toHaveBeenCalledWith(
        "john@test.com",
        "John Doe",
        mockAppointment.dateTime.toISOString(),
        {
          service: "Individual Therapy",
          duration: 60,
          price: "150",
        },
        "Emergency cancellation",
        "24-hour cancellation policy applies"
      );
    });

    it("works without reason provided", async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.appointment.findUnique.mockResolvedValue(mockAppointment);

      const mockCancelledAppointment = {
        ...mockAppointment,
        status: "CANCELLED",
      };

      (mockPrisma.$transaction as jest.Mock).mockResolvedValue({
        historyRecord: { id: "history-1" },
        cancelledAppointment: mockCancelledAppointment,
      });

      const request = new NextRequest("http://localhost/api/admin/appointments/appointment-1/cancel", {
        method: "POST",
        body: JSON.stringify({ sendNotification: false }),
      });

      const params = Promise.resolve({ id: "appointment-1" });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("defaults sendNotification to true when not specified", async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.appointment.findUnique.mockResolvedValue(mockAppointment);

      const mockCancelledAppointment = {
        ...mockAppointment,
        status: "CANCELLED",
      };

      (mockPrisma.$transaction as jest.Mock).mockResolvedValue({
        historyRecord: { id: "history-1" },
        cancelledAppointment: mockCancelledAppointment,
      });

      const request = new NextRequest("http://localhost/api/admin/appointments/appointment-1/cancel", {
        method: "POST",
        body: JSON.stringify({ reason: "test" }),
      });

      const params = Promise.resolve({ id: "appointment-1" });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockSendAppointmentCancellation).toHaveBeenCalled();
    });

    it("converts price to number in email parameters", async () => {
      const appointmentWithDecimalPrice = {
        ...mockAppointment,
        service: {
          ...mockAppointment.service,
          price: 150.75, // Decimal price
        },
      };

      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.appointment.findUnique.mockResolvedValue(appointmentWithDecimalPrice);

      const mockCancelledAppointment = {
        ...appointmentWithDecimalPrice,
        status: "CANCELLED",
      };

      (mockPrisma.$transaction as jest.Mock).mockResolvedValue({
        historyRecord: { id: "history-1" },
        cancelledAppointment: mockCancelledAppointment,
      });

      const request = new NextRequest("http://localhost/api/admin/appointments/appointment-1/cancel", {
        method: "POST",
        body: JSON.stringify({
          reason: "test",
          sendNotification: true,
        }),
      });

      const params = Promise.resolve({ id: "appointment-1" });
      await POST(request, { params });

      expect(mockSendAppointmentCancellation).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          price: "150.75", // Should be converted to string
        }),
        expect.any(String),
        undefined
      );
    });

    it("handles database transaction errors", async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.appointment.findUnique.mockResolvedValue(mockAppointment);
      (mockPrisma.$transaction as jest.Mock).mockRejectedValue(new Error("Database error"));

      const request = new NextRequest("http://localhost/api/admin/appointments/appointment-1/cancel", {
        method: "POST",
        body: JSON.stringify({ reason: "test" }),
      });

      const params = Promise.resolve({ id: "appointment-1" });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal Server Error");
    });
  });
});
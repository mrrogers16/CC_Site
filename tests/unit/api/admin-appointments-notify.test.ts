import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { jest } from "@jest/globals";
import { POST } from "@/app/api/admin/appointments/[id]/notify/route";
import { prisma } from "@/lib/db";
import {
  sendAppointmentConfirmation,
  sendAppointmentReschedule,
  sendAppointmentCancellation,
} from "@/lib/email";

// Mock dependencies
jest.mock("next-auth");
jest.mock("@/lib/db");
jest.mock("@/lib/email");
jest.mock("@/lib/logger");

const mockGetServerSession = getServerSession as jest.MockedFunction<
  typeof getServerSession
>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockSendAppointmentConfirmation =
  sendAppointmentConfirmation as jest.MockedFunction<
    typeof sendAppointmentConfirmation
  >;
const mockSendAppointmentReschedule =
  sendAppointmentReschedule as jest.MockedFunction<
    typeof sendAppointmentReschedule
  >;
const mockSendAppointmentCancellation =
  sendAppointmentCancellation as jest.MockedFunction<
    typeof sendAppointmentCancellation
  >;

describe("/api/admin/appointments/[id]/notify", () => {
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
    mockSendAppointmentConfirmation.mockResolvedValue({
      success: true,
      messageId: "msg-123",
    });
    mockSendAppointmentReschedule.mockResolvedValue({
      success: true,
      messageId: "msg-124",
    });
    mockSendAppointmentCancellation.mockResolvedValue({
      success: true,
      messageId: "msg-125",
    });
  });

  describe("POST", () => {
    it("sends confirmation notification successfully", async () => {
      const requestBody = {
        type: "confirmation",
      };

      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.appointment.findUnique.mockResolvedValue(mockAppointment);
      mockPrisma.appointment.update.mockResolvedValue(mockAppointment);

      const request = new NextRequest(
        "http://localhost/api/admin/appointments/appointment-1/notify",
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
      expect(data.notificationSent).toBe(true);
      expect(data.messageId).toBe("msg-123");
      expect(data.message).toBe("Confirmation notification sent successfully");

      expect(mockSendAppointmentConfirmation).toHaveBeenCalledWith(
        "john@test.com",
        "John Doe",
        {
          id: "appointment-1",
          service: "Individual Therapy",
          dateTime: "2025-08-28T10:00:00.000Z",
          duration: 60,
          price: "150",
        }
      );
    });

    it("sends reschedule notification successfully", async () => {
      const requestBody = {
        type: "reschedule",
        oldDateTime: "2025-08-27T10:00:00Z",
        reason: "Client requested different time",
      };

      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.appointment.findUnique.mockResolvedValue(mockAppointment);

      const request = new NextRequest(
        "http://localhost/api/admin/appointments/appointment-1/notify",
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
      expect(data.notificationSent).toBe(true);

      expect(mockSendAppointmentReschedule).toHaveBeenCalledWith(
        "john@test.com",
        "John Doe",
        "2025-08-27T10:00:00.000Z",
        "2025-08-28T10:00:00.000Z",
        {
          service: "Individual Therapy",
          duration: 60,
          price: "150",
        },
        "Client requested different time"
      );
    });

    it("sends cancellation notification successfully", async () => {
      const requestBody = {
        type: "cancellation",
        reason: "Emergency cancellation",
        cancellationPolicy: "24-hour cancellation policy",
      };

      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.appointment.findUnique.mockResolvedValue(mockAppointment);

      const request = new NextRequest(
        "http://localhost/api/admin/appointments/appointment-1/notify",
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
      expect(data.notificationSent).toBe(true);

      expect(mockSendAppointmentCancellation).toHaveBeenCalledWith(
        "john@test.com",
        "John Doe",
        "2025-08-28T10:00:00.000Z",
        {
          service: "Individual Therapy",
          duration: 60,
          price: "150",
        },
        "Emergency cancellation",
        "24-hour cancellation policy"
      );
    });

    it("sends reminder notification using confirmation template", async () => {
      const requestBody = {
        type: "reminder",
      };

      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.appointment.findUnique.mockResolvedValue(mockAppointment);
      mockPrisma.appointment.update.mockResolvedValue(mockAppointment);

      const request = new NextRequest(
        "http://localhost/api/admin/appointments/appointment-1/notify",
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
      expect(data.message).toBe("Reminder notification sent successfully");

      expect(mockSendAppointmentConfirmation).toHaveBeenCalledWith(
        "john@test.com",
        "John Doe",
        {
          id: "appointment-1",
          service: "Individual Therapy",
          dateTime: "2025-08-28T10:00:00.000Z",
          duration: 60,
          price: "150",
        }
      );

      // Should update reminderSent timestamp
      expect(mockPrisma.appointment.update).toHaveBeenCalledWith({
        where: { id: "appointment-1" },
        data: { reminderSent: expect.any(Date) },
      });
    });

    it("requires admin authentication", async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost/api/admin/appointments/appointment-1/notify",
        {
          method: "POST",
          body: JSON.stringify({ type: "confirmation" }),
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
        "http://localhost/api/admin/appointments/appointment-1/notify",
        {
          method: "POST",
          body: JSON.stringify({ type: "confirmation" }),
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
        "http://localhost/api/admin/appointments/nonexistent/notify",
        {
          method: "POST",
          body: JSON.stringify({ type: "confirmation" }),
        }
      );

      const params = Promise.resolve({ id: "nonexistent" });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Appointment not found");
    });

    it("validates notification type", async () => {
      mockGetServerSession.mockResolvedValue(mockSession);

      const request = new NextRequest(
        "http://localhost/api/admin/appointments/appointment-1/notify",
        {
          method: "POST",
          body: JSON.stringify({ type: "invalid-type" }),
        }
      );

      const params = Promise.resolve({ id: "appointment-1" });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Validation Error");
    });

    it("requires oldDateTime for reschedule notifications", async () => {
      const requestBody = {
        type: "reschedule",
        // Missing oldDateTime
        reason: "Client requested different time",
      };

      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.appointment.findUnique.mockResolvedValue(mockAppointment);

      const request = new NextRequest(
        "http://localhost/api/admin/appointments/appointment-1/notify",
        {
          method: "POST",
          body: JSON.stringify(requestBody),
        }
      );

      const params = Promise.resolve({ id: "appointment-1" });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe(
        "Old date/time is required for reschedule notifications"
      );
    });

    it("validates custom message length", async () => {
      const longMessage = "a".repeat(501); // Too long

      mockGetServerSession.mockResolvedValue(mockSession);

      const request = new NextRequest(
        "http://localhost/api/admin/appointments/appointment-1/notify",
        {
          method: "POST",
          body: JSON.stringify({
            type: "confirmation",
            customMessage: longMessage,
          }),
        }
      );

      const params = Promise.resolve({ id: "appointment-1" });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Validation Error");
    });

    it("handles email sending failures", async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.appointment.findUnique.mockResolvedValue(mockAppointment);
      mockSendAppointmentConfirmation.mockResolvedValue({
        success: false,
        error: "Email service unavailable",
      });

      const request = new NextRequest(
        "http://localhost/api/admin/appointments/appointment-1/notify",
        {
          method: "POST",
          body: JSON.stringify({ type: "confirmation" }),
        }
      );

      const params = Promise.resolve({ id: "appointment-1" });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.notificationSent).toBe(false);
      expect(data.notificationError).toBe("Email service unavailable");
      expect(data.message).toBe("Confirmation notification failed to send");
    });

    it("handles email sending exceptions", async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.appointment.findUnique.mockResolvedValue(mockAppointment);
      mockSendAppointmentConfirmation.mockRejectedValue(
        new Error("Network error")
      );

      const request = new NextRequest(
        "http://localhost/api/admin/appointments/appointment-1/notify",
        {
          method: "POST",
          body: JSON.stringify({ type: "confirmation" }),
        }
      );

      const params = Promise.resolve({ id: "appointment-1" });
      const response = await POST(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(false);
      expect(data.notificationSent).toBe(false);
      expect(data.notificationError).toBe("Network error");
    });

    it("updates confirmationSent timestamp for confirmation notifications", async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.appointment.findUnique.mockResolvedValue(mockAppointment);
      mockPrisma.appointment.update.mockResolvedValue(mockAppointment);

      const request = new NextRequest(
        "http://localhost/api/admin/appointments/appointment-1/notify",
        {
          method: "POST",
          body: JSON.stringify({ type: "confirmation" }),
        }
      );

      const params = Promise.resolve({ id: "appointment-1" });
      await POST(request, { params });

      expect(mockPrisma.appointment.update).toHaveBeenCalledWith({
        where: { id: "appointment-1" },
        data: { confirmationSent: expect.any(Date) },
      });
    });

    it("does not update timestamps when email fails", async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.appointment.findUnique.mockResolvedValue(mockAppointment);
      mockSendAppointmentConfirmation.mockResolvedValue({
        success: false,
        error: "Email failed",
      });

      const request = new NextRequest(
        "http://localhost/api/admin/appointments/appointment-1/notify",
        {
          method: "POST",
          body: JSON.stringify({ type: "confirmation" }),
        }
      );

      const params = Promise.resolve({ id: "appointment-1" });
      await POST(request, { params });

      expect(mockPrisma.appointment.update).not.toHaveBeenCalled();
    });

    it("converts price to string for email templates", async () => {
      const appointmentWithDecimalPrice = {
        ...mockAppointment,
        service: {
          ...mockAppointment.service,
          price: 150.75, // Decimal price
        },
      };

      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.appointment.findUnique.mockResolvedValue(
        appointmentWithDecimalPrice
      );
      mockPrisma.appointment.update.mockResolvedValue(
        appointmentWithDecimalPrice
      );

      const request = new NextRequest(
        "http://localhost/api/admin/appointments/appointment-1/notify",
        {
          method: "POST",
          body: JSON.stringify({ type: "confirmation" }),
        }
      );

      const params = Promise.resolve({ id: "appointment-1" });
      await POST(request, { params });

      expect(mockSendAppointmentConfirmation).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          price: "150.75", // Should be converted to string
        })
      );
    });

    it("validates reason length for reschedule notifications", async () => {
      const longReason = "a".repeat(201); // Too long

      mockGetServerSession.mockResolvedValue(mockSession);

      const request = new NextRequest(
        "http://localhost/api/admin/appointments/appointment-1/notify",
        {
          method: "POST",
          body: JSON.stringify({
            type: "reschedule",
            oldDateTime: "2025-08-27T10:00:00Z",
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

    it("handles all notification types without optional parameters", async () => {
      const testCases = [
        { type: "confirmation" },
        { type: "reminder" },
        { type: "cancellation" },
      ];

      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.appointment.findUnique.mockResolvedValue(mockAppointment);
      mockPrisma.appointment.update.mockResolvedValue(mockAppointment);

      for (const testCase of testCases) {
        jest.clearAllMocks();

        const request = new NextRequest(
          "http://localhost/api/admin/appointments/appointment-1/notify",
          {
            method: "POST",
            body: JSON.stringify(testCase),
          }
        );

        const params = Promise.resolve({ id: "appointment-1" });
        const response = await POST(request, { params });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
      }
    });

    it("formats oldDateTime correctly for reschedule notifications", async () => {
      const requestBody = {
        type: "reschedule",
        oldDateTime: "2025-08-27T15:30:00.000Z",
        reason: "Schedule change",
      };

      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.appointment.findUnique.mockResolvedValue(mockAppointment);

      const request = new NextRequest(
        "http://localhost/api/admin/appointments/appointment-1/notify",
        {
          method: "POST",
          body: JSON.stringify(requestBody),
        }
      );

      const params = Promise.resolve({ id: "appointment-1" });
      await POST(request, { params });

      expect(mockSendAppointmentReschedule).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        "2025-08-27T15:30:00.000Z", // Should be properly formatted ISO string
        expect.any(String),
        expect.any(Object),
        "Schedule change"
      );
    });
  });
});

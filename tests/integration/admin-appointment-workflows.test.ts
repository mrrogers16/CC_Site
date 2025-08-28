import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { jest } from "@jest/globals";
import { prisma } from "@/lib/db";
import {
  sendAppointmentReschedule,
  sendAppointmentCancellation,
} from "@/lib/email";
import { isTimeSlotAvailable } from "@/lib/utils/time-slots";

// Import API handlers
import { POST as rescheduleHandler } from "@/app/api/admin/appointments/[id]/reschedule/route";
import { POST as cancelHandler } from "@/app/api/admin/appointments/[id]/cancel/route";
import { POST as notifyHandler } from "@/app/api/admin/appointments/[id]/notify/route";
import { GET as historyHandler } from "@/app/api/admin/appointments/[id]/history/route";
import { POST as conflictsHandler } from "@/app/api/admin/appointments/conflicts/route";

// Mock dependencies
jest.mock("next-auth");
jest.mock("@/lib/db");
jest.mock("@/lib/email");
jest.mock("@/lib/utils/time-slots");
jest.mock("@/lib/logger");

const mockGetServerSession = getServerSession as jest.MockedFunction<
  typeof getServerSession
>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockSendAppointmentReschedule =
  sendAppointmentReschedule as jest.MockedFunction<
    typeof sendAppointmentReschedule
  >;
const mockSendAppointmentCancellation =
  sendAppointmentCancellation as jest.MockedFunction<
    typeof sendAppointmentCancellation
  >;
const mockIsTimeSlotAvailable = isTimeSlotAvailable as jest.MockedFunction<
  typeof isTimeSlotAvailable
>;

describe("Admin Appointment Workflows Integration Tests", () => {
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
    mockGetServerSession.mockResolvedValue(mockSession);
    mockPrisma.$transaction = jest.fn();
    mockSendAppointmentReschedule.mockResolvedValue({
      success: true,
      messageId: "msg-reschedule",
    });
    mockSendAppointmentCancellation.mockResolvedValue({
      success: true,
      messageId: "msg-cancel",
    });
  });

  describe("Complete Reschedule Workflow", () => {
    it("reschedules appointment and creates complete audit trail", async () => {
      const newDateTime = "2025-08-29T14:00:00Z";
      const reason = "Client requested different time";

      // Setup mocks
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
        newDateTime: new Date(newDateTime),
        reason: reason,
        adminId: "admin-1",
        adminName: "Admin User",
        createdAt: new Date(),
      };

      const mockUpdatedAppointment = {
        ...mockAppointment,
        dateTime: new Date(newDateTime),
        status: "PENDING",
        updatedAt: new Date(),
      };

      (mockPrisma.$transaction as jest.Mock).mockResolvedValue({
        historyRecord: mockHistoryRecord,
        updatedAppointment: mockUpdatedAppointment,
      });

      // Execute reschedule
      const rescheduleRequest = new NextRequest(
        "http://localhost/api/admin/appointments/appointment-1/reschedule",
        {
          method: "POST",
          body: JSON.stringify({ newDateTime, reason }),
        }
      );

      const rescheduleParams = Promise.resolve({ id: "appointment-1" });
      const rescheduleResponse = await rescheduleHandler(rescheduleRequest, {
        params: rescheduleParams,
      });
      const rescheduleData = await rescheduleResponse.json();

      // Verify reschedule response
      expect(rescheduleResponse.status).toBe(200);
      expect(rescheduleData.success).toBe(true);
      expect(rescheduleData.appointment.status).toBe("PENDING");
      expect(rescheduleData.historyRecord).toBeDefined();

      // Verify database transaction was called with correct data
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      const transactionCallback = (mockPrisma.$transaction as jest.Mock).mock
        .calls[0][0];
      expect(transactionCallback).toBeDefined();

      // Verify availability check was performed
      expect(mockIsTimeSlotAvailable).toHaveBeenCalledWith(
        new Date(newDateTime),
        "service-1",
        "appointment-1"
      );
    });

    it("handles reschedule with conflict detection workflow", async () => {
      const conflictDateTime = "2025-08-29T10:00:00Z";

      // Setup conflict detection
      mockPrisma.appointment.findUnique.mockResolvedValue(mockAppointment);
      mockIsTimeSlotAvailable.mockResolvedValue({
        available: false,
        reason: "Time slot conflicts with another appointment",
      });

      // Test reschedule attempt
      const rescheduleRequest = new NextRequest(
        "http://localhost/api/admin/appointments/appointment-1/reschedule",
        {
          method: "POST",
          body: JSON.stringify({ newDateTime: conflictDateTime }),
        }
      );

      const rescheduleParams = Promise.resolve({ id: "appointment-1" });
      const rescheduleResponse = await rescheduleHandler(rescheduleRequest, {
        params: rescheduleParams,
      });
      const rescheduleData = await rescheduleResponse.json();

      expect(rescheduleResponse.status).toBe(409);
      expect(rescheduleData.error).toBe(
        "New time slot is not available: Time slot conflicts with another appointment"
      );

      // Test conflict detection API for alternatives
      const conflictRequest = new NextRequest(
        "http://localhost/api/admin/appointments/conflicts",
        {
          method: "POST",
          body: JSON.stringify({
            dateTime: conflictDateTime,
            serviceId: "service-1",
            serviceDuration: 60,
            excludeAppointmentId: "appointment-1",
          }),
        }
      );

      // Mock conflict detection response
      const conflictingAppointments = [
        {
          id: "appointment-2",
          dateTime: new Date("2025-08-29T10:00:00Z"),
          status: "CONFIRMED",
          service: { title: "Other Therapy", duration: 60 },
          user: { name: "Jane Smith" },
        },
      ];

      mockPrisma.appointment.findMany.mockResolvedValue(
        conflictingAppointments
      );

      const conflictResponse = await conflictsHandler(conflictRequest);
      const conflictData = await conflictResponse.json();

      expect(conflictResponse.status).toBe(200);
      expect(conflictData.hasConflict).toBe(true);
      expect(conflictData.conflictType).toBe("appointment");
    });
  });

  describe("Complete Cancellation Workflow", () => {
    it("cancels appointment with notification and audit trail", async () => {
      const cancellationReason = "Emergency cancellation";
      const cancellationPolicy = "24-hour cancellation policy applies";

      // Setup mocks
      mockPrisma.appointment.findUnique.mockResolvedValue(mockAppointment);

      const mockCancelledAppointment = {
        ...mockAppointment,
        status: "CANCELLED",
        cancellationReason: cancellationReason,
        updatedAt: new Date(),
      };

      const mockHistoryRecord = {
        id: "history-1",
        appointmentId: "appointment-1",
        action: "CANCELLED",
        oldStatus: "CONFIRMED",
        newStatus: "CANCELLED",
        reason: cancellationReason,
        adminId: "admin-1",
        adminName: "Admin User",
        createdAt: new Date(),
      };

      (mockPrisma.$transaction as jest.Mock).mockResolvedValue({
        historyRecord: mockHistoryRecord,
        cancelledAppointment: mockCancelledAppointment,
      });

      // Execute cancellation
      const cancelRequest = new NextRequest(
        "http://localhost/api/admin/appointments/appointment-1/cancel",
        {
          method: "POST",
          body: JSON.stringify({
            reason: cancellationReason,
            sendNotification: true,
            cancellationPolicy: cancellationPolicy,
          }),
        }
      );

      const cancelParams = Promise.resolve({ id: "appointment-1" });
      const cancelResponse = await cancelHandler(cancelRequest, {
        params: cancelParams,
      });
      const cancelData = await cancelResponse.json();

      // Verify cancellation response
      expect(cancelResponse.status).toBe(200);
      expect(cancelData.success).toBe(true);
      expect(cancelData.appointment.status).toBe("CANCELLED");
      expect(cancelData.notificationSent).toBe(true);
      expect(cancelData.historyRecord).toBeDefined();

      // Verify email notification was sent
      expect(mockSendAppointmentCancellation).toHaveBeenCalledWith(
        "john@test.com",
        "John Doe",
        mockAppointment.dateTime.toISOString(),
        {
          service: "Individual Therapy",
          duration: 60,
          price: "150",
        },
        cancellationReason,
        cancellationPolicy
      );
    });

    it("handles cancellation without notification", async () => {
      mockPrisma.appointment.findUnique.mockResolvedValue(mockAppointment);

      const mockCancelledAppointment = {
        ...mockAppointment,
        status: "CANCELLED",
      };

      (mockPrisma.$transaction as jest.Mock).mockResolvedValue({
        historyRecord: { id: "history-1" },
        cancelledAppointment: mockCancelledAppointment,
      });

      const cancelRequest = new NextRequest(
        "http://localhost/api/admin/appointments/appointment-1/cancel",
        {
          method: "POST",
          body: JSON.stringify({
            reason: "Internal cancellation",
            sendNotification: false,
          }),
        }
      );

      const cancelParams = Promise.resolve({ id: "appointment-1" });
      const cancelResponse = await cancelHandler(cancelRequest, {
        params: cancelParams,
      });
      const cancelData = await cancelResponse.json();

      expect(cancelResponse.status).toBe(200);
      expect(cancelData.notificationSent).toBe(false);
      expect(mockSendAppointmentCancellation).not.toHaveBeenCalled();
    });
  });

  describe("History and Audit Trail Workflow", () => {
    it("maintains complete appointment history across operations", async () => {
      const historyRecords = [
        {
          id: "history-1",
          action: "CREATED",
          oldDateTime: null,
          newDateTime: null,
          oldStatus: null,
          newStatus: null,
          reason: null,
          adminName: "Dr. Smith",
          createdAt: new Date("2025-08-27T10:00:00Z"),
        },
        {
          id: "history-2",
          action: "RESCHEDULED",
          oldDateTime: new Date("2025-08-28T10:00:00Z"),
          newDateTime: new Date("2025-08-29T14:00:00Z"),
          oldStatus: null,
          newStatus: null,
          reason: "Client requested different time",
          adminName: "Admin User",
          createdAt: new Date("2025-08-27T11:00:00Z"),
        },
        {
          id: "history-3",
          action: "STATUS_CHANGED",
          oldDateTime: null,
          newDateTime: null,
          oldStatus: "PENDING",
          newStatus: "CONFIRMED",
          reason: null,
          adminName: "Admin User",
          createdAt: new Date("2025-08-27T12:00:00Z"),
        },
      ];

      // Setup history retrieval
      mockPrisma.appointment.findUnique.mockResolvedValue({
        id: "appointment-1",
      });
      mockPrisma.appointmentHistory.findMany.mockResolvedValue(historyRecords);

      const historyRequest = new NextRequest(
        "http://localhost/api/admin/appointments/appointment-1/history"
      );
      const historyParams = Promise.resolve({ id: "appointment-1" });
      const historyResponse = await historyHandler(historyRequest, {
        params: historyParams,
      });
      const historyData = await historyResponse.json();

      expect(historyResponse.status).toBe(200);
      expect(historyData.success).toBe(true);
      expect(historyData.history).toHaveLength(3);

      // Verify proper ordering (most recent first)
      expect(historyData.history[0].action).toBe("STATUS_CHANGED");
      expect(historyData.history[1].action).toBe("RESCHEDULED");
      expect(historyData.history[2].action).toBe("CREATED");

      // Verify date formatting
      expect(historyData.history[1].oldDateTime).toBe(
        "2025-08-28T10:00:00.000Z"
      );
      expect(historyData.history[1].newDateTime).toBe(
        "2025-08-29T14:00:00.000Z"
      );
    });
  });

  describe("Notification Workflow", () => {
    it("sends various notification types successfully", async () => {
      mockPrisma.appointment.findUnique.mockResolvedValue(mockAppointment);
      mockPrisma.appointment.update.mockResolvedValue(mockAppointment);

      // Test confirmation notification
      const confirmationRequest = new NextRequest(
        "http://localhost/api/admin/appointments/appointment-1/notify",
        {
          method: "POST",
          body: JSON.stringify({ type: "confirmation" }),
        }
      );

      const notifyParams = Promise.resolve({ id: "appointment-1" });
      const confirmationResponse = await notifyHandler(confirmationRequest, {
        params: notifyParams,
      });
      const confirmationData = await confirmationResponse.json();

      expect(confirmationResponse.status).toBe(200);
      expect(confirmationData.success).toBe(true);
      expect(confirmationData.notificationSent).toBe(true);

      // Verify confirmation timestamp update
      expect(mockPrisma.appointment.update).toHaveBeenCalledWith({
        where: { id: "appointment-1" },
        data: { confirmationSent: expect.any(Date) },
      });
    });

    it("handles reschedule notification with old date/time", async () => {
      mockPrisma.appointment.findUnique.mockResolvedValue(mockAppointment);

      const rescheduleNotificationRequest = new NextRequest(
        "http://localhost/api/admin/appointments/appointment-1/notify",
        {
          method: "POST",
          body: JSON.stringify({
            type: "reschedule",
            oldDateTime: "2025-08-27T10:00:00Z",
            reason: "Schedule change",
          }),
        }
      );

      const notifyParams = Promise.resolve({ id: "appointment-1" });
      const rescheduleNotificationResponse = await notifyHandler(
        rescheduleNotificationRequest,
        { params: notifyParams }
      );
      const rescheduleNotificationData =
        await rescheduleNotificationResponse.json();

      expect(rescheduleNotificationResponse.status).toBe(200);
      expect(rescheduleNotificationData.success).toBe(true);

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
        "Schedule change"
      );
    });
  });

  describe("Error Handling and Edge Cases", () => {
    it("handles database transaction failures gracefully", async () => {
      mockPrisma.appointment.findUnique.mockResolvedValue(mockAppointment);
      mockIsTimeSlotAvailable.mockResolvedValue({
        available: true,
        reason: null,
      });
      (mockPrisma.$transaction as jest.Mock).mockRejectedValue(
        new Error("Database transaction failed")
      );

      const rescheduleRequest = new NextRequest(
        "http://localhost/api/admin/appointments/appointment-1/reschedule",
        {
          method: "POST",
          body: JSON.stringify({ newDateTime: "2025-08-29T14:00:00Z" }),
        }
      );

      const rescheduleParams = Promise.resolve({ id: "appointment-1" });
      const rescheduleResponse = await rescheduleHandler(rescheduleRequest, {
        params: rescheduleParams,
      });
      const rescheduleData = await rescheduleResponse.json();

      expect(rescheduleResponse.status).toBe(500);
      expect(rescheduleData.error).toBe("Internal Server Error");
    });

    it("handles email notification failures without affecting core operations", async () => {
      mockPrisma.appointment.findUnique.mockResolvedValue(mockAppointment);

      const mockCancelledAppointment = {
        ...mockAppointment,
        status: "CANCELLED",
      };

      (mockPrisma.$transaction as jest.Mock).mockResolvedValue({
        historyRecord: { id: "history-1" },
        cancelledAppointment: mockCancelledAppointment,
      });

      // Mock email failure
      mockSendAppointmentCancellation.mockResolvedValue({
        success: false,
        error: "Email service unavailable",
      });

      const cancelRequest = new NextRequest(
        "http://localhost/api/admin/appointments/appointment-1/cancel",
        {
          method: "POST",
          body: JSON.stringify({
            reason: "Emergency",
            sendNotification: true,
          }),
        }
      );

      const cancelParams = Promise.resolve({ id: "appointment-1" });
      const cancelResponse = await cancelHandler(cancelRequest, {
        params: cancelParams,
      });
      const cancelData = await cancelResponse.json();

      // Core operation should succeed despite email failure
      expect(cancelResponse.status).toBe(200);
      expect(cancelData.success).toBe(true);
      expect(cancelData.appointment.status).toBe("CANCELLED");
      expect(cancelData.notificationSent).toBe(false);
      expect(cancelData.notificationError).toBe("Email service unavailable");
    });

    it("enforces business rules across workflow", async () => {
      // Try to reschedule a completed appointment
      const completedAppointment = {
        ...mockAppointment,
        status: "COMPLETED",
      };

      mockPrisma.appointment.findUnique.mockResolvedValue(completedAppointment);

      const rescheduleRequest = new NextRequest(
        "http://localhost/api/admin/appointments/appointment-1/reschedule",
        {
          method: "POST",
          body: JSON.stringify({ newDateTime: "2025-08-29T14:00:00Z" }),
        }
      );

      const rescheduleParams = Promise.resolve({ id: "appointment-1" });
      const rescheduleResponse = await rescheduleHandler(rescheduleRequest, {
        params: rescheduleParams,
      });
      const rescheduleData = await rescheduleResponse.json();

      expect(rescheduleResponse.status).toBe(400);
      expect(rescheduleData.error).toBe(
        "Cannot reschedule completed, cancelled, or no-show appointments"
      );
    });
  });

  describe("Cross-Operation Data Consistency", () => {
    it("maintains data consistency across multiple operations", async () => {
      // Simulate a sequence of operations on the same appointment
      let currentAppointment = { ...mockAppointment };

      // 1. First reschedule
      mockPrisma.appointment.findUnique.mockResolvedValue(currentAppointment);
      mockIsTimeSlotAvailable.mockResolvedValue({
        available: true,
        reason: null,
      });

      const newDateTime1 = "2025-08-29T14:00:00Z";
      const rescheduledAppointment1 = {
        ...currentAppointment,
        dateTime: new Date(newDateTime1),
        status: "PENDING",
      };

      (mockPrisma.$transaction as jest.Mock).mockResolvedValue({
        historyRecord: { id: "history-1", action: "RESCHEDULED" },
        updatedAppointment: rescheduledAppointment1,
      });

      const reschedule1Request = new NextRequest(
        "http://localhost/api/admin/appointments/appointment-1/reschedule",
        {
          method: "POST",
          body: JSON.stringify({
            newDateTime: newDateTime1,
            reason: "First reschedule",
          }),
        }
      );

      const reschedule1Params = Promise.resolve({ id: "appointment-1" });
      const reschedule1Response = await rescheduleHandler(reschedule1Request, {
        params: reschedule1Params,
      });
      const reschedule1Data = await reschedule1Response.json();

      expect(reschedule1Response.status).toBe(200);
      expect(reschedule1Data.appointment.dateTime).toBe(
        "2025-08-29T14:00:00.000Z"
      );
      expect(reschedule1Data.appointment.status).toBe("PENDING");

      // 2. Update current appointment for second operation
      currentAppointment = rescheduledAppointment1;
      mockPrisma.appointment.findUnique.mockResolvedValue(currentAppointment);

      // 3. Cancel the rescheduled appointment
      const cancelledAppointment = {
        ...currentAppointment,
        status: "CANCELLED",
        cancellationReason: "Client request",
      };

      (mockPrisma.$transaction as jest.Mock).mockResolvedValue({
        historyRecord: { id: "history-2", action: "CANCELLED" },
        cancelledAppointment: cancelledAppointment,
      });

      const cancelRequest = new NextRequest(
        "http://localhost/api/admin/appointments/appointment-1/cancel",
        {
          method: "POST",
          body: JSON.stringify({
            reason: "Client request",
            sendNotification: false,
          }),
        }
      );

      const cancelParams = Promise.resolve({ id: "appointment-1" });
      const cancelResponse = await cancelHandler(cancelRequest, {
        params: cancelParams,
      });
      const cancelData = await cancelResponse.json();

      expect(cancelResponse.status).toBe(200);
      expect(cancelData.appointment.status).toBe("CANCELLED");

      // 4. Verify complete history
      const historyRecords = [
        {
          id: "history-2",
          action: "CANCELLED",
          oldStatus: "PENDING",
          newStatus: "CANCELLED",
          reason: "Client request",
          adminName: "Admin User",
          createdAt: new Date("2025-08-27T12:00:00Z"),
        },
        {
          id: "history-1",
          action: "RESCHEDULED",
          oldDateTime: new Date("2025-08-28T10:00:00Z"),
          newDateTime: new Date(newDateTime1),
          reason: "First reschedule",
          adminName: "Admin User",
          createdAt: new Date("2025-08-27T11:00:00Z"),
        },
      ];

      mockPrisma.appointment.findUnique.mockResolvedValue({
        id: "appointment-1",
      });
      mockPrisma.appointmentHistory.findMany.mockResolvedValue(historyRecords);

      const historyRequest = new NextRequest(
        "http://localhost/api/admin/appointments/appointment-1/history"
      );
      const historyParams = Promise.resolve({ id: "appointment-1" });
      const historyResponse = await historyHandler(historyRequest, {
        params: historyParams,
      });
      const historyData = await historyResponse.json();

      expect(historyResponse.status).toBe(200);
      expect(historyData.history).toHaveLength(2);
      expect(historyData.history[0].action).toBe("CANCELLED");
      expect(historyData.history[1].action).toBe("RESCHEDULED");
    });
  });
});

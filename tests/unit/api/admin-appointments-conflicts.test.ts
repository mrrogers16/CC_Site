import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { jest } from "@jest/globals";
import { POST } from "@/app/api/admin/appointments/conflicts/route";
import { prisma } from "@/lib/db";
import { isTimeSlotAvailable, generateTimeSlots } from "@/lib/utils/time-slots";

// Mock dependencies
jest.mock("next-auth");
jest.mock("@/lib/db");
jest.mock("@/lib/utils/time-slots");
jest.mock("@/lib/logger");

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockIsTimeSlotAvailable = isTimeSlotAvailable as jest.MockedFunction<typeof isTimeSlotAvailable>;
const mockGenerateTimeSlots = generateTimeSlots as jest.MockedFunction<typeof generateTimeSlots>;

describe("/api/admin/appointments/conflicts", () => {
  const mockSession = {
    user: {
      id: "admin-1",
      email: "admin@test.com",
      name: "Admin User",
      role: "ADMIN" as const,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST", () => {
    it("returns no conflict when time slot is available", async () => {
      const requestBody = {
        dateTime: "2025-08-28T10:00:00Z",
        serviceId: "service-1",
        serviceDuration: 60,
      };

      mockGetServerSession.mockResolvedValue(mockSession);
      mockIsTimeSlotAvailable.mockResolvedValue({
        available: true,
        reason: null,
      });

      const request = new NextRequest("http://localhost/api/admin/appointments/conflicts", {
        method: "POST",
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.hasConflict).toBe(false);
      expect(data.conflictType).toBeNull();
      expect(data.conflictingAppointments).toEqual([]);
      expect(data.reason).toBe("");
      expect(data.suggestedAlternatives).toEqual([]);
    });

    it("detects appointment conflicts and returns detailed information", async () => {
      const requestBody = {
        dateTime: "2025-08-28T10:00:00Z",
        serviceId: "service-1",
        serviceDuration: 60,
      };

      const mockConflictingAppointments = [
        {
          id: "appointment-1",
          dateTime: new Date("2025-08-28T10:00:00Z"),
          status: "CONFIRMED",
          service: {
            title: "Individual Therapy",
            duration: 60,
          },
          user: {
            name: "John Doe",
          },
        },
        {
          id: "appointment-2",
          dateTime: new Date("2025-08-28T10:30:00Z"),
          status: "PENDING",
          service: {
            title: "Consultation",
            duration: 30,
          },
          user: {
            name: "Jane Smith",
          },
        },
      ];

      mockGetServerSession.mockResolvedValue(mockSession);
      mockIsTimeSlotAvailable.mockResolvedValue({
        available: false,
        reason: "Time slot conflict with existing appointment",
      });
      mockPrisma.appointment.findMany.mockResolvedValue(mockConflictingAppointments);
      mockGenerateTimeSlots.mockResolvedValue([
        {
          dateTime: new Date("2025-08-28T11:00:00Z"),
          available: true,
        },
        {
          dateTime: new Date("2025-08-28T14:00:00Z"),
          available: true,
        },
      ]);

      const request = new NextRequest("http://localhost/api/admin/appointments/conflicts", {
        method: "POST",
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.hasConflict).toBe(true);
      expect(data.conflictType).toBe("appointment");
      expect(data.reason).toBe("Time slot conflict with existing appointment");
      expect(data.conflictingAppointments).toHaveLength(2);
      expect(data.conflictingAppointments[0]).toEqual({
        id: "appointment-1",
        dateTime: "2025-08-28T10:00:00.000Z",
        status: "CONFIRMED",
        service: {
          title: "Individual Therapy",
          duration: 60,
        },
        user: {
          name: "John Doe",
        },
      });
      expect(data.suggestedAlternatives).toHaveLength(2);
    });

    it("detects outside business hours conflicts", async () => {
      const requestBody = {
        dateTime: "2025-08-28T22:00:00Z", // Late evening
        serviceId: "service-1",
        serviceDuration: 60,
      };

      mockGetServerSession.mockResolvedValue(mockSession);
      mockIsTimeSlotAvailable.mockResolvedValue({
        available: false,
        reason: "Time slot is outside business hours",
      });
      mockGenerateTimeSlots.mockResolvedValue([]);

      const request = new NextRequest("http://localhost/api/admin/appointments/conflicts", {
        method: "POST",
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.hasConflict).toBe(true);
      expect(data.conflictType).toBe("outside_hours");
      expect(data.reason).toBe("Time slot is outside business hours");
    });

    it("detects blocked time slot conflicts", async () => {
      const requestBody = {
        dateTime: "2025-08-28T12:00:00Z",
        serviceId: "service-1",
        serviceDuration: 60,
      };

      mockGetServerSession.mockResolvedValue(mockSession);
      mockIsTimeSlotAvailable.mockResolvedValue({
        available: false,
        reason: "Time slot is blocked for maintenance",
      });
      mockGenerateTimeSlots.mockResolvedValue([]);

      const request = new NextRequest("http://localhost/api/admin/appointments/conflicts", {
        method: "POST",
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.hasConflict).toBe(true);
      expect(data.conflictType).toBe("blocked");
      expect(data.reason).toBe("Time slot is blocked for maintenance");
    });

    it("provides suggested alternative times", async () => {
      const requestBody = {
        dateTime: "2025-08-28T10:00:00Z",
        serviceId: "service-1",
        serviceDuration: 60,
      };

      const mockAvailableSlots = [
        { dateTime: new Date("2025-08-28T09:00:00Z"), available: true },
        { dateTime: new Date("2025-08-28T11:00:00Z"), available: true },
        { dateTime: new Date("2025-08-28T14:00:00Z"), available: true },
        { dateTime: new Date("2025-08-28T15:00:00Z"), available: true },
        { dateTime: new Date("2025-08-28T16:00:00Z"), available: true },
        { dateTime: new Date("2025-08-28T17:00:00Z"), available: true },
        // 7th slot should be excluded (limit to 6)
        { dateTime: new Date("2025-08-28T18:00:00Z"), available: true },
      ];

      mockGetServerSession.mockResolvedValue(mockSession);
      mockIsTimeSlotAvailable.mockResolvedValue({
        available: false,
        reason: "Time slot conflict",
      });
      mockGenerateTimeSlots.mockResolvedValue(mockAvailableSlots);

      const request = new NextRequest("http://localhost/api/admin/appointments/conflicts", {
        method: "POST",
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.suggestedAlternatives).toHaveLength(6); // Limited to 6
      expect(data.suggestedAlternatives[0]).toEqual({
        dateTime: "2025-08-28T09:00:00.000Z",
        displayTime: "9:00 AM",
      });
    });

    it("suggests next day alternatives when no slots available today", async () => {
      const requestBody = {
        dateTime: "2025-08-28T10:00:00Z",
        serviceId: "service-1",
        serviceDuration: 60,
      };

      const mockNextDaySlots = [
        { dateTime: new Date("2025-08-29T09:00:00Z"), available: true },
        { dateTime: new Date("2025-08-29T10:00:00Z"), available: true },
      ];

      mockGetServerSession.mockResolvedValue(mockSession);
      mockIsTimeSlotAvailable.mockResolvedValue({
        available: false,
        reason: "No slots available today",
      });
      
      // First call for today - no available slots
      mockGenerateTimeSlots
        .mockResolvedValueOnce([]) // Today
        .mockResolvedValueOnce(mockNextDaySlots); // Tomorrow

      const request = new NextRequest("http://localhost/api/admin/appointments/conflicts", {
        method: "POST",
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.suggestedAlternatives).toHaveLength(2);
      expect(data.suggestedAlternatives[0].displayTime).toMatch(/Tomorrow/);
      expect(mockGenerateTimeSlots).toHaveBeenCalledTimes(2);
    });

    it("excludes specified appointment from conflict check", async () => {
      const requestBody = {
        dateTime: "2025-08-28T10:00:00Z",
        serviceId: "service-1",
        serviceDuration: 60,
        excludeAppointmentId: "appointment-to-exclude",
      };

      mockGetServerSession.mockResolvedValue(mockSession);
      mockIsTimeSlotAvailable.mockResolvedValue({
        available: true,
        reason: null,
      });

      const request = new NextRequest("http://localhost/api/admin/appointments/conflicts", {
        method: "POST",
        body: JSON.stringify(requestBody),
      });

      await POST(request);

      expect(mockIsTimeSlotAvailable).toHaveBeenCalledWith(
        new Date("2025-08-28T10:00:00Z"),
        "service-1",
        "appointment-to-exclude"
      );
    });

    it("requires admin authentication", async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/admin/appointments/conflicts", {
        method: "POST",
        body: JSON.stringify({
          dateTime: "2025-08-28T10:00:00Z",
          serviceId: "service-1",
          serviceDuration: 60,
        }),
      });

      const response = await POST(request);
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

      const request = new NextRequest("http://localhost/api/admin/appointments/conflicts", {
        method: "POST",
        body: JSON.stringify({
          dateTime: "2025-08-28T10:00:00Z",
          serviceId: "service-1",
          serviceDuration: 60,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Admin access required");
    });

    it("validates request body schema", async () => {
      mockGetServerSession.mockResolvedValue(mockSession);

      const request = new NextRequest("http://localhost/api/admin/appointments/conflicts", {
        method: "POST",
        body: JSON.stringify({
          dateTime: "invalid-date",
          serviceId: "service-1",
          serviceDuration: 60,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Validation Error");
    });

    it("validates serviceId format", async () => {
      mockGetServerSession.mockResolvedValue(mockSession);

      const request = new NextRequest("http://localhost/api/admin/appointments/conflicts", {
        method: "POST",
        body: JSON.stringify({
          dateTime: "2025-08-28T10:00:00Z",
          serviceId: "invalid-id", // Not a CUID
          serviceDuration: 60,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Validation Error");
    });

    it("validates serviceDuration is positive integer", async () => {
      mockGetServerSession.mockResolvedValue(mockSession);

      const request = new NextRequest("http://localhost/api/admin/appointments/conflicts", {
        method: "POST",
        body: JSON.stringify({
          dateTime: "2025-08-28T10:00:00Z",
          serviceId: "clw1234567890abcdef1234",
          serviceDuration: -30, // Negative duration
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Validation Error");
    });

    it("handles errors when generating alternative times", async () => {
      const requestBody = {
        dateTime: "2025-08-28T10:00:00Z",
        serviceId: "service-1",
        serviceDuration: 60,
      };

      mockGetServerSession.mockResolvedValue(mockSession);
      mockIsTimeSlotAvailable.mockResolvedValue({
        available: false,
        reason: "Time slot conflict",
      });
      mockGenerateTimeSlots.mockRejectedValue(new Error("Database error"));

      const request = new NextRequest("http://localhost/api/admin/appointments/conflicts", {
        method: "POST",
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.hasConflict).toBe(true);
      expect(data.suggestedAlternatives).toEqual([]); // Should be empty due to error
    });

    it("filters conflicting appointments with 15-minute buffer", async () => {
      const requestBody = {
        dateTime: "2025-08-28T10:00:00Z", // 10:00 AM
        serviceId: "service-1",
        serviceDuration: 60, // 1 hour
      };

      const mockAppointments = [
        {
          id: "appointment-1",
          dateTime: new Date("2025-08-28T09:30:00Z"), // 9:30 AM - conflicts with 15min buffer
          status: "CONFIRMED",
          service: { title: "Therapy", duration: 30 },
          user: { name: "John Doe" },
        },
        {
          id: "appointment-2", 
          dateTime: new Date("2025-08-28T11:30:00Z"), // 11:30 AM - conflicts with 15min buffer
          status: "PENDING",
          service: { title: "Consultation", duration: 30 },
          user: { name: "Jane Smith" },
        },
        {
          id: "appointment-3",
          dateTime: new Date("2025-08-28T08:00:00Z"), // 8:00 AM - no conflict (too far)
          status: "CONFIRMED",
          service: { title: "Therapy", duration: 30 },
          user: { name: "Bob Wilson" },
        },
      ];

      mockGetServerSession.mockResolvedValue(mockSession);
      mockIsTimeSlotAvailable.mockResolvedValue({
        available: false,
        reason: "Time slot conflict with existing appointment",
      });
      mockPrisma.appointment.findMany.mockResolvedValue(mockAppointments);
      mockGenerateTimeSlots.mockResolvedValue([]);

      const request = new NextRequest("http://localhost/api/admin/appointments/conflicts", {
        method: "POST",
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data = await response.json();

      // Should only include the first two appointments that conflict with buffer
      expect(data.conflictingAppointments).toHaveLength(2);
      expect(data.conflictingAppointments.map(a => a.id)).toContain("appointment-1");
      expect(data.conflictingAppointments.map(a => a.id)).toContain("appointment-2");
      expect(data.conflictingAppointments.map(a => a.id)).not.toContain("appointment-3");
    });

    it("handles missing required fields", async () => {
      mockGetServerSession.mockResolvedValue(mockSession);

      const request = new NextRequest("http://localhost/api/admin/appointments/conflicts", {
        method: "POST",
        body: JSON.stringify({
          dateTime: "2025-08-28T10:00:00Z",
          // Missing serviceId and serviceDuration
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Validation Error");
    });

    it("formats display times correctly for suggested alternatives", async () => {
      const requestBody = {
        dateTime: "2025-08-28T10:00:00Z",
        serviceId: "service-1",
        serviceDuration: 60,
      };

      const mockSlots = [
        { dateTime: new Date("2025-08-28T09:00:00Z"), available: true },
        { dateTime: new Date("2025-08-28T13:30:00Z"), available: true },
      ];

      mockGetServerSession.mockResolvedValue(mockSession);
      mockIsTimeSlotAvailable.mockResolvedValue({
        available: false,
        reason: "Time slot conflict",
      });
      mockGenerateTimeSlots.mockResolvedValue(mockSlots);

      const request = new NextRequest("http://localhost/api/admin/appointments/conflicts", {
        method: "POST",
        body: JSON.stringify(requestBody),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(data.suggestedAlternatives[0].displayTime).toBe("9:00 AM");
      expect(data.suggestedAlternatives[1].displayTime).toBe("1:30 PM");
    });
  });
});
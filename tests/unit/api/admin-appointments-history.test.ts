import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { jest } from "@jest/globals";
import { GET } from "@/app/api/admin/appointments/[id]/history/route";
import { prisma } from "@/lib/db";

// Mock dependencies
jest.mock("next-auth");
jest.mock("@/lib/db");
jest.mock("@/lib/logger");

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe("/api/admin/appointments/[id]/history", () => {
  const mockSession = {
    user: {
      id: "admin-1",
      email: "admin@test.com",
      name: "Admin User",
      role: "ADMIN" as const,
    },
  };

  const mockHistoryRecords = [
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
      adminName: "Dr. Smith",
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
    {
      id: "history-4",
      action: "CANCELLED",
      oldDateTime: null,
      newDateTime: null,
      oldStatus: "CONFIRMED",
      newStatus: "CANCELLED",
      reason: "Emergency cancellation",
      adminName: "Dr. Johnson",
      createdAt: new Date("2025-08-27T13:00:00Z"),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET", () => {
    it("successfully retrieves appointment history", async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.appointment.findUnique.mockResolvedValue({ id: "appointment-1" });
      mockPrisma.appointmentHistory.findMany.mockResolvedValue(mockHistoryRecords);

      const request = new NextRequest("http://localhost/api/admin/appointments/appointment-1/history");
      const params = Promise.resolve({ id: "appointment-1" });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.history).toHaveLength(4);

      // Check that dates are converted to ISO strings
      expect(data.history[0].createdAt).toBe("2025-08-27T10:00:00.000Z");
      expect(data.history[1].oldDateTime).toBe("2025-08-28T10:00:00.000Z");
      expect(data.history[1].newDateTime).toBe("2025-08-29T14:00:00.000Z");

      // Check that null values are preserved
      expect(data.history[0].oldDateTime).toBeNull();
      expect(data.history[0].reason).toBeNull();
    });

    it("returns history ordered by creation date descending", async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.appointment.findUnique.mockResolvedValue({ id: "appointment-1" });
      mockPrisma.appointmentHistory.findMany.mockResolvedValue(mockHistoryRecords);

      const request = new NextRequest("http://localhost/api/admin/appointments/appointment-1/history");
      const params = Promise.resolve({ id: "appointment-1" });
      await GET(request, { params });

      expect(mockPrisma.appointmentHistory.findMany).toHaveBeenCalledWith({
        where: { appointmentId: "appointment-1" },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          action: true,
          oldDateTime: true,
          newDateTime: true,
          oldStatus: true,
          newStatus: true,
          reason: true,
          adminName: true,
          createdAt: true,
        },
      });
    });

    it("returns empty history when no records exist", async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.appointment.findUnique.mockResolvedValue({ id: "appointment-1" });
      mockPrisma.appointmentHistory.findMany.mockResolvedValue([]);

      const request = new NextRequest("http://localhost/api/admin/appointments/appointment-1/history");
      const params = Promise.resolve({ id: "appointment-1" });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.history).toEqual([]);
    });

    it("requires admin authentication", async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/admin/appointments/appointment-1/history");
      const params = Promise.resolve({ id: "appointment-1" });
      const response = await GET(request, { params });
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

      const request = new NextRequest("http://localhost/api/admin/appointments/appointment-1/history");
      const params = Promise.resolve({ id: "appointment-1" });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Admin access required");
    });

    it("returns 404 for non-existent appointment", async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.appointment.findUnique.mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/admin/appointments/nonexistent/history");
      const params = Promise.resolve({ id: "nonexistent" });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Appointment not found");
    });

    it("includes all expected fields in history records", async () => {
      const completeHistoryRecord = {
        id: "history-1",
        action: "RESCHEDULED",
        oldDateTime: new Date("2025-08-28T10:00:00Z"),
        newDateTime: new Date("2025-08-29T14:00:00Z"),
        oldStatus: "PENDING",
        newStatus: "CONFIRMED",
        reason: "Client requested different time",
        adminName: "Dr. Smith",
        createdAt: new Date("2025-08-27T11:00:00Z"),
      };

      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.appointment.findUnique.mockResolvedValue({ id: "appointment-1" });
      mockPrisma.appointmentHistory.findMany.mockResolvedValue([completeHistoryRecord]);

      const request = new NextRequest("http://localhost/api/admin/appointments/appointment-1/history");
      const params = Promise.resolve({ id: "appointment-1" });
      const response = await GET(request, { params });
      const data = await response.json();

      const record = data.history[0];
      expect(record).toHaveProperty("id");
      expect(record).toHaveProperty("action");
      expect(record).toHaveProperty("oldDateTime");
      expect(record).toHaveProperty("newDateTime");
      expect(record).toHaveProperty("oldStatus");
      expect(record).toHaveProperty("newStatus");
      expect(record).toHaveProperty("reason");
      expect(record).toHaveProperty("adminName");
      expect(record).toHaveProperty("createdAt");

      expect(record.action).toBe("RESCHEDULED");
      expect(record.oldStatus).toBe("PENDING");
      expect(record.newStatus).toBe("CONFIRMED");
      expect(record.reason).toBe("Client requested different time");
      expect(record.adminName).toBe("Dr. Smith");
    });

    it("handles all action types correctly", async () => {
      const allActionTypes = [
        {
          id: "history-1",
          action: "CREATED",
          oldDateTime: null,
          newDateTime: null,
          oldStatus: null,
          newStatus: null,
          reason: null,
          adminName: "Admin",
          createdAt: new Date("2025-08-27T10:00:00Z"),
        },
        {
          id: "history-2",
          action: "UPDATED",
          oldDateTime: null,
          newDateTime: null,
          oldStatus: null,
          newStatus: null,
          reason: null,
          adminName: "Admin",
          createdAt: new Date("2025-08-27T10:01:00Z"),
        },
        {
          id: "history-3",
          action: "RESCHEDULED",
          oldDateTime: new Date("2025-08-28T10:00:00Z"),
          newDateTime: new Date("2025-08-29T14:00:00Z"),
          oldStatus: null,
          newStatus: null,
          reason: "Client requested",
          adminName: "Admin",
          createdAt: new Date("2025-08-27T10:02:00Z"),
        },
        {
          id: "history-4",
          action: "CANCELLED",
          oldDateTime: null,
          newDateTime: null,
          oldStatus: "CONFIRMED",
          newStatus: "CANCELLED",
          reason: "Emergency",
          adminName: "Admin",
          createdAt: new Date("2025-08-27T10:03:00Z"),
        },
        {
          id: "history-5",
          action: "COMPLETED",
          oldDateTime: null,
          newDateTime: null,
          oldStatus: "CONFIRMED",
          newStatus: "COMPLETED",
          reason: null,
          adminName: "Admin",
          createdAt: new Date("2025-08-27T10:04:00Z"),
        },
        {
          id: "history-6",
          action: "NO_SHOW",
          oldDateTime: null,
          newDateTime: null,
          oldStatus: "CONFIRMED",
          newStatus: "NO_SHOW",
          reason: null,
          adminName: "Admin",
          createdAt: new Date("2025-08-27T10:05:00Z"),
        },
        {
          id: "history-7",
          action: "STATUS_CHANGED",
          oldDateTime: null,
          newDateTime: null,
          oldStatus: "PENDING",
          newStatus: "CONFIRMED",
          reason: null,
          adminName: "Admin",
          createdAt: new Date("2025-08-27T10:06:00Z"),
        },
        {
          id: "history-8",
          action: "NOTES_UPDATED",
          oldDateTime: null,
          newDateTime: null,
          oldStatus: null,
          newStatus: null,
          reason: "Updated client notes",
          adminName: "Admin",
          createdAt: new Date("2025-08-27T10:07:00Z"),
        },
      ];

      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.appointment.findUnique.mockResolvedValue({ id: "appointment-1" });
      mockPrisma.appointmentHistory.findMany.mockResolvedValue(allActionTypes);

      const request = new NextRequest("http://localhost/api/admin/appointments/appointment-1/history");
      const params = Promise.resolve({ id: "appointment-1" });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.history).toHaveLength(8);

      const actions = data.history.map(record => record.action);
      expect(actions).toContain("CREATED");
      expect(actions).toContain("UPDATED");
      expect(actions).toContain("RESCHEDULED");
      expect(actions).toContain("CANCELLED");
      expect(actions).toContain("COMPLETED");
      expect(actions).toContain("NO_SHOW");
      expect(actions).toContain("STATUS_CHANGED");
      expect(actions).toContain("NOTES_UPDATED");
    });

    it("handles database errors gracefully", async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.appointment.findUnique.mockResolvedValue({ id: "appointment-1" });
      mockPrisma.appointmentHistory.findMany.mockRejectedValue(new Error("Database error"));

      const request = new NextRequest("http://localhost/api/admin/appointments/appointment-1/history");
      const params = Promise.resolve({ id: "appointment-1" });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal Server Error");
    });

    it("handles appointment existence check database error", async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.appointment.findUnique.mkRejectedValue(new Error("Database error"));

      const request = new NextRequest("http://localhost/api/admin/appointments/appointment-1/history");
      const params = Promise.resolve({ id: "appointment-1" });
      const response = await GET(request, { params });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal Server Error");
    });

    it("queries only necessary appointment fields for existence check", async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.appointment.findUnique.mockResolvedValue({ id: "appointment-1" });
      mockPrisma.appointmentHistory.findMany.mockResolvedValue([]);

      const request = new NextRequest("http://localhost/api/admin/appointments/appointment-1/history");
      const params = Promise.resolve({ id: "appointment-1" });
      await GET(request, { params });

      expect(mockPrisma.appointment.findUnique).toHaveBeenCalledWith({
        where: { id: "appointment-1" },
        select: { id: true },
      });
    });

    it("queries history with correct appointmentId filter", async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.appointment.findUnique.mockResolvedValue({ id: "different-id" });
      mockPrisma.appointmentHistory.findMany.mockResolvedValue([]);

      const request = new NextRequest("http://localhost/api/admin/appointments/different-id/history");
      const params = Promise.resolve({ id: "different-id" });
      await GET(request, { params });

      expect(mockPrisma.appointmentHistory.findMany).toHaveBeenCalledWith({
        where: { appointmentId: "different-id" },
        orderBy: { createdAt: "desc" },
        select: expect.any(Object),
      });
    });

    it("preserves null values in optional fields", async () => {
      const recordWithNulls = {
        id: "history-1",
        action: "CREATED",
        oldDateTime: null,
        newDateTime: null,
        oldStatus: null,
        newStatus: null,
        reason: null,
        adminName: "Dr. Smith",
        createdAt: new Date("2025-08-27T10:00:00Z"),
      };

      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.appointment.findUnique.mockResolvedValue({ id: "appointment-1" });
      mockPrisma.appointmentHistory.findMany.mockResolvedValue([recordWithNulls]);

      const request = new NextRequest("http://localhost/api/admin/appointments/appointment-1/history");
      const params = Promise.resolve({ id: "appointment-1" });
      const response = await GET(request, { params });
      const data = await response.json();

      const record = data.history[0];
      expect(record.oldDateTime).toBeNull();
      expect(record.newDateTime).toBeNull();
      expect(record.oldStatus).toBeNull();
      expect(record.newStatus).toBeNull();
      expect(record.reason).toBeNull();
    });

    it("converts all date fields to ISO strings", async () => {
      const recordWithDates = {
        id: "history-1",
        action: "RESCHEDULED",
        oldDateTime: new Date("2025-08-28T10:00:00Z"),
        newDateTime: new Date("2025-08-29T14:00:00Z"),
        oldStatus: null,
        newStatus: null,
        reason: "Rescheduled",
        adminName: "Dr. Smith",
        createdAt: new Date("2025-08-27T11:00:00Z"),
      };

      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.appointment.findUnique.mockResolvedValue({ id: "appointment-1" });
      mockPrisma.appointmentHistory.findMany.mockResolvedValue([recordWithDates]);

      const request = new NextRequest("http://localhost/api/admin/appointments/appointment-1/history");
      const params = Promise.resolve({ id: "appointment-1" });
      const response = await GET(request, { params });
      const data = await response.json();

      const record = data.history[0];
      expect(record.oldDateTime).toBe("2025-08-28T10:00:00.000Z");
      expect(record.newDateTime).toBe("2025-08-29T14:00:00.000Z");
      expect(record.createdAt).toBe("2025-08-27T11:00:00.000Z");
    });
  });
});
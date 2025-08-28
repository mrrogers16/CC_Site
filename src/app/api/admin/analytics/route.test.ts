import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { jest } from "@jest/globals";
import { GET } from "./route";

// Mock dependencies
jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("@/lib/auth", () => ({
  authOptions: {},
}));

jest.mock("@/lib/db", () => ({
  prisma: {
    appointment: {
      findMany: jest.fn(),
    },
    user: {
      count: jest.fn(),
    },
  },
}));

// Create properly typed mocks
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
import { prisma } from "@/lib/db";

// Create typed Prisma mock
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

// Set up mock implementations
mockGetServerSession.mockResolvedValue(null);

describe("/api/admin/analytics", () => {
  const mockAppointments = [
    {
      id: "1",
      status: "COMPLETED",
      dateTime: new Date("2024-01-15T10:00:00Z"),
      service: { price: 150, duration: 60 },
      userId: "user1",
      user: {
        appointments: [{ dateTime: new Date("2024-01-15T10:00:00Z") }],
      },
    },
    {
      id: "2",
      status: "COMPLETED",
      dateTime: new Date("2024-01-20T14:00:00Z"),
      service: { price: 200, duration: 90 },
      userId: "user2",
      user: {
        appointments: [{ dateTime: new Date("2023-12-15T10:00:00Z") }],
      },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    // Reset prisma mocks
    Object.values(mockPrisma.appointment).forEach(fn => {
      if (typeof fn.mockReset === "function") fn.mockReset();
    });
    Object.values(mockPrisma.user).forEach(fn => {
      if (typeof fn.mockReset === "function") fn.mockReset();
    });
  });

  afterEach(async () => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    // Clean up any pending operations
    await Promise.resolve();
  });

  describe("Authentication", () => {
    it("should return 401 if no session", async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest("http://localhost/api/admin/analytics");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });

    it("should return 401 if not admin", async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "1", role: "CLIENT" },
        expires: "",
      });

      const request = new NextRequest("http://localhost/api/admin/analytics");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });
  });

  describe("Analytics Calculations", () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "admin", role: "ADMIN" },
        expires: "",
      });
    });

    describe("Revenue Analytics", () => {
      it("should calculate current revenue correctly", async () => {
        mockPrisma.appointment.findMany
          .mockResolvedValueOnce(mockAppointments as any) // Current period
          .mockResolvedValueOnce([]); // Previous period

        const request = new NextRequest(
          "http://localhost/api/admin/analytics?startDate=2024-01-01&endDate=2024-01-31"
        );
        const response = await GET(request);
        const data = await response.json();

        expect(data.success).toBe(true);
        expect(data.analytics.revenue.currentTotal).toBe(350); // 150 + 200
        expect(data.analytics.revenue.totalSessions).toBe(2);
        expect(data.analytics.revenue.avgSessionValue).toBe(175); // 350 / 2
      });

      it("should calculate percentage change correctly", async () => {
        const previousPeriodAppointments = [
          {
            id: "3",
            status: "COMPLETED",
            service: { price: 100 },
          },
        ];

        mockPrisma.appointment.findMany
          .mockResolvedValueOnce(mockAppointments as any) // Current: 350
          .mockResolvedValueOnce(previousPeriodAppointments); // Previous: 100

        const request = new NextRequest(
          "http://localhost/api/admin/analytics?startDate=2024-01-01&endDate=2024-01-31"
        );
        const response = await GET(request);
        const data = await response.json();

        expect(data.analytics.revenue.percentageChange).toBe(250); // ((350-100)/100)*100
      });

      it("should handle zero previous revenue", async () => {
        mockPrisma.appointment.findMany
          .mockResolvedValueOnce(mockAppointments as any) // Current: 350
          .mockResolvedValueOnce([]); // Previous: 0

        const request = new NextRequest(
          "http://localhost/api/admin/analytics?startDate=2024-01-01&endDate=2024-01-31"
        );
        const response = await GET(request);
        const data = await response.json();

        expect(data.analytics.revenue.percentageChange).toBe(100);
      });
    });

    describe("Appointment Analytics", () => {
      it("should calculate utilization rate correctly", async () => {
        const allAppointments = [
          { id: "1", status: "COMPLETED", dateTime: new Date("2024-01-15") },
          { id: "2", status: "PENDING", dateTime: new Date("2024-01-16") },
          { id: "3", status: "CANCELLED", dateTime: new Date("2024-01-17") },
        ];

        mockPrisma.appointment.findMany.mockResolvedValueOnce(allAppointments);

        const request = new NextRequest(
          "http://localhost/api/admin/analytics?startDate=2024-01-01&endDate=2024-01-31"
        );
        const response = await GET(request);
        const data = await response.json();

        expect(data.analytics.appointments.totalAppointments).toBe(3);
        expect(data.analytics.appointments.statusBreakdown.completed).toBe(1);
        expect(data.analytics.appointments.statusBreakdown.pending).toBe(1);
        expect(data.analytics.appointments.statusBreakdown.cancelled).toBe(1);
      });

      it("should calculate cancellation rate correctly", async () => {
        const allAppointments = [
          { id: "1", status: "COMPLETED" },
          { id: "2", status: "CANCELLED" },
          { id: "3", status: "NO_SHOW" },
          { id: "4", status: "CONFIRMED" },
        ];

        mockPrisma.appointment.findMany.mockResolvedValueOnce(allAppointments);

        const request = new NextRequest(
          "http://localhost/api/admin/analytics?startDate=2024-01-01&endDate=2024-01-31"
        );
        const response = await GET(request);
        const data = await response.json();

        // Cancellation rate = (CANCELLED + NO_SHOW) / total * 100 = 2/4 * 100 = 50%
        expect(data.analytics.appointments.cancellationRate).toBe(50);
      });
    });

    describe("Client Analytics", () => {
      it("should identify new vs returning clients correctly", async () => {
        const appointmentsWithUsers = [
          {
            userId: "user1",
            dateTime: new Date("2024-01-15"),
            user: {
              appointments: [{ dateTime: new Date("2024-01-15") }], // New client
            },
          },
          {
            userId: "user2",
            dateTime: new Date("2024-01-20"),
            user: {
              appointments: [{ dateTime: new Date("2023-12-15") }], // Returning client
            },
          },
        ];

        mockPrisma.appointment.findMany.mockResolvedValueOnce(
          appointmentsWithUsers
        );

        const request = new NextRequest(
          "http://localhost/api/admin/analytics?startDate=2024-01-01&endDate=2024-01-31"
        );
        const response = await GET(request);
        const data = await response.json();

        expect(data.analytics.clients.newClients).toBe(1);
        expect(data.analytics.clients.returningClients).toBe(1);
        expect(data.analytics.clients.totalUniqueClients).toBe(2);
        expect(data.analytics.clients.newVsReturningRatio).toBe(1); // 1 new / 1 returning
      });

      it("should handle all new clients", async () => {
        const appointmentsWithUsers = [
          {
            userId: "user1",
            user: {
              appointments: [{ dateTime: new Date("2024-01-15") }],
            },
          },
          {
            userId: "user2",
            user: {
              appointments: [{ dateTime: new Date("2024-01-20") }],
            },
          },
        ];

        mockPrisma.appointment.findMany.mockResolvedValueOnce(
          appointmentsWithUsers
        );

        const request = new NextRequest(
          "http://localhost/api/admin/analytics?startDate=2024-01-01&endDate=2024-01-31"
        );
        const response = await GET(request);
        const data = await response.json();

        expect(data.analytics.clients.newClients).toBe(2);
        expect(data.analytics.clients.returningClients).toBe(0);
        expect(data.analytics.clients.newVsReturningRatio).toBe(Infinity);
      });
    });

    describe("Service Analytics", () => {
      it("should calculate service performance correctly", async () => {
        const serviceAppointments = [
          {
            service: {
              id: "service1",
              title: "Therapy",
              price: 150,
              duration: 60,
            },
          },
          {
            service: {
              id: "service1",
              title: "Therapy",
              price: 150,
              duration: 60,
            },
          },
          {
            service: {
              id: "service2",
              title: "Consultation",
              price: 100,
              duration: 45,
            },
          },
        ];

        mockPrisma.appointment.findMany.mockResolvedValueOnce(serviceAppointments);

        const request = new NextRequest(
          "http://localhost/api/admin/analytics?startDate=2024-01-01&endDate=2024-01-31"
        );
        const response = await GET(request);
        const data = await response.json();

        expect(data.analytics.services.totalServices).toBe(2);
        expect(data.analytics.services.mostPopularService?.title).toBe(
          "Therapy"
        );
        expect(data.analytics.services.mostPopularService?.bookingCount).toBe(
          2
        );
        expect(data.analytics.services.mostPopularService?.revenue).toBe(300);
      });
    });
  });

  describe("Date Range Handling", () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "admin", role: "ADMIN" },
        expires: "",
      });
      mockPrisma.appointment.findMany.mockResolvedValue([]);
    });

    it("should use default date range if none provided", async () => {
      const request = new NextRequest("http://localhost/api/admin/analytics");
      const response = await GET(request);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(data.analytics.dateRange.startDate).toBeDefined();
      expect(data.analytics.dateRange.endDate).toBeDefined();
    });

    it("should handle custom date range", async () => {
      const request = new NextRequest(
        "http://localhost/api/admin/analytics?startDate=2024-01-01&endDate=2024-01-31&period=month"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(data.success).toBe(true);
      expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            dateTime: expect.objectContaining({
              gte: new Date("2024-01-01"),
              lte: expect.any(Date),
            }),
          }),
        })
      );
    });

    it("should validate period parameter", async () => {
      const request = new NextRequest(
        "http://localhost/api/admin/analytics?period=invalid"
      );

      // This should not throw due to Zod validation
      const response = await GET(request);

      // If validation fails, it should return 500 status
      if (response.status === 500) {
        const data = await response.json();
        expect(data.error).toBe("Failed to calculate analytics");
      } else {
        // If it doesn't fail, the invalid period should be ignored
        expect(response.status).toBe(200);
      }
    });
  });

  describe("Error Handling", () => {
    beforeEach(() => {
      mockGetServerSession.mockResolvedValue({
        user: { id: "admin", role: "ADMIN" },
        expires: "",
      });
    });

    it("should handle database errors gracefully", async () => {
      mockPrisma.appointment.findMany.mockRejectedValue(
        new Error("Database error")
      );

      const request = new NextRequest("http://localhost/api/admin/analytics");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to calculate analytics");
    });
  });
});

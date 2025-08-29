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
    user: {
      count: jest.fn(),
    },
    appointment: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    contactSubmission: {
      count: jest.fn(),
    },
  },
}));

// Create properly typed mocks
const mockGetServerSession = getServerSession as jest.MockedFunction<
  typeof getServerSession
>;
import { prisma } from "@/lib/db";

// Create typed Prisma mock
const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe("/api/admin/dashboard-metrics", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    // Reset all prisma mocks
    Object.values(mockPrisma.user).forEach(fn => {
      if (typeof fn.mockReset === "function") fn.mockReset();
    });
    Object.values(mockPrisma.appointment).forEach(fn => {
      if (typeof fn.mockReset === "function") fn.mockReset();
    });
    Object.values(mockPrisma.contactSubmission).forEach(fn => {
      if (typeof fn.mockReset === "function") fn.mockReset();
    });
    // Set up default mocks
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: "admin", role: "ADMIN" },
      expires: "",
    });
  });

  afterEach(async () => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useRealTimers(); // Clean up fake timers if used
    // Clean up any pending operations
    await Promise.resolve();
  });

  describe("Authentication", () => {
    it("should return 401 if no session", async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost/api/admin/dashboard-metrics"
      );
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

      const request = new NextRequest(
        "http://localhost/api/admin/dashboard-metrics"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
    });
  });

  describe("Metrics Calculations", () => {
    const mockDate = new Date("2024-01-15T10:00:00Z");

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(mockDate);

      // Setup default mock responses
      mockPrisma.user.count.mockResolvedValue(50);
      mockPrisma.appointment.count
        .mockResolvedValueOnce(5) // appointmentsToday
        .mockResolvedValueOnce(8) // pendingAppointments
        .mockResolvedValueOnce(12) // thisWeekAppointments
        .mockResolvedValueOnce(45); // completedAppointments
      mockPrisma.contactSubmission.count.mockResolvedValue(3);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("should return all basic metrics correctly", async () => {
      const thisMonthAppointments = [
        { service: { price: 150 } },
        { service: { price: 200 } },
      ];
      const lastMonthAppointments = [{ service: { price: 100 } }];

      mockPrisma.appointment.findMany
        .mockResolvedValueOnce(thisMonthAppointments as any)
        .mockResolvedValueOnce(lastMonthAppointments as any)
        .mockResolvedValueOnce([] as any); // thisMonthAppointments for client analysis

      const request = new NextRequest(
        "http://localhost/api/admin/dashboard-metrics"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.metrics).toEqual(
        expect.objectContaining({
          totalClients: 50,
          appointmentsToday: 5,
          pendingAppointments: 8,
          unreadMessages: 3,
          completedAppointments: 45,
          thisMonthRevenue: 350,
          lastMonthRevenue: 100,
          revenueChange: 250, // ((350-100)/100)*100
        })
      );
    });

    it("should calculate utilization rate correctly", async () => {
      // Mock the date to be a Monday (day 1) for consistent week calculation
      const monday = new Date("2024-01-15T10:00:00Z"); // This is a Monday
      jest.setSystemTime(monday);

      mockPrisma.appointment.findMany.mockResolvedValue([] as any);

      const request = new NextRequest(
        "http://localhost/api/admin/dashboard-metrics"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(data.metrics.bookedSlotsThisWeek).toBe(12);
      expect(data.metrics.utilizationRate).toBeGreaterThanOrEqual(0);
      expect(data.metrics.availableSlots).toBeGreaterThan(0);
    });

    it("should handle client ratio calculations", async () => {
      const thisMonthAppointments = [
        { service: { price: 150 } },
        { service: { price: 200 } },
      ];
      const lastMonthAppointments = [{ service: { price: 100 } }];

      // Mock appointments with user data for client analysis
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
          dateTime: new Date("2024-01-16"),
          user: {
            appointments: [{ dateTime: new Date("2023-12-15") }], // Returning client
          },
        },
      ];

      mockPrisma.appointment.findMany
        .mockResolvedValueOnce(thisMonthAppointments)
        .mockResolvedValueOnce(lastMonthAppointments)
        .mockResolvedValueOnce(appointmentsWithUsers as any);

      const request = new NextRequest(
        "http://localhost/api/admin/dashboard-metrics"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(data.metrics.newClientsThisMonth).toBe(1);
      expect(data.metrics.returningClientsThisMonth).toBe(1);
      expect(data.metrics.clientRatio).toBe(100); // (1/1)*100
    });

    it("should handle zero revenue scenario", async () => {
      mockPrisma.appointment.findMany
        .mockResolvedValueOnce([]) // thisMonthAppointments
        .mockResolvedValueOnce([]) // lastMonthAppointments
        .mockResolvedValueOnce([]); // client analysis

      const request = new NextRequest(
        "http://localhost/api/admin/dashboard-metrics"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(data.metrics.thisMonthRevenue).toBe(0);
      expect(data.metrics.lastMonthRevenue).toBe(0);
      expect(data.metrics.revenueChange).toBe(0);
    });

    it("should handle division by zero in revenue calculations", async () => {
      const thisMonthAppointments = [{ service: { price: 150 } }];

      mockPrisma.appointment.findMany
        .mockResolvedValueOnce(thisMonthAppointments) // Current month: 150
        .mockResolvedValueOnce([]) // Last month: 0
        .mockResolvedValueOnce([]);

      const request = new NextRequest(
        "http://localhost/api/admin/dashboard-metrics"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(data.metrics.thisMonthRevenue).toBe(150);
      expect(data.metrics.lastMonthRevenue).toBe(0);
      expect(data.metrics.revenueChange).toBe(100); // Should be 100% when previous is 0
    });

    it("should handle client ratio edge cases", async () => {
      const thisMonthAppointments = [{ service: { price: 150 } }];
      const lastMonthAppointments = [{ service: { price: 100 } }];

      // All new clients scenario
      const allNewClientsAppointments = [
        {
          userId: "user1",
          user: {
            appointments: [{ dateTime: new Date("2024-01-15") }],
          },
        },
      ];

      mockPrisma.appointment.findMany
        .mockResolvedValueOnce(thisMonthAppointments)
        .mockResolvedValueOnce(lastMonthAppointments)
        .mockResolvedValueOnce(allNewClientsAppointments as any);

      const request = new NextRequest(
        "http://localhost/api/admin/dashboard-metrics"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(data.metrics.newClientsThisMonth).toBe(1);
      expect(data.metrics.returningClientsThisMonth).toBe(0);
      expect(data.metrics.clientRatio).toBe(100); // Should be 100 when all new
    });
  });

  describe("Date Range Calculations", () => {
    it("should use correct date ranges for calculations", async () => {
      const fixedDate = new Date("2024-02-15T10:00:00Z");
      jest.useFakeTimers();
      jest.setSystemTime(fixedDate);

      mockPrisma.appointment.findMany.mockResolvedValue([] as any);
      mockPrisma.appointment.count.mockResolvedValue(0);

      const request = new NextRequest(
        "http://localhost/api/admin/dashboard-metrics"
      );
      await GET(request);

      // Verify that the correct date ranges are used in queries
      expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            dateTime: expect.objectContaining({
              gte: expect.any(Date),
              lt: expect.any(Date),
            }),
          }),
        })
      );

      jest.useRealTimers();
    });
  });

  describe("Error Handling", () => {
    it("should handle database errors gracefully", async () => {
      mockPrisma.user.count.mockRejectedValue(
        new Error("Database connection failed")
      );

      const request = new NextRequest(
        "http://localhost/api/admin/dashboard-metrics"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to calculate metrics");
    });

    it("should handle partial data failures", async () => {
      // Setup some successful calls and one failure
      mockPrisma.user.count.mockResolvedValue(50);
      mockPrisma.appointment.count.mockRejectedValue(
        new Error("Appointment query failed")
      );

      const request = new NextRequest(
        "http://localhost/api/admin/dashboard-metrics"
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to calculate metrics");
    });
  });

  describe("Performance Considerations", () => {
    it("should make expected number of database calls", async () => {
      mockPrisma.appointment.findMany.mockResolvedValue([] as any);
      mockPrisma.appointment.count.mockResolvedValue(0);

      const request = new NextRequest(
        "http://localhost/api/admin/dashboard-metrics"
      );
      await GET(request);

      // Verify we're not making excessive database calls
      expect(mockPrisma.user.count).toHaveBeenCalledTimes(1);
      expect(mockPrisma.contactSubmission.count).toHaveBeenCalledTimes(1);
      // appointment.count is called multiple times for different metrics
      expect(mockPrisma.appointment.count).toHaveBeenCalledTimes(4);
      // appointment.findMany is called for revenue and client calculations
      expect(mockPrisma.appointment.findMany).toHaveBeenCalledTimes(3);
    });
  });
});

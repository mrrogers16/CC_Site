import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";
import { GET } from "@/app/api/appointments/route";

// Mock dependencies
jest.mock("next-auth");
jest.mock("@/lib/db");
jest.mock("@/lib/logger");

const mockGetServerSession = getServerSession as jest.MockedFunction<
  typeof getServerSession
>;

// Create properly typed mock Prisma
const mockPrisma = {
  appointment: {
    findMany: jest.fn(),
    count: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
  },
} as any;

describe("Appointments API - History Integration", () => {
  const mockSession = {
    user: {
      id: "user123",
      email: "test@example.com",
      name: "Test User",
    },
  };

  const mockAppointments = [
    {
      id: "appointment1",
      userId: "user123",
      serviceId: "service1",
      dateTime: new Date("2024-01-15T10:00:00Z"),
      status: "COMPLETED",
      notes: "Completed session",
      createdAt: new Date("2024-01-10T10:00:00Z"),
      updatedAt: new Date("2024-01-15T11:00:00Z"),
      service: {
        title: "Individual Therapy",
        duration: 60,
        price: 120.0,
      },
    },
    {
      id: "appointment2",
      userId: "user123",
      serviceId: "service2",
      dateTime: new Date("2024-01-08T14:00:00Z"),
      status: "CANCELLED",
      notes: "Cancelled by client",
      createdAt: new Date("2024-01-05T10:00:00Z"),
      updatedAt: new Date("2024-01-08T12:00:00Z"),
      service: {
        title: "Couples Therapy",
        duration: 90,
        price: 180.0,
      },
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockGetServerSession.mockResolvedValue(mockSession);
    mockPrisma.appointment.findMany.mockResolvedValue(mockAppointments as any);
    mockPrisma.appointment.count.mockResolvedValue(2);

    // Setup Prisma mock
    (prisma as any).appointment = mockPrisma.appointment;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("History Appointments Retrieval", () => {
    test("fetches past appointments when upcoming=false", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/appointments?upcoming=false"
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.appointments).toHaveLength(2);

      // Verify the where clause includes past appointments
      expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith({
        where: {
          userId: "user123",
          dateTime: { lt: expect.any(Date) },
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
        orderBy: {
          dateTime: "desc", // Should be desc for history
        },
        skip: 0,
        take: 10,
      });
    });

    test("applies status filter correctly", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/appointments?upcoming=false&status=COMPLETED"
      );

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith({
        where: {
          userId: "user123",
          dateTime: { lt: expect.any(Date) },
          status: "COMPLETED",
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
        orderBy: {
          dateTime: "desc",
        },
        skip: 0,
        take: 10,
      });
    });

    test("applies service filter correctly", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/appointments?upcoming=false&serviceId=service1"
      );

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith({
        where: {
          userId: "user123",
          dateTime: { lt: expect.any(Date) },
          serviceId: "service1",
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
        orderBy: {
          dateTime: "desc",
        },
        skip: 0,
        take: 10,
      });
    });

    test("applies search filter correctly", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/appointments?upcoming=false&search=therapy"
      );

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith({
        where: {
          userId: "user123",
          dateTime: { lt: expect.any(Date) },
          notes: { contains: "therapy", mode: "insensitive" },
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
        orderBy: {
          dateTime: "desc",
        },
        skip: 0,
        take: 10,
      });
    });

    test("applies date range filter correctly", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/appointments?upcoming=false&dateRange=last_month"
      );

      const response = await GET(request);

      expect(response.status).toBe(200);

      const call = mockPrisma.appointment.findMany.mock.calls[0][0];
      expect(call.where.dateTime).toHaveProperty("lt");
      expect(call.where.dateTime).toHaveProperty("gte");
    });

    test("handles pagination correctly for history", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/appointments?upcoming=false&page=2"
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith({
        where: {
          userId: "user123",
          dateTime: { lt: expect.any(Date) },
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
        orderBy: {
          dateTime: "desc",
        },
        skip: 10, // (page 2 - 1) * pageSize
        take: 10,
      });

      expect(data.data.pagination.page).toBe(2);
    });
  });

  describe("Date Range Filtering", () => {
    test("calculates last_month date range correctly", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/appointments?upcoming=false&dateRange=last_month"
      );

      await GET(request);

      const call = mockPrisma.appointment.findMany.mock.calls[0][0];
      const whereClause = call.where;

      expect(whereClause.dateTime).toHaveProperty("gte");
      expect(whereClause.dateTime).toHaveProperty("lt");

      // Verify the date range is approximately correct (within a day)
      const now = new Date();
      const expectedStart = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        now.getDate()
      );
      const actualStart = whereClause.dateTime.gte;

      expect(
        Math.abs(actualStart.getTime() - expectedStart.getTime())
      ).toBeLessThan(24 * 60 * 60 * 1000);
    });

    test("calculates last_3_months date range correctly", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/appointments?upcoming=false&dateRange=last_3_months"
      );

      await GET(request);

      const call = mockPrisma.appointment.findMany.mock.calls[0][0];
      const whereClause = call.where;

      const now = new Date();
      const expectedStart = new Date(
        now.getFullYear(),
        now.getMonth() - 3,
        now.getDate()
      );
      const actualStart = whereClause.dateTime.gte;

      expect(
        Math.abs(actualStart.getTime() - expectedStart.getTime())
      ).toBeLessThan(24 * 60 * 60 * 1000);
    });

    test("calculates last_6_months date range correctly", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/appointments?upcoming=false&dateRange=last_6_months"
      );

      await GET(request);

      const call = mockPrisma.appointment.findMany.mock.calls[0][0];
      const whereClause = call.where;

      const now = new Date();
      const expectedStart = new Date(
        now.getFullYear(),
        now.getMonth() - 6,
        now.getDate()
      );
      const actualStart = whereClause.dateTime.gte;

      expect(
        Math.abs(actualStart.getTime() - expectedStart.getTime())
      ).toBeLessThan(24 * 60 * 60 * 1000);
    });

    test("calculates last_year date range correctly", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/appointments?upcoming=false&dateRange=last_year"
      );

      await GET(request);

      const call = mockPrisma.appointment.findMany.mock.calls[0][0];
      const whereClause = call.where;

      const now = new Date();
      const expectedStart = new Date(
        now.getFullYear() - 1,
        now.getMonth(),
        now.getDate()
      );
      const actualStart = whereClause.dateTime.gte;

      expect(
        Math.abs(actualStart.getTime() - expectedStart.getTime())
      ).toBeLessThan(24 * 60 * 60 * 1000);
    });
  });

  describe("Combined Filters", () => {
    test("applies multiple filters simultaneously", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/appointments?upcoming=false&status=COMPLETED&serviceId=service1&dateRange=last_month&search=therapy"
      );

      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith({
        where: {
          userId: "user123",
          dateTime: {
            lt: expect.any(Date),
            gte: expect.any(Date),
          },
          status: "COMPLETED",
          serviceId: "service1",
          notes: { contains: "therapy", mode: "insensitive" },
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
        orderBy: {
          dateTime: "desc",
        },
        skip: 0,
        take: 10,
      });
    });
  });

  describe("Response Format", () => {
    test("returns properly formatted history appointments", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/appointments?upcoming=false"
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        success: true,
        data: {
          appointments: [
            {
              id: "appointment1",
              dateTime: "2024-01-15T10:00:00.000Z",
              status: "COMPLETED",
              notes: "Completed session",
              service: {
                title: "Individual Therapy",
                duration: 60,
                price: "120",
              },
              createdAt: "2024-01-10T10:00:00.000Z",
              updatedAt: "2024-01-15T11:00:00.000Z",
            },
            {
              id: "appointment2",
              dateTime: "2024-01-08T14:00:00.000Z",
              status: "CANCELLED",
              notes: "Cancelled by client",
              service: {
                title: "Couples Therapy",
                duration: 90,
                price: "180",
              },
              createdAt: "2024-01-05T10:00:00.000Z",
              updatedAt: "2024-01-08T12:00:00.000Z",
            },
          ],
          pagination: {
            page: 1,
            limit: 10,
            total: 2,
            totalPages: 1,
            hasNext: false,
            hasPrev: false,
          },
        },
      });
    });
  });

  describe("Authentication", () => {
    test("returns 401 when user is not authenticated", async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost:3000/api/appointments?upcoming=false"
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
      expect(data.message).toBe("Please sign in to view appointments");
    });

    test("filters appointments by authenticated user ID", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/appointments?upcoming=false"
      );

      await GET(request);

      expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: "user123",
          }),
        })
      );
    });
  });

  describe("Error Handling", () => {
    test("handles database errors gracefully", async () => {
      mockPrisma.appointment.findMany.mockRejectedValue(
        new Error("Database error")
      );

      const request = new NextRequest(
        "http://localhost:3000/api/appointments?upcoming=false"
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal Server Error");
    });

    test("handles invalid pagination parameters", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/appointments?upcoming=false&page=invalid"
      );

      const response = await GET(request);

      expect(response.status).toBe(200);
      // Should default to page 1 when invalid page is provided
      expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0, // page 1
        })
      );
    });
  });
});

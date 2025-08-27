import { NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { GET } from "@/app/api/appointments/route";
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
    findMany: jest.fn(),
    count: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
  },
} as any;

describe("/api/appointments GET endpoint", () => {
  const mockSession = {
    user: {
      id: "user123",
      email: "john@example.com",
      name: "John Doe",
      role: "CLIENT",
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetServerSession.mockResolvedValue(mockSession);

    // Setup Prisma mock
    (prisma as any).appointment = mockPrisma.appointment;
  });

  const createMockRequest = (searchParams: Record<string, string> = {}) => {
    const url = new URL("http://localhost:3000/api/appointments");
    Object.entries(searchParams).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });

    return new NextRequest(url.toString()) as NextRequest;
  };

  it("returns 401 when user is not authenticated", async () => {
    mockGetServerSession.mockResolvedValue(null);
    const request = createMockRequest();

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
    expect(data.message).toBe("Please sign in to view appointments");
  });

  it("fetches upcoming appointments successfully", async () => {
    const mockAppointments = [
      {
        id: "apt123",
        dateTime: new Date("2025-12-25T10:00:00Z"),
        status: "CONFIRMED",
        notes: "Test appointment",
        service: {
          title: "Individual Counseling",
          duration: 60,
          price: 120.0,
        },
        createdAt: new Date("2025-01-01T00:00:00Z"),
        updatedAt: new Date("2025-01-01T00:00:00Z"),
      },
    ];

    mockPrisma.appointment.findMany.mockResolvedValue(mockAppointments);
    mockPrisma.appointment.count.mockResolvedValue(1);

    const request = createMockRequest({ upcoming: "true" });
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.appointments).toHaveLength(1);
    expect(data.data.appointments[0].id).toBe("apt123");
    expect(data.data.appointments[0].service.title).toBe(
      "Individual Counseling"
    );
  });

  it("applies upcoming filter correctly", async () => {
    const request = createMockRequest({ upcoming: "true" });
    await GET(request);

    expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith({
      where: {
        userId: "user123",
        status: { in: ["PENDING", "CONFIRMED"] },
        dateTime: { gte: expect.any(Date) },
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
      orderBy: { dateTime: "asc" },
      skip: 0,
      take: 10,
    });
  });

  it("applies limit parameter correctly", async () => {
    const request = createMockRequest({ limit: "1" });
    await GET(request);

    expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 1,
        skip: 0,
      })
    );
  });

  it("applies pagination correctly", async () => {
    const request = createMockRequest({ page: "2" });
    await GET(request);

    expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 10,
      })
    );
  });

  it("returns pagination data when not using limit", async () => {
    mockPrisma.appointment.findMany.mockResolvedValue([]);
    mockPrisma.appointment.count.mockResolvedValue(25);

    const request = createMockRequest({ page: "2" });
    const response = await GET(request);
    const data = await response.json();

    expect(data.data.pagination).toEqual({
      page: 2,
      limit: 10,
      total: 25,
      totalPages: 3,
      hasNext: true,
      hasPrev: true,
    });
  });

  it("does not return pagination data when using limit", async () => {
    mockPrisma.appointment.findMany.mockResolvedValue([]);
    mockPrisma.appointment.count.mockResolvedValue(25);

    const request = createMockRequest({ limit: "5" });
    const response = await GET(request);
    const data = await response.json();

    expect(data.data.pagination).toBeUndefined();
  });

  it("filters by user ID correctly", async () => {
    const request = createMockRequest();
    await GET(request);

    expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: "user123",
        }),
      })
    );
  });

  it("only includes PENDING and CONFIRMED appointments when upcoming=true", async () => {
    const request = createMockRequest({ upcoming: "true" });
    await GET(request);

    expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: { in: ["PENDING", "CONFIRMED"] },
        }),
      })
    );
  });

  it("orders appointments by date ascending for upcoming, descending for history", async () => {
    // Test upcoming appointments (ascending)
    const upcomingRequest = createMockRequest({ upcoming: "true" });
    await GET(upcomingRequest);

    expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { dateTime: "asc" },
      })
    );

    jest.clearAllMocks();
    mockPrisma.appointment.findMany.mockResolvedValue([]);
    mockPrisma.appointment.count.mockResolvedValue(0);

    // Test history appointments (descending - default when upcoming=false)
    const historyRequest = createMockRequest({ upcoming: "false" });
    await GET(historyRequest);

    expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { dateTime: "desc" },
      })
    );
  });

  it("includes service information in response", async () => {
    const request = createMockRequest();
    await GET(request);

    expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: {
          service: {
            select: {
              title: true,
              duration: true,
              price: true,
            },
          },
        },
      })
    );
  });

  it("formats response data correctly", async () => {
    const mockAppointment = {
      id: "apt123",
      dateTime: new Date("2025-12-25T10:00:00Z"),
      status: "CONFIRMED",
      notes: "Test appointment",
      service: {
        title: "Individual Counseling",
        duration: 60,
        price: 120.5,
      },
      createdAt: new Date("2025-01-01T00:00:00Z"),
      updatedAt: new Date("2025-01-02T00:00:00Z"),
    };

    mockPrisma.appointment.findMany.mockResolvedValue([mockAppointment]);
    mockPrisma.appointment.count.mockResolvedValue(1);

    const request = createMockRequest();
    const response = await GET(request);
    const data = await response.json();

    const formattedAppointment = data.data.appointments[0];
    expect(formattedAppointment).toEqual({
      id: "apt123",
      dateTime: "2025-12-25T10:00:00.000Z",
      status: "CONFIRMED",
      notes: "Test appointment",
      service: {
        title: "Individual Counseling",
        duration: 60,
        price: "120.5",
      },
      createdAt: "2025-01-01T00:00:00.000Z",
      updatedAt: "2025-01-02T00:00:00.000Z",
    });
  });

  it("handles database errors properly", async () => {
    const dbError = new Error("Database connection failed");
    mockPrisma.appointment.findMany.mockRejectedValue(dbError);

    const request = createMockRequest();

    const response = await GET(request);
    expect(response.status).toBe(500);

    const data = await response.json();
    expect(data.error).toBe("Internal Server Error");

    expect(mockLogger.error).toHaveBeenCalledWith(
      "Error fetching appointments",
      dbError
    );
  });

  it("logs successful operation", async () => {
    mockPrisma.appointment.findMany.mockResolvedValue([]);
    mockPrisma.appointment.count.mockResolvedValue(0);

    const request = createMockRequest({ upcoming: "true" });
    await GET(request);

    expect(mockLogger.info).toHaveBeenCalledWith("Fetching appointments", {
      userId: "user123",
      upcoming: true,
      status: null,
      serviceId: null,
      dateRange: null,
      search: null,
      limit: undefined,
      page: 1,
    });

    expect(mockLogger.info).toHaveBeenCalledWith(
      "Appointments fetched successfully",
      {
        userId: "user123",
        count: 0,
        totalCount: 0,
      }
    );
  });

  it("handles missing query parameters with defaults", async () => {
    mockPrisma.appointment.findMany.mockResolvedValue([]);
    mockPrisma.appointment.count.mockResolvedValue(0);

    const request = createMockRequest();
    await GET(request);

    expect(mockLogger.info).toHaveBeenCalledWith("Fetching appointments", {
      userId: "user123",
      upcoming: false,
      status: null,
      serviceId: null,
      dateRange: null,
      search: null,
      limit: undefined,
      page: 1,
    });
  });

  it("handles empty result set", async () => {
    mockPrisma.appointment.findMany.mockResolvedValue([]);
    mockPrisma.appointment.count.mockResolvedValue(0);

    const request = createMockRequest();
    const response = await GET(request);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data.appointments).toEqual([]);
    expect(data.data.pagination.total).toBe(0);
  });
});

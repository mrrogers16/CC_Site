import { NextRequest } from "next/server";
import { GET } from "@/app/api/appointments/available/route";
import { generateTimeSlots } from "@/lib/utils/time-slots";

// Mock dependencies
jest.mock("@/lib/utils/time-slots", () => ({
  generateTimeSlots: jest.fn(),
}));

jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

const mockGenerateTimeSlots = generateTimeSlots as jest.MockedFunction<
  typeof generateTimeSlots
>;

describe("/api/appointments/available", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockRequest = (searchParams: URLSearchParams) => {
    return {
      url: `http://localhost:3000/api/appointments/available?${searchParams.toString()}`,
    } as NextRequest;
  };

  describe("GET /api/appointments/available", () => {
    it("should return available slots for a valid date", async () => {
      const mockSlots = [
        { dateTime: new Date("2025-08-25T09:00:00Z"), available: true },
        { dateTime: new Date("2025-08-25T09:15:00Z"), available: true },
        {
          dateTime: new Date("2025-08-25T10:00:00Z"),
          available: false,
          reason: "Booked",
        },
      ];

      mockGenerateTimeSlots.mockResolvedValue(mockSlots);

      const searchParams = new URLSearchParams({ date: "2025-08-25" });
      const request = mockRequest(searchParams);
      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.date).toBe("2025-08-25");
      expect(responseData.availableSlots).toBe(2);
      expect(responseData.totalSlots).toBe(3);
      expect(responseData.slots).toHaveLength(3);

      // Check slot formatting
      expect(responseData.slots[0]).toEqual({
        dateTime: "2025-08-25T09:00:00.000Z",
        available: true,
        displayTime: "9:00 AM",
      });

      expect(responseData.slots[1]).toEqual({
        dateTime: "2025-08-25T09:15:00.000Z",
        available: true,
        displayTime: "9:15 AM",
      });

      // Verify generateTimeSlots was called correctly with local date
      expect(mockGenerateTimeSlots).toHaveBeenCalledWith(
        new Date(2025, 7, 25), // Local date (month is 0-indexed)
        undefined
      );
    });

    it("should return available slots with service ID", async () => {
      const mockSlots = [
        { dateTime: new Date("2025-08-25T14:00:00Z"), available: true },
        { dateTime: new Date("2025-08-25T15:00:00Z"), available: true },
      ];

      mockGenerateTimeSlots.mockResolvedValue(mockSlots);

      const searchParams = new URLSearchParams({
        date: "2025-08-25",
        serviceId: "clxxxxxxxxxxxxxxxxxxxxxxx",
      });
      const request = mockRequest(searchParams);
      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.serviceId).toBe("clxxxxxxxxxxxxxxxxxxxxxxx");
      expect(responseData.slots).toHaveLength(2);

      // Check PM time formatting
      expect(responseData.slots[0].displayTime).toBe("2:00 PM");
      expect(responseData.slots[1].displayTime).toBe("3:00 PM");

      expect(mockGenerateTimeSlots).toHaveBeenCalledWith(
        new Date(2025, 7, 25), // Local date (month is 0-indexed)
        "clxxxxxxxxxxxxxxxxxxxxxxx"
      );
    });

    it("should return empty slots array when no slots available", async () => {
      mockGenerateTimeSlots.mockResolvedValue([]);

      const searchParams = new URLSearchParams({ date: "2025-08-24" }); // Sunday
      const request = mockRequest(searchParams);
      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.availableSlots).toBe(0);
      expect(responseData.slots).toHaveLength(0);
    });

    it("should return 400 when date parameter is missing", async () => {
      const searchParams = new URLSearchParams(); // No date
      const request = mockRequest(searchParams);
      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe("ValidationError");
      expect(responseData.message).toBe("Date parameter is required");
    });

    it("should return 400 when date parameter is invalid", async () => {
      const searchParams = new URLSearchParams({ date: "invalid-date" });
      const request = mockRequest(searchParams);
      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe("Validation Error");
    });

    it("should return 400 when date is in the past", async () => {
      const searchParams = new URLSearchParams({ date: "2020-01-01" });
      const request = mockRequest(searchParams);
      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe("Validation Error");
    });

    it("should handle invalid service ID gracefully", async () => {
      const searchParams = new URLSearchParams({
        date: "2025-08-25",
        serviceId: "invalid-service-id",
      });
      const request = mockRequest(searchParams);
      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe("Validation Error");
    });

    it("should handle time slot utility errors gracefully", async () => {
      mockGenerateTimeSlots.mockRejectedValue(
        new Error("Database connection failed")
      );

      const searchParams = new URLSearchParams({ date: "2025-08-25" });
      const request = mockRequest(searchParams);
      const response = await GET(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.error).toBe("Internal Server Error");
    });

    it("should format display times correctly for different hours", async () => {
      const mockSlots = [
        { dateTime: new Date("2025-08-25T08:30:00Z"), available: true }, // 8:30 AM
        { dateTime: new Date("2025-08-25T12:00:00Z"), available: true }, // 12:00 PM
        { dateTime: new Date("2025-08-25T13:45:00Z"), available: true }, // 1:45 PM
        { dateTime: new Date("2025-08-25T00:00:00Z"), available: true }, // 12:00 AM
      ];

      mockGenerateTimeSlots.mockResolvedValue(mockSlots);

      const searchParams = new URLSearchParams({ date: "2025-08-25" });
      const request = mockRequest(searchParams);
      const response = await GET(request);
      const responseData = await response.json();

      expect(responseData.slots[0].displayTime).toBe("8:30 AM");
      expect(responseData.slots[1].displayTime).toBe("12:00 PM");
      expect(responseData.slots[2].displayTime).toBe("1:45 PM");
      expect(responseData.slots[3].displayTime).toBe("12:00 AM");
    });
  });
});

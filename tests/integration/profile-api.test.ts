import { NextRequest } from "next/server";
import { GET, PUT } from "@/app/api/user/profile/route";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/db";

// Mock dependencies
jest.mock("next-auth");
jest.mock("@/lib/db");
jest.mock("@/lib/logger");

const mockGetServerSession = getServerSession as jest.MockedFunction<
  typeof getServerSession
>;

// Create properly typed mock Prisma
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
} as any;

const mockSession = {
  user: {
    id: "test-user-id",
    email: "test@example.com",
    name: "Test User",
  },
};

const mockUser = {
  id: "test-user-id",
  name: "John Doe",
  email: "john.doe@example.com",
  phone: "5551234567",
  emergencyContactName: "Jane Doe",
  emergencyContactPhone: "5559876543",
  emailNotifications: true,
  smsReminders: true,
  reminderTime: "24",
  createdAt: new Date("2024-01-01T00:00:00.000Z"),
  updatedAt: new Date("2024-01-01T00:00:00.000Z"),
};

describe("/api/user/profile", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup Prisma mock
    (prisma as any).user = mockPrisma.user;
  });

  describe("GET", () => {
    it("should successfully retrieve user profile", async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const request = new NextRequest("http://localhost:3000/api/user/profile");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual({
        id: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
        phone: mockUser.phone,
        emergencyContactName: mockUser.emergencyContactName,
        emergencyContactPhone: mockUser.emergencyContactPhone,
        emailNotifications: mockUser.emailNotifications,
        smsReminders: mockUser.smsReminders,
        reminderTime: mockUser.reminderTime,
        createdAt: mockUser.createdAt.toISOString(),
        updatedAt: mockUser.updatedAt.toISOString(),
      });

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: "test-user-id" },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          emergencyContactName: true,
          emergencyContactPhone: true,
          emailNotifications: true,
          smsReminders: true,
          reminderTime: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });

    it("should return 401 when not authenticated", async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/user/profile");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
      expect(data.message).toBe("Please sign in to view profile");
    });

    it("should return 404 when user not found", async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/user/profile");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("NotFoundError");
    });

    it("should handle missing optional fields gracefully", async () => {
      const userWithNulls = {
        ...mockUser,
        phone: null,
        emergencyContactName: null,
        emergencyContactPhone: null,
        emailNotifications: null,
        smsReminders: null,
        reminderTime: null,
      };

      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.user.findUnique.mockResolvedValue(userWithNulls);

      const request = new NextRequest("http://localhost:3000/api/user/profile");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.emailNotifications).toBe(true); // Default value
      expect(data.data.smsReminders).toBe(false); // Default value
      expect(data.data.reminderTime).toBe("24"); // Default value
    });

    it("should handle database errors", async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.user.findUnique.mockRejectedValue(new Error("Database error"));

      const request = new NextRequest("http://localhost:3000/api/user/profile");
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal Server Error");
    });
  });

  describe("PUT", () => {
    const validProfileData = {
      name: "John Smith",
      phone: "5551234567",
      emergencyContactName: "Jane Smith",
      emergencyContactPhone: "5559876543",
      communicationPreferences: {
        emailNotifications: true,
        smsReminders: false,
        reminderTime: "2",
      },
    };

    it("should successfully update user profile", async () => {
      const updatedUser = {
        ...mockUser,
        name: "John Smith",
        emergencyContactName: "Jane Smith",
        smsReminders: false,
        reminderTime: "2",
        updatedAt: new Date("2024-01-02T00:00:00.000Z"),
      };

      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue(updatedUser);

      const request = new NextRequest(
        "http://localhost:3000/api/user/profile",
        {
          method: "PUT",
          body: JSON.stringify(validProfileData),
        }
      );

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe("Profile updated successfully");
      expect(data.data.name).toBe("John Smith");
      expect(data.data.smsReminders).toBe(false);
      expect(data.data.reminderTime).toBe("2");

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: "test-user-id" },
        data: {
          name: "John Smith",
          phone: "5551234567",
          emergencyContactName: "Jane Smith",
          emergencyContactPhone: "5559876543",
          emailNotifications: true,
          smsReminders: false,
          reminderTime: "2",
          updatedAt: expect.any(Date),
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          emergencyContactName: true,
          emergencyContactPhone: true,
          emailNotifications: true,
          smsReminders: true,
          reminderTime: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });

    it("should return 401 when not authenticated", async () => {
      mockGetServerSession.mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost:3000/api/user/profile",
        {
          method: "PUT",
          body: JSON.stringify(validProfileData),
        }
      );

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("Unauthorized");
      expect(data.message).toBe("Please sign in to update profile");
    });

    it("should validate required fields", async () => {
      mockGetServerSession.mockResolvedValue(mockSession);

      const invalidData = {
        name: "", // Too short
        communicationPreferences: {
          emailNotifications: true,
          smsReminders: false,
          reminderTime: "24",
        },
      };

      const request = new NextRequest(
        "http://localhost:3000/api/user/profile",
        {
          method: "PUT",
          body: JSON.stringify(invalidData),
        }
      );

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("ValidationError");
    });

    it("should validate phone number format", async () => {
      mockGetServerSession.mockResolvedValue(mockSession);

      const invalidPhoneData = {
        ...validProfileData,
        phone: "123", // Too short
      };

      const request = new NextRequest(
        "http://localhost:3000/api/user/profile",
        {
          method: "PUT",
          body: JSON.stringify(invalidPhoneData),
        }
      );

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("ValidationError");
      expect(data.message).toBe("Please enter a valid 10-digit phone number");
    });

    it("should validate emergency contact phone format", async () => {
      mockGetServerSession.mockResolvedValue(mockSession);

      const invalidEmergencyPhoneData = {
        ...validProfileData,
        emergencyContactPhone: "abc123", // Invalid format
      };

      const request = new NextRequest(
        "http://localhost:3000/api/user/profile",
        {
          method: "PUT",
          body: JSON.stringify(invalidEmergencyPhoneData),
        }
      );

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("ValidationError");
      expect(data.message).toBe("Please enter a valid 10-digit phone number");
    });

    it("should validate name length", async () => {
      mockGetServerSession.mockResolvedValue(mockSession);

      const longNameData = {
        ...validProfileData,
        name: "A".repeat(101), // Too long
      };

      const request = new NextRequest(
        "http://localhost:3000/api/user/profile",
        {
          method: "PUT",
          body: JSON.stringify(longNameData),
        }
      );

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("ValidationError");
      expect(data.message).toBe("Name must be less than 100 characters");
    });

    it("should validate communication preferences", async () => {
      mockGetServerSession.mockResolvedValue(mockSession);

      const invalidPrefsData = {
        ...validProfileData,
        communicationPreferences: {
          emailNotifications: true,
          smsReminders: false,
          reminderTime: "invalid", // Invalid enum value
        },
      };

      const request = new NextRequest(
        "http://localhost:3000/api/user/profile",
        {
          method: "PUT",
          body: JSON.stringify(invalidPrefsData),
        }
      );

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("ValidationError");
    });

    it("should clean phone number formatting", async () => {
      const updatedUser = { ...mockUser, phone: "5551234567" };

      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue(updatedUser);

      const formattedPhoneData = {
        ...validProfileData,
        phone: "(555) 123-4567", // Formatted input
        emergencyContactPhone: "(555) 987-6543", // Formatted input
      };

      const request = new NextRequest(
        "http://localhost:3000/api/user/profile",
        {
          method: "PUT",
          body: JSON.stringify(formattedPhoneData),
        }
      );

      const response = await PUT(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            phone: "5551234567", // Cleaned
            emergencyContactPhone: "5559876543", // Cleaned
          }),
        })
      );
    });

    it("should handle empty optional fields", async () => {
      const updatedUser = {
        ...mockUser,
        phone: null,
        emergencyContactName: null,
        emergencyContactPhone: null,
      };

      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue(updatedUser);

      const dataWithEmptyFields = {
        name: "John Smith",
        phone: "", // Empty string
        emergencyContactName: "", // Empty string
        emergencyContactPhone: "", // Empty string
        communicationPreferences: {
          emailNotifications: true,
          smsReminders: false,
          reminderTime: "24",
        },
      };

      const request = new NextRequest(
        "http://localhost:3000/api/user/profile",
        {
          method: "PUT",
          body: JSON.stringify(dataWithEmptyFields),
        }
      );

      const response = await PUT(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            phone: null,
            emergencyContactName: null,
            emergencyContactPhone: null,
          }),
        })
      );
    });

    it("should return 404 when user not found", async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const request = new NextRequest(
        "http://localhost:3000/api/user/profile",
        {
          method: "PUT",
          body: JSON.stringify(validProfileData),
        }
      );

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("NotFoundError");
    });

    it("should handle database errors", async () => {
      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.user.findUnique.mockRejectedValue(new Error("Database error"));

      const request = new NextRequest(
        "http://localhost:3000/api/user/profile",
        {
          method: "PUT",
          body: JSON.stringify(validProfileData),
        }
      );

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Internal Server Error");
    });

    it("should handle malformed JSON", async () => {
      mockGetServerSession.mockResolvedValue(mockSession);

      const request = new NextRequest(
        "http://localhost:3000/api/user/profile",
        {
          method: "PUT",
          body: "invalid json",
        }
      );

      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("ValidationError");
    });

    it("should trim whitespace from string fields", async () => {
      const updatedUser = {
        ...mockUser,
        name: "John Smith",
        emergencyContactName: "Jane Smith",
      };

      mockGetServerSession.mockResolvedValue(mockSession);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue(updatedUser);

      const dataWithWhitespace = {
        ...validProfileData,
        name: "  John Smith  ", // Whitespace
        emergencyContactName: "  Jane Smith  ", // Whitespace
      };

      const request = new NextRequest(
        "http://localhost:3000/api/user/profile",
        {
          method: "PUT",
          body: JSON.stringify(dataWithWhitespace),
        }
      );

      const response = await PUT(request);

      expect(response.status).toBe(200);
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: "John Smith", // Trimmed
            emergencyContactName: "Jane Smith", // Trimmed
          }),
        })
      );
    });
  });
});

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { jest } from "@jest/globals";
import { useSession } from "next-auth/react";
import { ProfileSettings } from "@/components/dashboard/profile-settings";

// Mock next-auth - fix hoisting issue
jest.mock("next-auth/react", () => ({
  useSession: jest.fn(),
}));

const mockUseSession = require("next-auth/react")
  .useSession as jest.MockedFunction<any>;

// Mock fetch
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

const mockSession = {
  user: {
    id: "test-user-id",
    name: "John Doe",
    email: "john.doe@example.com",
  },
};

const mockProfileData = {
  success: true,
  data: {
    id: "test-user-id",
    name: "John Doe",
    email: "john.doe@example.com",
    phone: "5551234567",
    emergencyContactName: "Jane Doe",
    emergencyContactPhone: "5559876543",
    emailNotifications: true,
    smsReminders: true,
    reminderTime: "24",
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
  },
};

describe("ProfileSettings", () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.MockedFunction<typeof fetch>).mockReset();

    mockUseSession.mockReturnValue({
      data: mockSession,
      status: "authenticated" as const,
      update: jest.fn(),
    });
  });

  it("should render loading state initially", () => {
    (fetch as jest.MockedFunction<typeof fetch>).mockImplementation(
      () => new Promise(() => {}) // Never resolves to simulate loading
    );

    render(<ProfileSettings />);

    expect(screen.getByText("Profile Settings")).toBeInTheDocument();
    expect(
      screen.getByText("Manage your personal information and preferences")
    ).toBeInTheDocument();

    // Should show loading skeleton
    const skeletonElements = screen.getAllByRole("generic");
    expect(
      skeletonElements.some(el => el.className.includes("animate-pulse"))
    ).toBe(true);
  });

  it("should render form after loading profile data", async () => {
    (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockProfileData,
    });

    render(<ProfileSettings />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("John Doe")).toBeInTheDocument();
      expect(
        screen.getByDisplayValue("john.doe@example.com")
      ).toBeInTheDocument();
      expect(screen.getByDisplayValue("(555) 123-4567")).toBeInTheDocument();
    });

    expect(fetch).toHaveBeenCalledWith("/api/user/profile");
  });

  it("should format phone numbers correctly", async () => {
    (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockProfileData,
    });

    render(<ProfileSettings />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("(555) 123-4567")).toBeInTheDocument();
      expect(screen.getByDisplayValue("(555) 987-6543")).toBeInTheDocument();
    });
  });

  it("should show validation errors for invalid input", async () => {
    (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockProfileData,
    });

    render(<ProfileSettings />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("John Doe")).toBeInTheDocument();
    });

    // Clear name field to trigger validation error
    const nameInput = screen.getByLabelText(/full name/i);
    await user.clear(nameInput);
    await user.type(nameInput, "A"); // Too short

    await waitFor(() => {
      expect(
        screen.getByText("Name must be at least 2 characters")
      ).toBeInTheDocument();
    });
  });

  it("should validate phone number format", async () => {
    (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockProfileData,
    });

    render(<ProfileSettings />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("(555) 123-4567")).toBeInTheDocument();
    });

    // Enter invalid phone number
    const phoneInput = screen.getByLabelText(/phone number/i);
    await user.clear(phoneInput);
    await user.type(phoneInput, "123"); // Too short

    await waitFor(() => {
      expect(
        screen.getByText("Please enter a valid 10-digit phone number")
      ).toBeInTheDocument();
    });
  });

  it("should disable SMS reminders when no phone number", async () => {
    const profileDataNoPhone = {
      ...mockProfileData,
      data: {
        ...mockProfileData.data,
        phone: null,
      },
    };

    (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      json: async () => profileDataNoPhone,
    });

    render(<ProfileSettings />);

    await waitFor(() => {
      const smsCheckbox = screen.getByLabelText(/sms reminders/i);
      expect(smsCheckbox).toBeDisabled();
      expect(
        screen.getByText("Add a phone number to enable SMS reminders")
      ).toBeInTheDocument();
    });
  });

  it("should enable SMS reminders when phone number is present", async () => {
    (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockProfileData,
    });

    render(<ProfileSettings />);

    await waitFor(() => {
      const smsCheckbox = screen.getByLabelText(/sms reminders/i);
      expect(smsCheckbox).not.toBeDisabled();
      expect(
        screen.getByText("Receive appointment reminders via text message")
      ).toBeInTheDocument();
    });
  });

  it("should submit form with valid data", async () => {
    (fetch as jest.MockedFunction<typeof fetch>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockProfileData,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockProfileData.data,
          message: "Profile updated successfully",
        }),
      });

    render(<ProfileSettings />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("John Doe")).toBeInTheDocument();
    });

    // Modify the name to make form dirty
    const nameInput = screen.getByLabelText(/full name/i);
    await user.clear(nameInput);
    await user.type(nameInput, "John Smith");

    // Submit form
    const saveButton = screen.getByRole("button", { name: /save changes/i });
    expect(saveButton).not.toBeDisabled();
    await user.click(saveButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/user/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "John Smith",
          phone: "5551234567",
          emergencyContactName: "Jane Doe",
          emergencyContactPhone: "5559876543",
          communicationPreferences: {
            emailNotifications: true,
            smsReminders: true,
            reminderTime: "24",
          },
        }),
      });
    });
  });

  it("should show success message after successful save", async () => {
    (fetch as jest.MockedFunction<typeof fetch>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockProfileData,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockProfileData.data,
          message: "Profile updated successfully",
        }),
      });

    render(<ProfileSettings />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("John Doe")).toBeInTheDocument();
    });

    // Make form dirty and submit
    const nameInput = screen.getByLabelText(/full name/i);
    await user.clear(nameInput);
    await user.type(nameInput, "John Smith");

    const saveButton = screen.getByRole("button", { name: /save changes/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(
        screen.getByText("Profile updated successfully!")
      ).toBeInTheDocument();
    });
  });

  it("should show error message on save failure", async () => {
    (fetch as jest.MockedFunction<typeof fetch>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockProfileData,
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          message: "Validation failed",
        }),
      });

    render(<ProfileSettings />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("John Doe")).toBeInTheDocument();
    });

    // Make form dirty and submit
    const nameInput = screen.getByLabelText(/full name/i);
    await user.clear(nameInput);
    await user.type(nameInput, "John Smith");

    const saveButton = screen.getByRole("button", { name: /save changes/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText("Validation failed")).toBeInTheDocument();
    });
  });

  it("should disable save button when form is not dirty", async () => {
    (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockProfileData,
    });

    render(<ProfileSettings />);

    await waitFor(() => {
      const saveButton = screen.getByRole("button", { name: /save changes/i });
      expect(saveButton).toBeDisabled();
    });
  });

  it("should show loading state during save", async () => {
    (fetch as jest.MockedFunction<typeof fetch>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockProfileData,
      })
      .mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<ProfileSettings />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("John Doe")).toBeInTheDocument();
    });

    // Make form dirty
    const nameInput = screen.getByLabelText(/full name/i);
    await user.clear(nameInput);
    await user.type(nameInput, "John Smith");

    // Submit form
    const saveButton = screen.getByRole("button", { name: /save changes/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText("Saving...")).toBeInTheDocument();
    });
  });

  it("should handle network errors gracefully", async () => {
    (fetch as jest.MockedFunction<typeof fetch>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockProfileData,
      })
      .mockRejectedValueOnce(new Error("Network error"));

    render(<ProfileSettings />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("John Doe")).toBeInTheDocument();
    });

    // Make form dirty and submit
    const nameInput = screen.getByLabelText(/full name/i);
    await user.clear(nameInput);
    await user.type(nameInput, "John Smith");

    const saveButton = screen.getByRole("button", { name: /save changes/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText(/failed to update profile/i)).toBeInTheDocument();
    });
  });

  it("should render read-only email field", async () => {
    (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockProfileData,
    });

    render(<ProfileSettings />);

    await waitFor(() => {
      const emailInput = screen.getByDisplayValue("john.doe@example.com");
      expect(emailInput).toBeDisabled();
      expect(
        screen.getByText(/email address cannot be changed/i)
      ).toBeInTheDocument();
    });
  });

  it("should update session when name changes", async () => {
    const mockUpdate = jest.fn();
    mockUseSession.mockReturnValue({
      data: mockSession,
      status: "authenticated",
      update: mockUpdate,
    });

    (fetch as jest.MockedFunction<typeof fetch>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockProfileData,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { ...mockProfileData.data, name: "John Smith" },
          message: "Profile updated successfully",
        }),
      });

    render(<ProfileSettings />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("John Doe")).toBeInTheDocument();
    });

    // Change name and submit
    const nameInput = screen.getByLabelText(/full name/i);
    await user.clear(nameInput);
    await user.type(nameInput, "John Smith");

    const saveButton = screen.getByRole("button", { name: /save changes/i });
    await user.click(saveButton);

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({ name: "John Smith" });
    });
  });
});

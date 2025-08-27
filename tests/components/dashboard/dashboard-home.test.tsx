import { render, screen, waitFor, act, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useSession } from "next-auth/react";
import { DashboardHome } from "@/components/dashboard/dashboard-home";

// Mock NextAuth - fix hoisting issue
jest.mock("next-auth/react", () => ({
  useSession: jest.fn(),
}));

const mockUseSession = require("next-auth/react")
  .useSession as jest.MockedFunction<any>;

// Mock fetch
global.fetch = jest.fn();

beforeAll(() => {
  // Suppress console methods during tests
  jest.spyOn(console, "error").mockImplementation(() => {});
  jest.spyOn(console, "log").mockImplementation(() => {});
});

afterAll(() => {
  jest.restoreAllMocks();
});

describe("DashboardHome", () => {
  const mockSession = {
    user: {
      id: "user123",
      name: "John Doe",
      email: "john@example.com",
      role: "CLIENT",
      emailVerified: null,
    },
    expires: "2025-01-01",
  };

  const mockUpdate = jest.fn();

  beforeEach(() => {
    mockUseSession.mockReturnValue({
      data: mockSession,
      status: "authenticated",
      update: mockUpdate,
    });
    (fetch as jest.Mock).mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
    cleanup();
  });

  it("displays greeting with user's first name", () => {
    render(<DashboardHome />);

    const greeting = screen.getByText(/good \w+, john/i);
    expect(greeting).toBeInTheDocument();
  });

  it("displays welcome message", () => {
    render(<DashboardHome />);

    expect(
      screen.getByText(/welcome to your personal dashboard/i)
    ).toBeInTheDocument();
  });

  it("shows loading state when fetching appointment data", () => {
    (fetch as jest.Mock).mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<DashboardHome />);

    // The loading state shows a spinner with animate-pulse, not text
    expect(screen.getByText("Your Next Appointment")).toBeInTheDocument();
    // Check for the loading spinner
    const pulseElement = document.querySelector(".animate-pulse");
    expect(pulseElement).toBeInTheDocument();
  });

  it("displays next appointment when user has upcoming appointment", async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const mockAppointment = {
      id: "apt123",
      dateTime: tomorrow.toISOString(),
      service: {
        title: "Individual Counseling",
        duration: 60,
      },
    };

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          appointments: [mockAppointment],
        },
      }),
    });

    render(<DashboardHome />);

    await waitFor(() => {
      expect(screen.getByText("Individual Counseling")).toBeInTheDocument();
      expect(screen.getByText(/tomorrow at/i)).toBeInTheDocument();
      expect(screen.getByText("Duration: 60 minutes")).toBeInTheDocument();
    });
  });

  it("displays 'no appointments' message when user has no upcoming appointments", async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          appointments: [],
        },
      }),
    });

    render(<DashboardHome />);

    await waitFor(() => {
      expect(
        screen.getByText("No upcoming appointments scheduled")
      ).toBeInTheDocument();
      expect(screen.getByText(/book your next session/i)).toBeInTheDocument();
    });
  });

  it("displays error message when API call fails", async () => {
    (fetch as jest.Mock).mockRejectedValueOnce(new Error("API Error"));

    render(<DashboardHome />);

    await waitFor(() => {
      expect(
        screen.getByText("Unable to load appointment information")
      ).toBeInTheDocument();
    });
  });

  it("displays error message when API returns non-ok response", async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    render(<DashboardHome />);

    await waitFor(() => {
      expect(
        screen.getByText("Unable to load appointment information")
      ).toBeInTheDocument();
    });
  });

  it("renders quick action buttons", () => {
    render(<DashboardHome />);

    expect(screen.getByText("Book Appointment")).toBeInTheDocument();
    expect(screen.getByText("All Appointments")).toBeInTheDocument();
    expect(screen.getByText("Contact Support")).toBeInTheDocument();
  });

  it("makes API call with correct parameters", async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { appointments: [] },
      }),
    });

    render(<DashboardHome />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/appointments?upcoming=true&limit=1"
      );
    });
  });

  it("formats appointment date correctly for today", async () => {
    const today = new Date();
    today.setHours(14, 30); // 2:30 PM

    const mockAppointment = {
      id: "apt123",
      dateTime: today.toISOString(),
      service: {
        title: "Individual Counseling",
        duration: 60,
      },
    };

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          appointments: [mockAppointment],
        },
      }),
    });

    render(<DashboardHome />);

    await waitFor(() => {
      expect(screen.getByText(/today at 2:30 PM/i)).toBeInTheDocument();
    });
  });

  it("formats appointment date correctly for tomorrow", async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0); // 10:00 AM

    const mockAppointment = {
      id: "apt123",
      dateTime: tomorrow.toISOString(),
      service: {
        title: "Individual Counseling",
        duration: 60,
      },
    };

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          appointments: [mockAppointment],
        },
      }),
    });

    render(<DashboardHome />);

    await waitFor(() => {
      expect(screen.getByText(/tomorrow at 10:00 AM/i)).toBeInTheDocument();
    });
  });

  it("shows correct greeting based on time of day", async () => {
    // Mock morning time
    const mockDate = new Date();
    mockDate.setHours(8, 0);
    jest.spyOn(global, "Date").mockImplementation(() => mockDate);

    mockUseSession.mockReturnValue({
      data: mockSession,
      status: "authenticated",
      update: mockUpdate,
    });

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { appointments: [] },
      }),
    });

    await act(async () => {
      render(<DashboardHome />);
    });

    await waitFor(() => {
      expect(screen.getByText(/good morning/i)).toBeInTheDocument();
    });

    jest.restoreAllMocks();
  });

  it("displays fallback greeting when user name is not available", async () => {
    mockUseSession.mockReturnValue({
      data: {
        ...mockSession,
        user: {
          ...mockSession.user,
          name: null,
        } as any,
      },
      status: "authenticated",
      update: mockUpdate,
    });

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { appointments: [] },
      }),
    });

    await act(async () => {
      render(<DashboardHome />);
    });

    await waitFor(() => {
      expect(screen.getByText(/good \w+, there/i)).toBeInTheDocument();
    });
  });

  it("handles quick actions button clicks", async () => {
    const user = userEvent.setup();
    const consoleSpy = jest.spyOn(console, "log").mockImplementation();

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { appointments: [] },
      }),
    });

    await act(async () => {
      render(<DashboardHome />);
    });

    await waitFor(() => {
      expect(screen.getByText("All Appointments")).toBeInTheDocument();
    });

    const allAppointmentsButton = screen.getByText("All Appointments");
    await user.click(allAppointmentsButton);

    expect(consoleSpy).toHaveBeenCalledWith("View all appointments clicked");

    consoleSpy.mockRestore();
  });

  it("renders recent activity placeholder", async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { appointments: [] },
      }),
    });

    await act(async () => {
      render(<DashboardHome />);
    });

    await waitFor(() => {
      expect(screen.getByText("Recent Activity")).toBeInTheDocument();
    });

    expect(screen.getByText("No recent activity")).toBeInTheDocument();
    expect(
      screen.getByText(/your recent appointments and updates/i)
    ).toBeInTheDocument();
  });

  it("displays statistics cards with loading states", async () => {
    // Mock all fetch calls to never resolve to test loading states
    (fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));

    render(<DashboardHome />);

    // Check for statistics section
    expect(screen.getByText("Your Journey")).toBeInTheDocument();

    // Check for all statistics cards
    expect(screen.getByText("Total Sessions")).toBeInTheDocument();
    expect(screen.getByText("Upcoming")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getByText("Last Session")).toBeInTheDocument();

    // Check for loading states (animate-pulse elements)
    const pulseElements = document.querySelectorAll(".animate-pulse");
    expect(pulseElements.length).toBeGreaterThan(0);
  });

  it("displays statistics with correct data when APIs return data", async () => {
    const upcomingAppointments = {
      success: true,
      data: {
        appointments: [
          { id: "1", dateTime: "2024-12-30T10:00:00Z", status: "CONFIRMED" },
          { id: "2", dateTime: "2024-12-31T14:00:00Z", status: "PENDING" },
        ],
        pagination: { total: 2 },
      },
    };

    const pastAppointments = {
      success: true,
      data: {
        appointments: [
          { id: "3", dateTime: "2024-12-20T10:00:00Z", status: "COMPLETED" },
          { id: "4", dateTime: "2024-12-15T14:00:00Z", status: "COMPLETED" },
          { id: "5", dateTime: "2024-12-10T16:00:00Z", status: "CANCELLED" },
        ],
        pagination: { total: 3 },
      },
    };

    // Mock the three API calls made by the component
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { appointments: [] } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => upcomingAppointments,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => pastAppointments,
      });

    await act(async () => {
      render(<DashboardHome />);
    });

    await waitFor(() => {
      // Total sessions: 2 upcoming + 3 past = 5
      expect(screen.getByText("5")).toBeInTheDocument();

      // Upcoming count: 2
      expect(screen.getByText("2")).toBeInTheDocument();

      // Completed count: 2 (only COMPLETED status from past)
      expect(screen.getByText("2")).toBeInTheDocument();

      // Last session date: Dec 20 (most recent from past appointments)
      expect(screen.getByText("Dec 20")).toBeInTheDocument();
    });
  });

  it("handles statistics API errors gracefully", async () => {
    // First call succeeds, statistics calls fail
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { appointments: [] } }),
      })
      .mockRejectedValueOnce(new Error("Network error"))
      .mockRejectedValueOnce(new Error("Network error"));

    await act(async () => {
      render(<DashboardHome />);
    });

    // Should still render statistics section with default values
    await waitFor(() => {
      expect(screen.getByText("Your Journey")).toBeInTheDocument();
    });
  });

  it("displays 'None yet' when no past appointments", async () => {
    const upcomingAppointments = {
      success: true,
      data: {
        appointments: [
          { id: "1", dateTime: "2024-12-30T10:00:00Z", status: "CONFIRMED" },
        ],
        pagination: { total: 1 },
      },
    };

    const noPastAppointments = {
      success: true,
      data: {
        appointments: [],
        pagination: { total: 0 },
      },
    };

    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { appointments: [] } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => upcomingAppointments,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => noPastAppointments,
      });

    await act(async () => {
      render(<DashboardHome />);
    });

    await waitFor(() => {
      expect(screen.getByText("None yet")).toBeInTheDocument();
    });
  });

  it("does not fetch appointments when user session is not available", async () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: mockUpdate,
    });

    render(<DashboardHome />);

    // Wait for component to stabilize
    await waitFor(() => {
      expect(screen.getByText(/good \w+, there/i)).toBeInTheDocument();
    });

    expect(fetch).not.toHaveBeenCalled();
  });

  it("displays appointment date in sidebar format", async () => {
    const appointmentDate = new Date(2025, 11, 25, 14, 30); // December 25, 2025, 2:30 PM

    const mockAppointment = {
      id: "apt123",
      dateTime: appointmentDate.toISOString(),
      service: {
        title: "Individual Counseling",
        duration: 60,
      },
    };

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          appointments: [mockAppointment],
        },
      }),
    });

    await act(async () => {
      render(<DashboardHome />);
    });

    await waitFor(() => {
      expect(screen.getByText("Dec")).toBeInTheDocument();
      expect(screen.getByText("25")).toBeInTheDocument();
    });
  });
});

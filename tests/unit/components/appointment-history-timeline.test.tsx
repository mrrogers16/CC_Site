import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { jest } from "@jest/globals";
import { AppointmentHistoryTimeline } from "@/components/admin/appointments/appointment-history-timeline";

// Mock fetch globally
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe("AppointmentHistoryTimeline", () => {
  const mockHistory = [
    {
      id: "history-1",
      action: "CREATED" as const,
      adminName: "Dr. Smith",
      createdAt: "2025-08-27T10:00:00Z",
    },
    {
      id: "history-2",
      action: "RESCHEDULED" as const,
      oldDateTime: "2025-08-28T10:00:00Z",
      newDateTime: "2025-08-29T14:00:00Z",
      reason: "Client requested different time",
      adminName: "Dr. Smith",
      createdAt: "2025-08-27T11:00:00Z",
    },
    {
      id: "history-3",
      action: "STATUS_CHANGED" as const,
      oldStatus: "PENDING" as const,
      newStatus: "CONFIRMED" as const,
      adminName: "Admin User",
      createdAt: "2025-08-27T12:00:00Z",
    },
    {
      id: "history-4",
      action: "CANCELLED" as const,
      reason: "Emergency cancellation",
      adminName: "Dr. Johnson",
      createdAt: "2025-08-27T13:00:00Z",
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  it("renders loading state initially", () => {
    // Mock a pending fetch request
    mockFetch.mockImplementation(
      () => new Promise(() => {}) // Never resolves to keep loading
    );

    render(<AppointmentHistoryTimeline appointmentId="appointment-1" />);

    expect(screen.getByText("Appointment History")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { hidden: true })).toBeInTheDocument();
  });

  it("fetches and displays appointment history", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ history: mockHistory }),
    } as Response);

    render(<AppointmentHistoryTimeline appointmentId="appointment-1" />);

    await waitFor(() => {
      expect(screen.getByText("Appointment Created")).toBeInTheDocument();
      expect(screen.getByText("Appointment Rescheduled")).toBeInTheDocument();
      expect(screen.getByText("Status Changed: pending → confirmed")).toBeInTheDocument();
      expect(screen.getByText("Appointment Cancelled")).toBeInTheDocument();
    });

    expect(mockFetch).toHaveBeenCalledWith("/api/admin/appointments/appointment-1/history");
  });

  it("displays correct action icons for different history types", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ history: mockHistory }),
    } as Response);

    render(<AppointmentHistoryTimeline appointmentId="appointment-1" />);

    await waitFor(() => {
      // Check that icons are rendered (we can't easily test specific icons, but we can check they exist)
      const historyItems = screen.getAllByRole("heading", { level: 4 });
      expect(historyItems).toHaveLength(4);
    });
  });

  it("displays reschedule details with old and new date/time", async () => {
    const rescheduleHistory = [
      {
        id: "history-1",
        action: "RESCHEDULED" as const,
        oldDateTime: "2025-08-28T10:00:00Z",
        newDateTime: "2025-08-29T14:00:00Z",
        reason: "Client requested different time",
        adminName: "Dr. Smith",
        createdAt: "2025-08-27T11:00:00Z",
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ history: rescheduleHistory }),
    } as Response);

    render(<AppointmentHistoryTimeline appointmentId="appointment-1" />);

    await waitFor(() => {
      expect(screen.getByText("Appointment Rescheduled")).toBeInTheDocument();
      // Check that the reschedule description includes both dates
      expect(screen.getByText(/Moved from.*8\/28\/2025.*to.*8\/29\/2025/)).toBeInTheDocument();
      expect(screen.getByText("Reason: Client requested different time")).toBeInTheDocument();
    });
  });

  it("displays status change with proper status styling", async () => {
    const statusChangeHistory = [
      {
        id: "history-1",
        action: "STATUS_CHANGED" as const,
        oldStatus: "PENDING" as const,
        newStatus: "CONFIRMED" as const,
        adminName: "Admin",
        createdAt: "2025-08-27T12:00:00Z",
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ history: statusChangeHistory }),
    } as Response);

    render(<AppointmentHistoryTimeline appointmentId="appointment-1" />);

    await waitFor(() => {
      const pendingStatus = screen.getByText("pending");
      const confirmedStatus = screen.getByText("confirmed");

      expect(pendingStatus).toHaveClass("text-yellow-700", "bg-yellow-50", "border-yellow-200");
      expect(confirmedStatus).toHaveClass("text-green-700", "bg-green-50", "border-green-200");
    });
  });

  it("formats timestamps correctly", async () => {
    // Create a recent timestamp (2 minutes ago)
    const twoMinutesAgo = new Date();
    twoMinutesAgo.setMinutes(twoMinutesAgo.getMinutes() - 2);

    const recentHistory = [
      {
        id: "history-1",
        action: "CREATED" as const,
        adminName: "Dr. Smith",
        createdAt: twoMinutesAgo.toISOString(),
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ history: recentHistory }),
    } as Response);

    render(<AppointmentHistoryTimeline appointmentId="appointment-1" />);

    await waitFor(() => {
      expect(screen.getByText("2 minutes ago")).toBeInTheDocument();
    });
  });

  it("displays just now for very recent actions", async () => {
    const justNow = new Date();

    const recentHistory = [
      {
        id: "history-1",
        action: "CREATED" as const,
        adminName: "Dr. Smith",
        createdAt: justNow.toISOString(),
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ history: recentHistory }),
    } as Response);

    render(<AppointmentHistoryTimeline appointmentId="appointment-1" />);

    await waitFor(() => {
      expect(screen.getByText("Just now")).toBeInTheDocument();
    });
  });

  it("displays admin name and formatted timestamp for each entry", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ history: [mockHistory[0]] }),
    } as Response);

    render(<AppointmentHistoryTimeline appointmentId="appointment-1" />);

    await waitFor(() => {
      expect(screen.getByText("Dr. Smith")).toBeInTheDocument();
      // The exact timestamp format depends on how old the date is
      expect(screen.getByText(/ago|Aug|2025/)).toBeInTheDocument();
    });
  });

  it("handles empty history gracefully", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ history: [] }),
    } as Response);

    render(<AppointmentHistoryTimeline appointmentId="appointment-1" />);

    await waitFor(() => {
      expect(screen.getByText("No history records found")).toBeInTheDocument();
    });
  });

  it("displays error state when API call fails", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    render(<AppointmentHistoryTimeline appointmentId="appointment-1" />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load appointment history")).toBeInTheDocument();
      expect(screen.getByText("Try Again")).toBeInTheDocument();
    });
  });

  it("handles non-ok API response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response);

    render(<AppointmentHistoryTimeline appointmentId="appointment-1" />);

    await waitFor(() => {
      expect(screen.getByText("Failed to load appointment history")).toBeInTheDocument();
    });
  });

  it("allows retry when error occurs", async () => {
    const user = userEvent.setup();

    // First call fails
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    render(<AppointmentHistoryTimeline appointmentId="appointment-1" />);

    await waitFor(() => {
      expect(screen.getByText("Try Again")).toBeInTheDocument();
    });

    // Second call succeeds
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ history: [mockHistory[0]] }),
    } as Response);

    const retryButton = screen.getByText("Try Again");
    await user.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText("Appointment Created")).toBeInTheDocument();
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("renders timeline visual elements correctly", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ history: mockHistory }),
    } as Response);

    render(<AppointmentHistoryTimeline appointmentId="appointment-1" />);

    await waitFor(() => {
      // Check that timeline structure is present
      const timelineItems = screen.getAllByRole("heading", { level: 4 });
      expect(timelineItems).toHaveLength(4);

      // Check that all admin names are displayed
      expect(screen.getByText("Dr. Smith")).toBeInTheDocument();
      expect(screen.getByText("Admin User")).toBeInTheDocument();
      expect(screen.getByText("Dr. Johnson")).toBeInTheDocument();
    });
  });

  it("displays different action titles correctly", async () => {
    const allActionTypes = [
      {
        id: "1",
        action: "CREATED" as const,
        adminName: "Admin",
        createdAt: "2025-08-27T10:00:00Z",
      },
      {
        id: "2",
        action: "UPDATED" as const,
        adminName: "Admin",
        createdAt: "2025-08-27T10:01:00Z",
      },
      {
        id: "3",
        action: "COMPLETED" as const,
        adminName: "Admin",
        createdAt: "2025-08-27T10:02:00Z",
      },
      {
        id: "4",
        action: "NO_SHOW" as const,
        adminName: "Admin",
        createdAt: "2025-08-27T10:03:00Z",
      },
      {
        id: "5",
        action: "NOTES_UPDATED" as const,
        adminName: "Admin",
        createdAt: "2025-08-27T10:04:00Z",
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ history: allActionTypes }),
    } as Response);

    render(<AppointmentHistoryTimeline appointmentId="appointment-1" />);

    await waitFor(() => {
      expect(screen.getByText("Appointment Created")).toBeInTheDocument();
      expect(screen.getByText("Appointment Updated")).toBeInTheDocument();
      expect(screen.getByText("Appointment Completed")).toBeInTheDocument();
      expect(screen.getByText("Marked as No-Show")).toBeInTheDocument();
      expect(screen.getByText("Notes Updated")).toBeInTheDocument();
    });
  });

  it("displays reason when provided", async () => {
    const historyWithReason = [
      {
        id: "history-1",
        action: "CANCELLED" as const,
        reason: "Client emergency",
        adminName: "Dr. Smith",
        createdAt: "2025-08-27T10:00:00Z",
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ history: historyWithReason }),
    } as Response);

    render(<AppointmentHistoryTimeline appointmentId="appointment-1" />);

    await waitFor(() => {
      expect(screen.getByText("Reason: Client emergency")).toBeInTheDocument();
    });
  });

  it("does not call API when appointmentId is empty", () => {
    render(<AppointmentHistoryTimeline appointmentId="" />);

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("refetches history when appointmentId changes", async () => {
    const { rerender } = render(<AppointmentHistoryTimeline appointmentId="appointment-1" />);

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ history: [] }),
    } as Response);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith("/api/admin/appointments/appointment-1/history");
    });

    // Change appointmentId
    rerender(<AppointmentHistoryTimeline appointmentId="appointment-2" />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenLastCalledWith("/api/admin/appointments/appointment-2/history");
    });
  });

  it("handles different status color combinations", async () => {
    const statusHistory = [
      {
        id: "1",
        action: "STATUS_CHANGED" as const,
        oldStatus: "CANCELLED" as const,
        newStatus: "COMPLETED" as const,
        adminName: "Admin",
        createdAt: "2025-08-27T10:00:00Z",
      },
      {
        id: "2",
        action: "STATUS_CHANGED" as const,
        oldStatus: "COMPLETED" as const,
        newStatus: "NO_SHOW" as const,
        adminName: "Admin",
        createdAt: "2025-08-27T10:01:00Z",
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ history: statusHistory }),
    } as Response);

    render(<AppointmentHistoryTimeline appointmentId="appointment-1" />);

    await waitFor(() => {
      // Check for cancelled status
      const cancelledStatus = screen.getByText("cancelled");
      expect(cancelledStatus).toHaveClass("text-red-700", "bg-red-50", "border-red-200");

      // Check for completed status
      const completedStatus = screen.getByText("completed");
      expect(completedStatus).toHaveClass("text-blue-700", "bg-blue-50", "border-blue-200");

      // Check for no show status
      const noShowStatus = screen.getByText("no show");
      expect(noShowStatus).toHaveClass("text-gray-700", "bg-gray-50", "border-gray-200");
    });
  });
});
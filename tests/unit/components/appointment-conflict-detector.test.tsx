import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { jest } from "@jest/globals";
import { AppointmentConflictDetector } from "@/components/admin/appointments/appointment-conflict-detector";

// Mock fetch globally
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

// Mock window.dispatchEvent
const mockDispatchEvent = jest.fn();
Object.defineProperty(window, "dispatchEvent", {
  value: mockDispatchEvent,
});

describe("AppointmentConflictDetector", () => {
  const mockOnConflictDetected = jest.fn();
  const testDateTime = new Date("2025-08-29T10:00:00Z");

  const defaultProps = {
    dateTime: testDateTime,
    serviceId: "service-1",
    serviceDuration: 60,
    onConflictDetected: mockOnConflictDetected,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
    mockDispatchEvent.mockClear();
  });

  it("renders loading state while checking for conflicts", () => {
    // Mock a pending fetch request
    mockFetch.mockImplementation(
      () => new Promise(() => {}) // Never resolves to keep loading
    );

    render(<AppointmentConflictDetector {...defaultProps} />);

    expect(screen.getByText("Checking for conflicts...")).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", { hidden: true })
    ).toBeInTheDocument();
  });

  it("displays no conflicts message when no conflicts exist", async () => {
    const noConflictResponse = {
      hasConflict: false,
      conflictType: null,
      conflictingAppointments: [],
      reason: "",
      suggestedAlternatives: [],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => noConflictResponse,
    } as Response);

    render(<AppointmentConflictDetector {...defaultProps} />);

    await waitFor(() => {
      expect(
        screen.getByText("No conflicts detected. Time slot is available.")
      ).toBeInTheDocument();
    });

    expect(mockOnConflictDetected).toHaveBeenCalledWith(noConflictResponse);
  });

  it("displays appointment conflict with conflicting appointment details", async () => {
    const conflictResponse = {
      hasConflict: true,
      conflictType: "appointment" as const,
      conflictingAppointments: [
        {
          id: "conflict-1",
          dateTime: "2025-08-29T10:00:00Z",
          status: "CONFIRMED",
          service: {
            title: "Individual Therapy",
            duration: 60,
          },
          user: {
            name: "John Doe",
          },
        },
      ],
      reason: "There is already an appointment scheduled at this time",
      suggestedAlternatives: [
        {
          dateTime: "2025-08-29T11:00:00Z",
          displayTime: "11:00 AM",
        },
        {
          dateTime: "2025-08-29T14:00:00Z",
          displayTime: "2:00 PM",
        },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => conflictResponse,
    } as Response);

    render(<AppointmentConflictDetector {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("Conflict Detected")).toBeInTheDocument();
      expect(
        screen.getByText(
          "There is already an appointment scheduled at this time"
        )
      ).toBeInTheDocument();
      expect(screen.getByText("Conflicting Appointments:")).toBeInTheDocument();
      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("Individual Therapy")).toBeInTheDocument();
      expect(screen.getByText("confirmed")).toBeInTheDocument();
    });

    expect(mockOnConflictDetected).toHaveBeenCalledWith(conflictResponse);
  });

  it("displays suggested alternative times", async () => {
    const conflictResponse = {
      hasConflict: true,
      conflictType: "blocked" as const,
      conflictingAppointments: [],
      reason: "This time slot is blocked",
      suggestedAlternatives: [
        {
          dateTime: "2025-08-29T11:00:00Z",
          displayTime: "11:00 AM",
        },
        {
          dateTime: "2025-08-29T14:00:00Z",
          displayTime: "2:00 PM",
        },
        {
          dateTime: "2025-08-29T15:00:00Z",
          displayTime: "3:00 PM",
        },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => conflictResponse,
    } as Response);

    render(<AppointmentConflictDetector {...defaultProps} />);

    await waitFor(() => {
      expect(
        screen.getByText("Suggested Alternative Times:")
      ).toBeInTheDocument();
      expect(screen.getByText("11:00 AM")).toBeInTheDocument();
      expect(screen.getByText("2:00 PM")).toBeInTheDocument();
      expect(screen.getByText("3:00 PM")).toBeInTheDocument();
    });
  });

  it("limits suggested alternatives to 6 items", async () => {
    const manyAlternatives = Array.from({ length: 10 }, (_, i) => ({
      dateTime: `2025-08-29T${10 + i}:00:00Z`,
      displayTime: `${10 + i}:00 AM`,
    }));

    const conflictResponse = {
      hasConflict: true,
      conflictType: "blocked" as const,
      conflictingAppointments: [],
      reason: "This time slot is blocked",
      suggestedAlternatives: manyAlternatives,
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => conflictResponse,
    } as Response);

    render(<AppointmentConflictDetector {...defaultProps} />);

    await waitFor(() => {
      expect(
        screen.getByText("Suggested Alternative Times:")
      ).toBeInTheDocument();
    });

    // Should only show first 6 alternatives
    expect(screen.getByText("10:00 AM")).toBeInTheDocument();
    expect(screen.getByText("15:00 AM")).toBeInTheDocument(); // 6th item (index 5)
    expect(screen.queryByText("16:00 AM")).not.toBeInTheDocument(); // 7th item should not be shown
  });

  it("dispatches custom event when alternative time is clicked", async () => {
    const user = userEvent.setup();
    const conflictResponse = {
      hasConflict: true,
      conflictType: "blocked" as const,
      conflictingAppointments: [],
      reason: "This time slot is blocked",
      suggestedAlternatives: [
        {
          dateTime: "2025-08-29T11:00:00Z",
          displayTime: "11:00 AM",
        },
      ],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => conflictResponse,
    } as Response);

    render(<AppointmentConflictDetector {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("11:00 AM")).toBeInTheDocument();
    });

    const alternativeButton = screen.getByText("11:00 AM");
    await user.click(alternativeButton);

    expect(mockDispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "selectAlternativeTime",
        detail: {
          dateTime: new Date("2025-08-29T11:00:00Z"),
        },
      })
    );
  });

  it("handles API error gracefully", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    render(<AppointmentConflictDetector {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("Conflict Detected")).toBeInTheDocument();
      expect(
        screen.getByText("Failed to check for conflicts. Please try again.")
      ).toBeInTheDocument();
    });

    const expectedErrorConflict = {
      hasConflict: true,
      conflictType: null,
      conflictingAppointments: [],
      reason: "Failed to check for conflicts. Please try again.",
      suggestedAlternatives: [],
    };

    expect(mockOnConflictDetected).toHaveBeenCalledWith(expectedErrorConflict);
  });

  it("handles non-ok API response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response);

    render(<AppointmentConflictDetector {...defaultProps} />);

    await waitFor(() => {
      expect(
        screen.getByText("Failed to check for conflicts. Please try again.")
      ).toBeInTheDocument();
    });
  });

  it("re-checks conflicts when props change", async () => {
    const { rerender } = render(
      <AppointmentConflictDetector {...defaultProps} />
    );

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        hasConflict: false,
        conflictType: null,
        conflictingAppointments: [],
        reason: "",
        suggestedAlternatives: [],
      }),
    } as Response);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    // Change dateTime prop
    const newDateTime = new Date("2025-08-29T11:00:00Z");
    rerender(
      <AppointmentConflictDetector {...defaultProps} dateTime={newDateTime} />
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  it("includes excludeAppointmentId in API request when provided", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        hasConflict: false,
        conflictType: null,
        conflictingAppointments: [],
        reason: "",
        suggestedAlternatives: [],
      }),
    } as Response);

    render(
      <AppointmentConflictDetector
        {...defaultProps}
        excludeAppointmentId="exclude-123"
      />
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/admin/appointments/conflicts",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            dateTime: testDateTime.toISOString(),
            serviceId: "service-1",
            serviceDuration: 60,
            excludeAppointmentId: "exclude-123",
          }),
        }
      );
    });
  });

  it("displays different status colors for appointment statuses", async () => {
    const conflictResponse = {
      hasConflict: true,
      conflictType: "appointment" as const,
      conflictingAppointments: [
        {
          id: "conflict-1",
          dateTime: "2025-08-29T10:00:00Z",
          status: "PENDING",
          service: { title: "Therapy", duration: 60 },
          user: { name: "John Doe" },
        },
        {
          id: "conflict-2",
          dateTime: "2025-08-29T10:30:00Z",
          status: "CANCELLED",
          service: { title: "Consultation", duration: 30 },
          user: { name: "Jane Smith" },
        },
      ],
      reason: "Multiple conflicts detected",
      suggestedAlternatives: [],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => conflictResponse,
    } as Response);

    render(<AppointmentConflictDetector {...defaultProps} />);

    await waitFor(() => {
      const pendingStatus = screen.getByText("pending");
      const cancelledStatus = screen.getByText("cancelled");

      expect(pendingStatus).toHaveClass("bg-yellow-100", "text-yellow-700");
      expect(cancelledStatus).toHaveClass("bg-gray-100", "text-gray-700");
    });
  });

  it("formats date and time correctly for conflicting appointments", async () => {
    const conflictResponse = {
      hasConflict: true,
      conflictType: "appointment" as const,
      conflictingAppointments: [
        {
          id: "conflict-1",
          dateTime: "2025-08-29T14:30:00Z", // 2:30 PM UTC
          status: "CONFIRMED",
          service: { title: "Therapy", duration: 60 },
          user: { name: "John Doe" },
        },
      ],
      reason: "Appointment conflict",
      suggestedAlternatives: [],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => conflictResponse,
    } as Response);

    render(<AppointmentConflictDetector {...defaultProps} />);

    await waitFor(() => {
      // Check for formatted date - should show "Fri, Aug 29"
      expect(screen.getByText("Fri, Aug 29")).toBeInTheDocument();
      // Check for formatted time - should show "2:30 PM" (assuming UTC display)
      expect(screen.getByText("2:30 PM")).toBeInTheDocument();
    });
  });

  it("does not render when no dateTime or serviceId provided", () => {
    const { container } = render(
      <AppointmentConflictDetector
        dateTime={null as any}
        serviceId=""
        serviceDuration={60}
        onConflictDetected={mockOnConflictDetected}
      />
    );

    expect(container).toBeEmptyDOMElement();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("shows correct conflict icons and styling", async () => {
    const conflictResponse = {
      hasConflict: true,
      conflictType: "outside_hours" as const,
      conflictingAppointments: [],
      reason: "Selected time is outside business hours",
      suggestedAlternatives: [],
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => conflictResponse,
    } as Response);

    render(<AppointmentConflictDetector {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("Conflict Detected")).toBeInTheDocument();
      // Check for warning icon and red styling
      const conflictContainer = screen
        .getByText("Conflict Detected")
        .closest("div");
      expect(conflictContainer).toHaveClass("bg-red-50", "border-red-200");

      // Check for alert triangle icon
      const alertIcon =
        screen.getByTestId("alert-triangle") ||
        document.querySelector('svg[data-icon="alert-triangle"]');
      expect(alertIcon).toBeInTheDocument();
    });
  });
});

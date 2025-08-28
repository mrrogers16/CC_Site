import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { jest } from "@jest/globals";
import { AppointmentReschedule } from "@/components/admin/appointments/appointment-reschedule";

// Mock fetch globally
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe("AppointmentReschedule", () => {
  const mockAppointment = {
    id: "appointment-1",
    dateTime: "2025-08-28T10:00:00Z",
    status: "CONFIRMED" as const,
    service: {
      id: "service-1",
      title: "Individual Therapy",
      duration: 60,
    },
    user: {
      name: "John Doe",
    },
  };

  const mockOnReschedule = jest.fn();
  const mockOnCancel = jest.fn();

  const defaultProps = {
    appointment: mockAppointment,
    onReschedule: mockOnReschedule,
    onCancel: mockOnCancel,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  it("renders appointment reschedule form", () => {
    render(<AppointmentReschedule {...defaultProps} />);

    expect(screen.getByText("Reschedule Appointment")).toBeInTheDocument();
    expect(screen.getByText("Current Appointment")).toBeInTheDocument();
    expect(screen.getByText("Individual Therapy")).toBeInTheDocument();
    expect(screen.getByText("(60 minutes)")).toBeInTheDocument();
  });

  it("displays current appointment information correctly", () => {
    render(<AppointmentReschedule {...defaultProps} />);

    // Check if the current appointment date and time are displayed
    expect(screen.getByText(/Wednesday, August 28, 2025/)).toBeInTheDocument();
    // Check for time display (note: this might vary based on timezone)
    expect(screen.getByText(/10:00 AM/)).toBeInTheDocument();
  });

  it("allows date selection within valid range", async () => {
    const user = userEvent.setup();
    render(<AppointmentReschedule {...defaultProps} />);

    const dateInput = screen.getByDisplayValue("");
    expect(dateInput).toBeInTheDocument();
    expect(dateInput).toHaveAttribute("type", "date");

    // Check date input has proper min/max attributes
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minDate = tomorrow.toISOString().split("T")[0];
    expect(dateInput).toHaveAttribute("min", minDate);

    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30);
    const expectedMaxDate = maxDate.toISOString().split("T")[0];
    expect(dateInput).toHaveAttribute("max", expectedMaxDate);
  });

  it("fetches available time slots when date is selected", async () => {
    const user = userEvent.setup();
    const mockSlots = [
      {
        dateTime: "2025-08-29T09:00:00Z",
        available: true,
        displayTime: "9:00 AM",
      },
      {
        dateTime: "2025-08-29T10:00:00Z",
        available: true,
        displayTime: "10:00 AM",
      },
      {
        dateTime: "2025-08-29T11:00:00Z",
        available: false,
        reason: "Already booked",
        displayTime: "11:00 AM",
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ 
        slots: mockSlots,
        availableSlots: 2,
      }),
    } as Response);

    render(<AppointmentReschedule {...defaultProps} />);

    const dateInput = screen.getByDisplayValue("");
    await user.type(dateInput, "2025-08-29");

    // Wait for the loading spinner to appear and then disappear
    expect(screen.getByText("Checking for conflicts...")).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText("9:00 AM")).toBeInTheDocument();
      expect(screen.getByText("10:00 AM")).toBeInTheDocument();
      expect(screen.getByText("11:00 AM")).toBeInTheDocument();
    });

    // Check that API was called with correct parameters
    expect(mockFetch).toHaveBeenCalledWith(
      "/api/appointments/available?date=2025-08-29&serviceId=service-1"
    );
  });

  it("displays no available slots message when no slots available", async () => {
    const user = userEvent.setup();

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ 
        slots: [],
        availableSlots: 0,
      }),
    } as Response);

    render(<AppointmentReschedule {...defaultProps} />);

    const dateInput = screen.getByDisplayValue("");
    await user.type(dateInput, "2025-08-29");

    await waitFor(() => {
      expect(screen.getByText("No available time slots for this date")).toBeInTheDocument();
      expect(screen.getByText("No available time slots for this date.")).toBeInTheDocument();
    });
  });

  it("handles API error when fetching slots", async () => {
    const user = userEvent.setup();

    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    render(<AppointmentReschedule {...defaultProps} />);

    const dateInput = screen.getByDisplayValue("");
    await user.type(dateInput, "2025-08-29");

    await waitFor(() => {
      expect(screen.getByText("Failed to load available times. Please try again.")).toBeInTheDocument();
    });
  });

  it("allows time slot selection and deselection", async () => {
    const user = userEvent.setup();
    const mockSlots = [
      {
        dateTime: "2025-08-29T09:00:00Z",
        available: true,
        displayTime: "9:00 AM",
      },
      {
        dateTime: "2025-08-29T10:00:00Z",
        available: true,
        displayTime: "10:00 AM",
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ 
        slots: mockSlots,
        availableSlots: 2,
      }),
    } as Response);

    render(<AppointmentReschedule {...defaultProps} />);

    // Select date first
    const dateInput = screen.getByDisplayValue("");
    await user.type(dateInput, "2025-08-29");

    await waitFor(() => {
      expect(screen.getByText("9:00 AM")).toBeInTheDocument();
    });

    // Click on time slot
    const timeSlot = screen.getByText("9:00 AM");
    await user.click(timeSlot);

    // Check if slot is selected (has primary styles)
    expect(timeSlot.closest("button")).toHaveClass("bg-primary");
  });

  it("prevents selection of unavailable time slots", async () => {
    const user = userEvent.setup();
    const mockSlots = [
      {
        dateTime: "2025-08-29T11:00:00Z",
        available: false,
        reason: "Already booked",
        displayTime: "11:00 AM",
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ 
        slots: mockSlots,
        availableSlots: 0,
      }),
    } as Response);

    render(<AppointmentReschedule {...defaultProps} />);

    // Select date first
    const dateInput = screen.getByDisplayValue("");
    await user.type(dateInput, "2025-08-29");

    await waitFor(() => {
      expect(screen.getByText("11:00 AM")).toBeInTheDocument();
    });

    // Try to click on unavailable slot
    const unavailableSlot = screen.getByText("11:00 AM");
    await user.click(unavailableSlot);

    // Should show conflict message
    await waitFor(() => {
      expect(screen.getByText("Already booked")).toBeInTheDocument();
    });

    // Confirm button should remain disabled
    const confirmButton = screen.getByRole("button", { name: /confirm reschedule/i });
    expect(confirmButton).toBeDisabled();
  });

  it("allows entering and tracking reason for rescheduling", async () => {
    const user = userEvent.setup();
    render(<AppointmentReschedule {...defaultProps} />);

    const reasonTextarea = screen.getByPlaceholderText("Enter reason for rescheduling...");
    expect(reasonTextarea).toBeInTheDocument();
    expect(reasonTextarea).toHaveAttribute("maxLength", "200");

    // Type in reason
    await user.type(reasonTextarea, "Client requested different time");

    expect(reasonTextarea).toHaveValue("Client requested different time");
    expect(screen.getByText("33/200 characters")).toBeInTheDocument();
  });

  it("calls onReschedule when confirm button is clicked", async () => {
    const user = userEvent.setup();
    const mockSlots = [
      {
        dateTime: "2025-08-29T09:00:00Z",
        available: true,
        displayTime: "9:00 AM",
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ 
        slots: mockSlots,
        availableSlots: 1,
      }),
    } as Response);

    render(<AppointmentReschedule {...defaultProps} />);

    // Select date
    const dateInput = screen.getByDisplayValue("");
    await user.type(dateInput, "2025-08-29");

    // Wait for slots to load and select one
    await waitFor(() => {
      expect(screen.getByText("9:00 AM")).toBeInTheDocument();
    });

    const timeSlot = screen.getByText("9:00 AM");
    await user.click(timeSlot);

    // Add reason
    const reasonTextarea = screen.getByPlaceholderText("Enter reason for rescheduling...");
    await user.type(reasonTextarea, "Client requested");

    // Click confirm
    const confirmButton = screen.getByRole("button", { name: /confirm reschedule/i });
    expect(confirmButton).not.toBeDisabled();
    await user.click(confirmButton);

    // Check if onReschedule was called with correct parameters
    await waitFor(() => {
      expect(mockOnReschedule).toHaveBeenCalledWith(
        new Date("2025-08-29T09:00:00Z"),
        "Client requested"
      );
    });
  });

  it("handles rescheduling without reason", async () => {
    const user = userEvent.setup();
    const mockSlots = [
      {
        dateTime: "2025-08-29T09:00:00Z",
        available: true,
        displayTime: "9:00 AM",
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ 
        slots: mockSlots,
        availableSlots: 1,
      }),
    } as Response);

    render(<AppointmentReschedule {...defaultProps} />);

    // Select date and time without entering reason
    const dateInput = screen.getByDisplayValue("");
    await user.type(dateInput, "2025-08-29");

    await waitFor(() => {
      expect(screen.getByText("9:00 AM")).toBeInTheDocument();
    });

    const timeSlot = screen.getByText("9:00 AM");
    await user.click(timeSlot);

    const confirmButton = screen.getByRole("button", { name: /confirm reschedule/i });
    await user.click(confirmButton);

    // Should call onReschedule with undefined reason
    await waitFor(() => {
      expect(mockOnReschedule).toHaveBeenCalledWith(
        new Date("2025-08-29T09:00:00Z"),
        undefined
      );
    });
  });

  it("shows loading state during rescheduling", async () => {
    const user = userEvent.setup();
    const mockSlots = [
      {
        dateTime: "2025-08-29T09:00:00Z",
        available: true,
        displayTime: "9:00 AM",
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ 
        slots: mockSlots,
        availableSlots: 1,
      }),
    } as Response);

    // Make onReschedule return a pending promise to test loading state
    let resolveReschedule: () => void;
    const reschedulePromise = new Promise<void>((resolve) => {
      resolveReschedule = resolve;
    });
    mockOnReschedule.mockReturnValueOnce(reschedulePromise);

    render(<AppointmentReschedule {...defaultProps} />);

    // Select date and time
    const dateInput = screen.getByDisplayValue("");
    await user.type(dateInput, "2025-08-29");

    await waitFor(() => {
      expect(screen.getByText("9:00 AM")).toBeInTheDocument();
    });

    const timeSlot = screen.getByText("9:00 AM");
    await user.click(timeSlot);

    const confirmButton = screen.getByRole("button", { name: /confirm reschedule/i });
    await user.click(confirmButton);

    // Should show loading state
    expect(screen.getByText("Rescheduling...")).toBeInTheDocument();
    expect(confirmButton).toBeDisabled();
    expect(screen.getByRole("button", { name: /cancel/i })).toBeDisabled();

    // Resolve the promise
    resolveReschedule!();
    await waitFor(() => {
      expect(screen.getByText("Confirm Reschedule")).toBeInTheDocument();
    });
  });

  it("calls onCancel when cancel button is clicked", async () => {
    const user = userEvent.setup();
    render(<AppointmentReschedule {...defaultProps} />);

    const cancelButton = screen.getByRole("button", { name: /cancel/i });
    await user.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  it("disables confirm button when no time slot is selected", () => {
    render(<AppointmentReschedule {...defaultProps} />);

    const confirmButton = screen.getByRole("button", { name: /confirm reschedule/i });
    expect(confirmButton).toBeDisabled();
  });

  it("handles onReschedule error gracefully", async () => {
    const user = userEvent.setup();
    const consoleSpy = jest.spyOn(console, "error").mockImplementation();
    const mockSlots = [
      {
        dateTime: "2025-08-29T09:00:00Z",
        available: true,
        displayTime: "9:00 AM",
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ 
        slots: mockSlots,
        availableSlots: 1,
      }),
    } as Response);

    // Make onReschedule throw an error
    mockOnReschedule.mockRejectedValueOnce(new Error("Reschedule failed"));

    render(<AppointmentReschedule {...defaultProps} />);

    // Complete the flow
    const dateInput = screen.getByDisplayValue("");
    await user.type(dateInput, "2025-08-29");

    await waitFor(() => {
      expect(screen.getByText("9:00 AM")).toBeInTheDocument();
    });

    const timeSlot = screen.getByText("9:00 AM");
    await user.click(timeSlot);

    const confirmButton = screen.getByRole("button", { name: /confirm reschedule/i });
    await user.click(confirmButton);

    // Should log error and return to normal state
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith("Failed to reschedule appointment:", expect.any(Error));
      expect(screen.getByText("Confirm Reschedule")).toBeInTheDocument();
    });

    consoleSpy.mockRestore();
  });

  it("maintains selected date display when switching between dates", async () => {
    const user = userEvent.setup();
    
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ slots: [], availableSlots: 0 }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ slots: [], availableSlots: 0 }),
      } as Response);

    render(<AppointmentReschedule {...defaultProps} />);

    const dateInput = screen.getByDisplayValue("");
    
    // Select first date
    await user.type(dateInput, "2025-08-29");
    await waitFor(() => {
      expect(screen.getByText("Selected: Thursday, August 29, 2025")).toBeInTheDocument();
    });

    // Clear and select different date
    await user.clear(dateInput);
    await user.type(dateInput, "2025-08-30");
    
    await waitFor(() => {
      expect(screen.getByText("Selected: Friday, August 30, 2025")).toBeInTheDocument();
    });
  });
});
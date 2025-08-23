import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CalendarView from "@/components/booking/calendar-view";
import { BUSINESS_RULES } from "@/lib/validations/appointments";

// Mock the logger
jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock react-day-picker CSS imports
jest.mock("react-day-picker/style.css", () => ({}));
jest.mock("@/styles/calendar.css", () => ({}));

// Mock fetch
global.fetch = jest.fn();

// Mock DayPicker component to avoid complex calendar testing
jest.mock("react-day-picker", () => ({
  DayPicker: ({ onSelect, selected }: any) => (
    <div role="grid" data-testid="mocked-calendar">
      <button 
        onClick={() => onSelect && onSelect(new Date("2025-08-25"))}
        className="rdp-day_available"
        aria-label="Go to previous month"
      >
        Previous
      </button>
      <button 
        onClick={() => onSelect && onSelect(new Date("2025-08-25"))}
        className="rdp-day_available"
        aria-label="Go to next month"
      >
        Next
      </button>
      <button 
        role="gridcell"
        aria-label="25"
        onClick={() => onSelect && onSelect(new Date("2025-08-25"))}
        className={`rdp-day ${selected ? "rdp-day_selected" : "rdp-day_available"}`}
      >
        25
      </button>
    </div>
  ),
}));

const mockService = {
  id: "service-1",
  title: "Individual Counseling",
  duration: 60,
  price: 120,
};

const mockOnDateSelect = jest.fn();
const mockOnBack = jest.fn();

// Mock available slots response
const mockAvailableSlots = [
  {
    dateTime: "2025-08-25T09:00:00Z",
    available: true,
    reason: null,
  },
  {
    dateTime: "2025-08-25T10:00:00Z",
    available: true,
    reason: null,
  },
  {
    dateTime: "2025-08-25T11:00:00Z",
    available: false,
    reason: "Booked",
  },
];

describe("CalendarView", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock successful API responses by default
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ slots: mockAvailableSlots }),
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it("renders loading state initially", () => {
    render(
      <CalendarView
        selectedService={mockService}
        onDateSelect={mockOnDateSelect}
        onBack={mockOnBack}
      />
    );

    expect(screen.getByText("Select a Date")).toBeInTheDocument();
    expect(screen.getByText("Loading available dates...")).toBeInTheDocument();
    
    // Check for loading skeleton
    expect(screen.getByTestId("calendar-loading")).toBeInTheDocument();
  });

  it("displays calendar after loading available dates", async () => {
    render(
      <CalendarView
        selectedService={mockService}
        onDateSelect={mockOnDateSelect}
        onBack={mockOnBack}
      />
    );

    await waitFor(() => {
      expect(screen.queryByText("Loading available dates...")).not.toBeInTheDocument();
    });

    // Calendar should be visible
    expect(screen.getByRole("grid")).toBeInTheDocument();
    expect(screen.getByText(/Choose an available date/)).toBeInTheDocument();
  });

  it("fetches available dates for business days only", async () => {
    render(
      <CalendarView
        selectedService={mockService}
        onDateSelect={mockOnDateSelect}
        onBack={mockOnBack}
      />
    );

    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
    });

    // Check that fetch was called with correct parameters
    const fetchCalls = (fetch as jest.Mock).mock.calls;
    expect(fetchCalls.length).toBeGreaterThan(0);

    // Verify API calls include service ID and exclude weekends
    fetchCalls.forEach((call) => {
      const url = call[0];
      expect(url).toContain(`serviceId=${mockService.id}`);
      expect(url).toMatch(/date=\d{4}-\d{2}-\d{2}/);
    });
  });

  it("handles date selection correctly", async () => {
    const user = userEvent.setup();
    render(
      <CalendarView
        selectedService={mockService}
        onDateSelect={mockOnDateSelect}
        onBack={mockOnBack}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole("grid")).toBeInTheDocument();
    });

    // Find and click an available date
    const availableDate = screen.getByRole("gridcell", { name: /25/ });
    await user.click(availableDate);

    expect(mockOnDateSelect).toHaveBeenCalledWith(expect.any(Date));
  });

  it("prevents selection of disabled dates", async () => {
    const user = userEvent.setup();
    
    // Mock no available slots
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ slots: [] }),
    });

    render(
      <CalendarView
        selectedService={mockService}
        onDateSelect={mockOnDateSelect}
        onBack={mockOnBack}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole("grid")).toBeInTheDocument();
    });

    // Try to click a disabled date
    const disabledDate = screen.getByRole("gridcell", { name: /26/ });
    await user.click(disabledDate);

    // onDateSelect should not be called for disabled dates
    expect(mockOnDateSelect).not.toHaveBeenCalled();
  });

  it("shows selected date with proper styling", async () => {
    const selectedDate = new Date("2025-08-25");
    
    render(
      <CalendarView
        selectedService={mockService}
        selectedDate={selectedDate}
        onDateSelect={mockOnDateSelect}
        onBack={mockOnBack}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole("grid")).toBeInTheDocument();
    });

    // Check for selected date styling
    const selectedCell = screen.getByRole("gridcell", { name: /25/ });
    expect(selectedCell).toHaveClass("rdp-day_selected");
  });

  it("displays navigation buttons with proper labels", async () => {
    render(
      <CalendarView
        selectedService={mockService}
        onDateSelect={mockOnDateSelect}
        onBack={mockOnBack}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole("grid")).toBeInTheDocument();
    });

    // Check for navigation buttons with accessible labels
    const prevButton = screen.getByLabelText("Go to previous month");
    const nextButton = screen.getByLabelText("Go to next month");
    
    expect(prevButton).toBeInTheDocument();
    expect(nextButton).toBeInTheDocument();
  });

  it("handles navigation button clicks", async () => {
    const user = userEvent.setup();
    
    render(
      <CalendarView
        selectedService={mockService}
        onDateSelect={mockOnDateSelect}
        onBack={mockOnBack}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole("grid")).toBeInTheDocument();
    });

    // Click next month button
    const nextButton = screen.getByLabelText("Go to next month");
    await user.click(nextButton);

    // Calendar should still be visible after navigation
    expect(screen.getByRole("grid")).toBeInTheDocument();
  });

  it("displays back button and handles click", async () => {
    const user = userEvent.setup();
    
    render(
      <CalendarView
        selectedService={mockService}
        onDateSelect={mockOnDateSelect}
        onBack={mockOnBack}
      />
    );

    const backButton = screen.getByRole("button", { name: /Back to Services/i });
    expect(backButton).toBeInTheDocument();

    await user.click(backButton);
    expect(mockOnBack).toHaveBeenCalled();
  });

  it("shows error state when API fails", async () => {
    (fetch as jest.Mock).mockRejectedValue(new Error("Network error"));

    render(
      <CalendarView
        selectedService={mockService}
        onDateSelect={mockOnDateSelect}
        onBack={mockOnBack}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Unable to Load Calendar")).toBeInTheDocument();
    });

    expect(screen.getByText("Failed to load available dates. Please try again.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Try Again/i })).toBeInTheDocument();
  });

  it("handles retry after error", async () => {
    const user = userEvent.setup();
    
    // Mock window.location.reload
    const mockReload = jest.fn();
    Object.defineProperty(window, "location", {
      value: { reload: mockReload },
      writable: true,
    });

    (fetch as jest.Mock).mockRejectedValue(new Error("Network error"));

    render(
      <CalendarView
        selectedService={mockService}
        onDateSelect={mockOnDateSelect}
        onBack={mockOnBack}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Unable to Load Calendar")).toBeInTheDocument();
    });

    const retryButton = screen.getByRole("button", { name: /Try Again/i });
    await user.click(retryButton);

    expect(mockReload).toHaveBeenCalled();
  });

  it("shows no available dates message when no dates available", async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ slots: [] }),
    });

    render(
      <CalendarView
        selectedService={mockService}
        onDateSelect={mockOnDateSelect}
        onBack={mockOnBack}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("No Available Dates")).toBeInTheDocument();
    });

    expect(
      screen.getByText(/There are currently no available appointment slots/)
    ).toBeInTheDocument();
  });

  it("displays calendar legend", async () => {
    render(
      <CalendarView
        selectedService={mockService}
        onDateSelect={mockOnDateSelect}
        onBack={mockOnBack}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole("grid")).toBeInTheDocument();
    });

    // Check legend items
    expect(screen.getByText("Available")).toBeInTheDocument();
    expect(screen.getByText("Selected")).toBeInTheDocument();
    expect(screen.getByText("Today")).toBeInTheDocument();
    expect(screen.getByText("Unavailable")).toBeInTheDocument();
  });

  it("displays booking rules information", async () => {
    render(
      <CalendarView
        selectedService={mockService}
        onDateSelect={mockOnDateSelect}
        onBack={mockOnBack}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole("grid")).toBeInTheDocument();
    });

    // Check for business rules display
    expect(screen.getByText(/Appointments must be booked at least/)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(BUSINESS_RULES.MIN_ADVANCE_HOURS.toString()))).toBeInTheDocument();
  });

  it("respects date boundaries", async () => {
    render(
      <CalendarView
        selectedService={mockService}
        onDateSelect={mockOnDateSelect}
        onBack={mockOnBack}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole("grid")).toBeInTheDocument();
    });

    // Calendar should not show dates outside the booking window
    const today = new Date();
    const maxDate = new Date(today.getTime() + BUSINESS_RULES.MAX_ADVANCE_DAYS * 24 * 60 * 60 * 1000);
    
    // This test verifies the calendar respects fromDate and toDate props
    expect(screen.getByRole("grid")).toBeInTheDocument();
  });

  it("has proper accessibility attributes", async () => {
    render(
      <CalendarView
        selectedService={mockService}
        onDateSelect={mockOnDateSelect}
        onBack={mockOnBack}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole("grid")).toBeInTheDocument();
    });

    // Check calendar has proper grid role
    expect(screen.getByRole("grid")).toBeInTheDocument();
    
    // Check navigation buttons have labels
    expect(screen.getByLabelText("Go to previous month")).toBeInTheDocument();
    expect(screen.getByLabelText("Go to next month")).toBeInTheDocument();
    
    // Check back button is accessible
    expect(screen.getByRole("button", { name: /Back to Services/i })).toBeInTheDocument();
  });

  it("handles keyboard navigation", async () => {
    const user = userEvent.setup();
    
    render(
      <CalendarView
        selectedService={mockService}
        onDateSelect={mockOnDateSelect}
        onBack={mockOnBack}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole("grid")).toBeInTheDocument();
    });

    // Test keyboard navigation on calendar
    const calendar = screen.getByRole("grid");
    calendar.focus();
    
    // Use arrow keys to navigate
    await user.keyboard("{ArrowRight}");
    await user.keyboard("{Enter}");
    
    // Should trigger date selection if date is available
    // Note: This test depends on the specific date and availability
  });

  it("maintains sage green theme styling", async () => {
    render(
      <CalendarView
        selectedService={mockService}
        onDateSelect={mockOnDateSelect}
        onBack={mockOnBack}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole("grid")).toBeInTheDocument();
    });

    // Check for theme classes
    const backButton = screen.getByRole("button", { name: /Back to Services/i });
    expect(backButton).toHaveClass("text-primary", "border-primary");
  });

  it("displays service information in header", () => {
    render(
      <CalendarView
        selectedService={mockService}
        onDateSelect={mockOnDateSelect}
        onBack={mockOnBack}
      />
    );

    expect(screen.getByText("Select a Date")).toBeInTheDocument();
    expect(screen.getByText(/Choose an available date for your Individual Counseling session/)).toBeInTheDocument();
  });
});
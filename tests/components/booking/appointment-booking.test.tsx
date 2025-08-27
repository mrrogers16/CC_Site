import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getServerSession } from "next-auth";
import AppointmentBooking from "@/components/booking/appointment-booking";

// Mock NextAuth
jest.mock("next-auth");
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;

// Mock session data
const mockSession = {
  user: {
    id: "test-user-id",
    email: "test@example.com",
    name: "Test User",
  },
  expires: "2024-12-31T23:59:59.999Z",
};

// Mock the booking components
jest.mock("@/components/booking/service-selector", () => {
  return function MockServiceSelector({ onServiceSelect }: any) {
    return (
      <div data-testid="service-selector">
        <h2>Select Your Service</h2>
        <button
          onClick={() =>
            onServiceSelect({
              id: "test-service-1",
              title: "Individual Counseling",
              duration: 60,
              price: 120,
            })
          }
          data-testid="select-service"
        >
          Select Service
        </button>
      </div>
    );
  };
});

jest.mock("@/components/booking/calendar-view", () => {
  return function MockCalendarView({ onDateSelect, onBack }: any) {
    return (
      <div data-testid="calendar-view">
        <h2>Select a Date</h2>
        <button onClick={onBack} data-testid="back-to-service">
          ← Back to Services
        </button>
        <button
          onClick={() => onDateSelect(new Date("2024-12-15"))}
          data-testid="select-date"
        >
          Select Date
        </button>
      </div>
    );
  };
});

jest.mock("@/components/booking/time-slot-grid", () => {
  return function MockTimeSlotGrid({ onTimeSelect, onBack }: any) {
    return (
      <div data-testid="time-slot-grid">
        <h2>Select a Time</h2>
        <button onClick={onBack} data-testid="back-to-calendar">
          ← Back to Calendar
        </button>
        <button
          onClick={() => onTimeSelect(new Date("2024-12-15T10:00:00"))}
          data-testid="select-time"
        >
          Select Time
        </button>
      </div>
    );
  };
});

jest.mock("@/components/booking/booking-form", () => {
  return function MockBookingForm({ onClientDetailsSubmit, onBack }: any) {
    return (
      <div data-testid="booking-form">
        <h2>Your Information</h2>
        <button onClick={onBack} data-testid="back-to-time">
          ← Back to Time Selection
        </button>
        <button
          onClick={() =>
            onClientDetailsSubmit({
              name: "John Doe",
              email: "john@example.com",
              phone: "555-123-4567",
              notes: "First time client",
            })
          }
          data-testid="submit-details"
        >
          Continue to Review
        </button>
      </div>
    );
  };
});

jest.mock("@/components/booking/booking-summary", () => {
  return function MockBookingSummary({ onConfirm, onBack }: any) {
    return (
      <div data-testid="booking-summary">
        <h2>Review & Confirm</h2>
        <button onClick={onBack} data-testid="back-to-details">
          ← Back to Details
        </button>
        <button
          onClick={() => onConfirm("test-appointment-123")}
          data-testid="confirm-booking"
        >
          Confirm Appointment
        </button>
      </div>
    );
  };
});

jest.mock("@/components/booking/booking-success", () => {
  return function MockBookingSuccess({ appointmentId, onBookAnother }: any) {
    return (
      <div data-testid="booking-success">
        <h2>Appointment Confirmed!</h2>
        <p>Appointment ID: {appointmentId}</p>
        <button onClick={onBookAnother} data-testid="book-another">
          Book Another Appointment
        </button>
      </div>
    );
  };
});

describe("AppointmentBooking", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetServerSession.mockResolvedValue(mockSession);
    
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <AppointmentBooking />
      </QueryClientProvider>
    );
  };

  it("renders the initial booking page with service selection", () => {
    renderComponent();

    expect(screen.getByText("Book Your Appointment")).toBeInTheDocument();
    expect(
      screen.getByText(
        /Schedule your counseling session with our easy-to-use booking system/
      )
    ).toBeInTheDocument();
    expect(screen.getByTestId("service-selector")).toBeInTheDocument();
    expect(screen.getByText("Select Your Service")).toBeInTheDocument();
  });

  it("displays progress indicator with correct steps", () => {
    renderComponent();

    // Check all progress steps are present
    expect(screen.getByText("Service")).toBeInTheDocument();
    expect(screen.getByText("Date")).toBeInTheDocument();
    expect(screen.getByText("Time")).toBeInTheDocument();
    expect(screen.getByText("Details")).toBeInTheDocument();
    expect(screen.getByText("Review")).toBeInTheDocument();

    // Check that step 1 is active (should have primary styling)
    const step1 = screen.getByText("1");
    expect(step1.closest("div")).toHaveClass("bg-primary");
  });

  it("navigates through the complete booking flow", async () => {
    const user = userEvent.setup();
    renderComponent();

    // Step 1: Select service
    expect(screen.getByTestId("service-selector")).toBeInTheDocument();
    await user.click(screen.getByTestId("select-service"));

    // Step 2: Select date
    await waitFor(() => {
      expect(screen.getByTestId("calendar-view")).toBeInTheDocument();
    });
    expect(screen.getByText("Selected Service")).toBeInTheDocument();
    expect(screen.getByText("Individual Counseling")).toBeInTheDocument();
    expect(screen.getByText("$120")).toBeInTheDocument();

    await user.click(screen.getByTestId("select-date"));

    // Step 3: Select time
    await waitFor(() => {
      expect(screen.getByTestId("time-slot-grid")).toBeInTheDocument();
    });
    expect(screen.getByText("Booking Summary")).toBeInTheDocument();

    await user.click(screen.getByTestId("select-time"));

    // Step 4: Enter client details
    await waitFor(() => {
      expect(screen.getByTestId("booking-form")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("submit-details"));

    // Step 5: Review and confirm
    await waitFor(() => {
      expect(screen.getByTestId("booking-summary")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("confirm-booking"));

    // Step 6: Success page
    await waitFor(() => {
      expect(screen.getByTestId("booking-success")).toBeInTheDocument();
    });
    expect(
      screen.getByText("Appointment ID: test-appointment-123")
    ).toBeInTheDocument();
  });

  it("allows navigation back to previous steps", async () => {
    const user = userEvent.setup();
    renderComponent();

    // Navigate to step 2
    await user.click(screen.getByTestId("select-service"));

    await waitFor(() => {
      expect(screen.getByTestId("calendar-view")).toBeInTheDocument();
    });

    // Go back to step 1
    await user.click(screen.getByTestId("back-to-service"));

    await waitFor(() => {
      expect(screen.getByTestId("service-selector")).toBeInTheDocument();
    });

    // Navigate forward again to test multiple back operations
    await user.click(screen.getByTestId("select-service"));
    await user.click(screen.getByTestId("select-date"));

    await waitFor(() => {
      expect(screen.getByTestId("time-slot-grid")).toBeInTheDocument();
    });

    // Go back to calendar
    await user.click(screen.getByTestId("back-to-calendar"));

    await waitFor(() => {
      expect(screen.getByTestId("calendar-view")).toBeInTheDocument();
    });
  });

  it("resets booking state when starting a new booking from success page", async () => {
    const user = userEvent.setup();
    renderComponent();

    // Complete full booking flow
    await user.click(screen.getByTestId("select-service"));
    await user.click(screen.getByTestId("select-date"));
    await user.click(screen.getByTestId("select-time"));
    await user.click(screen.getByTestId("submit-details"));
    await user.click(screen.getByTestId("confirm-booking"));

    // Should be on success page
    await waitFor(() => {
      expect(screen.getByTestId("booking-success")).toBeInTheDocument();
    });

    // Book another appointment
    await user.click(screen.getByTestId("book-another"));

    // Should be back at step 1
    await waitFor(() => {
      expect(screen.getByTestId("service-selector")).toBeInTheDocument();
    });

    // Progress indicator should show step 1 as active
    const step1 = screen.getByText("1");
    expect(step1.closest("div")).toHaveClass("bg-primary");
  });

  it("shows service details in sidebar during date and time selection", async () => {
    const user = userEvent.setup();
    renderComponent();

    await user.click(screen.getByTestId("select-service"));

    // On date selection step
    await waitFor(() => {
      expect(screen.getByText("Selected Service")).toBeInTheDocument();
      expect(screen.getByText("Individual Counseling")).toBeInTheDocument();
      expect(screen.getByText("60 minutes")).toBeInTheDocument();
      expect(screen.getByText("$120")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("select-date"));

    // On time selection step
    await waitFor(() => {
      expect(screen.getByText("Booking Summary")).toBeInTheDocument();
      expect(screen.getByText("Individual Counseling")).toBeInTheDocument();
      expect(screen.getByText("60 minutes")).toBeInTheDocument();
      expect(screen.getByText("$120")).toBeInTheDocument();
    });
  });

  it("maintains selected data throughout the booking process", async () => {
    const user = userEvent.setup();
    renderComponent();

    // Select service and verify it persists
    await user.click(screen.getByTestId("select-service"));

    await waitFor(() => {
      expect(screen.getByText("Individual Counseling")).toBeInTheDocument();
    });

    // Select date and verify both service and date persist
    await user.click(screen.getByTestId("select-date"));

    await waitFor(() => {
      expect(screen.getByText("Individual Counseling")).toBeInTheDocument();
      // Check for the formatted date (depends on locale, but should contain date parts)
      const expectedDate = new Date("2024-12-15").toLocaleDateString();
      expect(screen.getByText(expectedDate)).toBeInTheDocument();
    });

    // Select time and navigate through remaining steps
    await user.click(screen.getByTestId("select-time"));
    await user.click(screen.getByTestId("submit-details"));

    // All data should be present in booking summary
    await waitFor(() => {
      expect(screen.getByTestId("booking-summary")).toBeInTheDocument();
    });
  });

  it("handles incomplete booking state gracefully", () => {
    renderComponent();

    // Initial state should only show step 1
    expect(screen.getByTestId("service-selector")).toBeInTheDocument();
    expect(screen.queryByTestId("calendar-view")).not.toBeInTheDocument();
    expect(screen.queryByTestId("time-slot-grid")).not.toBeInTheDocument();
    expect(screen.queryByTestId("booking-form")).not.toBeInTheDocument();
    expect(screen.queryByTestId("booking-summary")).not.toBeInTheDocument();
  });

  it("displays correct progress indicator states", async () => {
    const user = userEvent.setup();
    renderComponent();

    // Step 1: Service (active)
    let step1 = screen.getByText("1");
    let step2 = screen.getByText("2");
    expect(step1.closest("div")).toHaveClass("bg-primary");
    expect(step2.closest("div")).toHaveClass("bg-muted");

    // Move to step 2: Date (step 1 completed, step 2 active)
    await user.click(screen.getByTestId("select-service"));

    await waitFor(() => {
      step1 = screen.getByText("✓");
      step2 = screen.getByText("2");
      expect(step1.closest("div")).toHaveClass("bg-accent");
      expect(step2.closest("div")).toHaveClass("bg-primary");
    });
  });

  it("provides proper accessibility labels and structure", () => {
    renderComponent();

    // Check for proper heading structure
    expect(
      screen.getByRole("heading", { level: 1, name: "Book Your Appointment" })
    ).toBeInTheDocument();

    // Check for descriptive text
    expect(
      screen.getByText(
        /Schedule your counseling session with our easy-to-use booking system/
      )
    ).toBeInTheDocument();
  });
});

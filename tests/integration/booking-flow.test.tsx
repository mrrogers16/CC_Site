import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import AppointmentBooking from "@/components/booking/appointment-booking";

// Mock NextAuth
jest.mock("next-auth/react", () => ({
  SessionProvider: ({ children }: any) => children,
  useSession: () => ({
    data: null,
    status: "unauthenticated",
  }),
}));

// Mock react-day-picker
jest.mock("react-day-picker", () => ({
  DayPicker: ({ onSelect, modifiers }: any) => (
    <div data-testid="day-picker">
      <button
        onClick={() => onSelect(new Date("2024-12-15"))}
        data-testid="select-available-date"
        disabled={!modifiers?.available}
      >
        Select Dec 15
      </button>
    </div>
  ),
}));

// Mock the logger
jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock CSS import
jest.mock("@/styles/calendar.css", () => ({}));

// Mock fetch globally
global.fetch = jest.fn();

const mockServices = [
  {
    id: "service-1",
    title: "Individual Counseling",
    description: "One-on-one therapy sessions",
    duration: 60,
    price: 120,
    features: ["Personalized care", "Evidence-based treatment"],
  },
  {
    id: "service-2",
    title: "Couples Therapy",
    description: "Relationship counseling",
    duration: 90,
    price: 180,
    features: ["Communication skills", "Conflict resolution"],
  },
];

const mockTimeSlots = [
  {
    dateTime: "2024-12-15T09:00:00.000Z",
    available: true,
  },
  {
    dateTime: "2024-12-15T10:00:00.000Z",
    available: true,
  },
  {
    dateTime: "2024-12-15T11:00:00.000Z",
    available: false,
    reason: "Time slot unavailable",
  },
  {
    dateTime: "2024-12-15T14:00:00.000Z",
    available: true,
  },
];

describe.skip("Booking Flow Integration - TODO: Enable when booking system is complete", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Mock successful API responses
    (fetch as jest.Mock).mockImplementation((url: string, options?: any) => {
      if (url.includes("/api/services")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ services: mockServices }),
        });
      }

      if (url.includes("/api/appointments/available")) {
        const urlObj = new URL(url, "http://localhost");
        const date = urlObj.searchParams.get("date");
        const serviceId = urlObj.searchParams.get("serviceId");

        if (date === "2024-12-15" && serviceId) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ slots: mockTimeSlots }),
          });
        }

        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ slots: [] }),
        });
      }

      if (
        url.includes("/api/appointments/book") &&
        options?.method === "POST"
      ) {
        const body = JSON.parse(options.body);
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              appointment: {
                id: "appointment-123",
                dateTime: body.dateTime,
                status: "PENDING",
                service: {
                  id: body.serviceId,
                  title: "Individual Counseling",
                  duration: 60,
                  price: 120,
                },
                user: null,
              },
              message: "Appointment booked successfully",
            }),
        });
      }

      if (url.includes("/api/appointments/appointment-123")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              appointment: {
                id: "appointment-123",
                dateTime: "2024-12-15T09:00:00.000Z",
                status: "PENDING",
                service: {
                  title: "Individual Counseling",
                  duration: 60,
                  price: 120,
                },
              },
            }),
        });
      }

      return Promise.reject(new Error("Not mocked"));
    });
  });

  afterEach(() => {
    queryClient.clear();
    jest.clearAllMocks();
  });

  const renderBookingFlow = () => {
    return render(
      <SessionProvider session={null}>
        <QueryClientProvider client={queryClient}>
          <AppointmentBooking />
        </QueryClientProvider>
      </SessionProvider>
    );
  };

  it("completes the full booking flow successfully", async () => {
    const user = userEvent.setup();
    renderBookingFlow();

    // Step 1: Service Selection
    expect(screen.getByText("Book Your Appointment")).toBeInTheDocument();
    expect(screen.getByText("Select Your Service")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Individual Counseling")).toBeInTheDocument();
    });

    // Select first service
    const serviceCard = screen
      .getByText("Individual Counseling")
      .closest("div");
    await user.click(serviceCard!);

    // Step 2: Date Selection
    await waitFor(() => {
      expect(screen.getByText("Select a Date")).toBeInTheDocument();
    });

    expect(screen.getByText("Selected Service")).toBeInTheDocument();
    expect(screen.getByTestId("day-picker")).toBeInTheDocument();

    await user.click(screen.getByTestId("select-available-date"));

    // Step 3: Time Selection
    await waitFor(() => {
      expect(screen.getByText("Select a Time")).toBeInTheDocument();
    });

    expect(
      screen.getByText("Available appointments for Sunday, December 15, 2024")
    ).toBeInTheDocument();

    // Should show available time slots
    const timeButtons = await screen.findAllByText(/9:00 AM|10:00 AM|2:00 PM/);
    expect(timeButtons.length).toBeGreaterThan(0);

    // Select first available time slot (9:00 AM)
    const nineAmButton = screen.getByText("9:00 AM").closest("button");
    await user.click(nineAmButton!);

    // Click continue button
    await user.click(screen.getByText("Continue →"));

    // Step 4: Client Details Form
    await waitFor(() => {
      expect(screen.getByText("Your Information")).toBeInTheDocument();
    });

    // Fill out the form
    await user.type(screen.getByLabelText(/Full Name/), "John Doe");
    await user.type(
      screen.getByLabelText(/Email Address/),
      "john.doe@example.com"
    );
    await user.type(screen.getByLabelText(/Phone Number/), "555-123-4567");
    await user.type(
      screen.getByLabelText(/Additional Notes/),
      "This is my first counseling session"
    );

    await user.click(screen.getByText("Continue to Review →"));

    // Step 5: Review & Confirm
    await waitFor(() => {
      expect(screen.getByText("Review & Confirm")).toBeInTheDocument();
    });

    // Verify appointment details
    expect(screen.getByText("Individual Counseling")).toBeInTheDocument();
    expect(screen.getByText("Sunday, December 15, 2024")).toBeInTheDocument();
    expect(screen.getByText("9:00 AM")).toBeInTheDocument();
    expect(screen.getByText("$120")).toBeInTheDocument();

    // Verify client details
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("john.doe@example.com")).toBeInTheDocument();
    expect(screen.getByText("555-123-4567")).toBeInTheDocument();
    expect(
      screen.getByText("This is my first counseling session")
    ).toBeInTheDocument();

    // Accept terms and confirm
    const termsCheckbox = screen.getByRole("checkbox");
    await user.click(termsCheckbox);

    await user.click(screen.getByText("Confirm Appointment"));

    // Step 6: Success Page
    await waitFor(() => {
      expect(screen.getByText("Appointment Confirmed!")).toBeInTheDocument();
    });

    expect(
      screen.getByText("Appointment ID: appointment-123")
    ).toBeInTheDocument();
  });

  it("handles booking errors gracefully", async () => {
    const user = userEvent.setup();

    // Mock booking API to fail
    (fetch as jest.Mock).mockImplementation((url: string, options?: any) => {
      if (url.includes("/api/services")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ services: mockServices }),
        });
      }

      if (url.includes("/api/appointments/available")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ slots: mockTimeSlots }),
        });
      }

      if (
        url.includes("/api/appointments/book") &&
        options?.method === "POST"
      ) {
        return Promise.resolve({
          ok: false,
          json: () =>
            Promise.resolve({
              message: "Time slot no longer available",
            }),
        });
      }

      return Promise.reject(new Error("Not mocked"));
    });

    renderBookingFlow();

    // Navigate through booking flow
    await waitFor(() => {
      expect(screen.getByText("Individual Counseling")).toBeInTheDocument();
    });

    const serviceCard = screen
      .getByText("Individual Counseling")
      .closest("div");
    await user.click(serviceCard!);

    await user.click(screen.getByTestId("select-available-date"));

    await waitFor(() => {
      expect(screen.getByText("9:00 AM")).toBeInTheDocument();
    });

    const timeButton = screen.getByText("9:00 AM").closest("button");
    await user.click(timeButton!);
    await user.click(screen.getByText("Continue →"));

    // Fill form
    await user.type(screen.getByLabelText(/Full Name/), "John Doe");
    await user.type(
      screen.getByLabelText(/Email Address/),
      "john.doe@example.com"
    );
    await user.click(screen.getByText("Continue to Review →"));

    // Accept terms and try to confirm
    const termsCheckbox = screen.getByRole("checkbox");
    await user.click(termsCheckbox);
    await user.click(screen.getByText("Confirm Appointment"));

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText("Booking Error")).toBeInTheDocument();
      expect(
        screen.getByText("Time slot no longer available")
      ).toBeInTheDocument();
    });

    // Should still be on review page
    expect(screen.getByText("Review & Confirm")).toBeInTheDocument();
  });

  it("allows navigation back and forth between steps", async () => {
    const user = userEvent.setup();
    renderBookingFlow();

    // Navigate to step 2
    await waitFor(() => {
      expect(screen.getByText("Individual Counseling")).toBeInTheDocument();
    });

    const serviceCard = screen
      .getByText("Individual Counseling")
      .closest("div");
    await user.click(serviceCard!);

    // Go back to step 1
    await user.click(screen.getByText("← Back to Services"));

    await waitFor(() => {
      expect(screen.getByText("Select Your Service")).toBeInTheDocument();
    });

    // Navigate forward again and continue to time selection
    await user.click(serviceCard!);
    await user.click(screen.getByTestId("select-available-date"));

    // Go back to calendar from time selection
    await user.click(screen.getByText("← Back to Calendar"));

    await waitFor(() => {
      expect(screen.getByText("Select a Date")).toBeInTheDocument();
    });

    // Continue forward to form
    await user.click(screen.getByTestId("select-available-date"));

    await waitFor(() => {
      expect(screen.getByText("9:00 AM")).toBeInTheDocument();
    });

    const timeButton = screen.getByText("9:00 AM").closest("button");
    await user.click(timeButton!);
    await user.click(screen.getByText("Continue →"));

    // Go back to time selection from form
    await user.click(screen.getByText("← Back to Time Selection"));

    await waitFor(() => {
      expect(screen.getByText("Select a Time")).toBeInTheDocument();
    });
  });

  it("preserves selected data throughout navigation", async () => {
    const user = userEvent.setup();
    renderBookingFlow();

    // Select service
    await waitFor(() => {
      expect(screen.getByText("Individual Counseling")).toBeInTheDocument();
    });

    const serviceCard = screen
      .getByText("Individual Counseling")
      .closest("div");
    await user.click(serviceCard!);

    // Navigate to time selection
    await user.click(screen.getByTestId("select-available-date"));

    // Verify service info is preserved
    expect(screen.getByText("Individual Counseling")).toBeInTheDocument();
    expect(screen.getByText("60 minutes")).toBeInTheDocument();
    expect(screen.getByText("$120")).toBeInTheDocument();

    // Go back to calendar and verify service is still selected
    await user.click(screen.getByText("← Back to Calendar"));

    await waitFor(() => {
      expect(screen.getByText("Individual Counseling")).toBeInTheDocument();
    });

    // Go back to service selection and verify service is still selected
    await user.click(screen.getByText("← Back to Services"));

    await waitFor(() => {
      const selectedServiceCard = screen
        .getByText("Individual Counseling")
        .closest("div");
      expect(selectedServiceCard).toHaveClass("border-primary");
    });
  });

  it("shows proper loading states during API calls", async () => {
    const _user = userEvent.setup();

    // Mock slow API response
    (fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes("/api/services")) {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve({
              ok: true,
              json: () => Promise.resolve({ services: mockServices }),
            });
          }, 100);
        });
      }
      return Promise.reject(new Error("Not mocked"));
    });

    renderBookingFlow();

    // Should show loading state
    expect(
      screen.getByText("Loading available services...")
    ).toBeInTheDocument();

    // Wait for services to load
    await waitFor(() => {
      expect(screen.getByText("Individual Counseling")).toBeInTheDocument();
    });

    // Loading state should be gone
    expect(
      screen.queryByText("Loading available services...")
    ).not.toBeInTheDocument();
  });

  it("handles empty time slots gracefully", async () => {
    const user = userEvent.setup();

    // Mock API to return no available time slots
    (fetch as jest.Mock).mockImplementation((url: string) => {
      if (url.includes("/api/services")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ services: mockServices }),
        });
      }

      if (url.includes("/api/appointments/available")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ slots: [] }),
        });
      }

      return Promise.reject(new Error("Not mocked"));
    });

    renderBookingFlow();

    // Navigate to time selection
    await waitFor(() => {
      expect(screen.getByText("Individual Counseling")).toBeInTheDocument();
    });

    const serviceCard = screen
      .getByText("Individual Counseling")
      .closest("div");
    await user.click(serviceCard!);
    await user.click(screen.getByTestId("select-available-date"));

    // Should show no time slots message
    await waitFor(() => {
      expect(screen.getByText("No Time Slots Available")).toBeInTheDocument();
    });

    expect(
      screen.getByText(
        "There are no available appointment times for this date. Please select a different date."
      )
    ).toBeInTheDocument();
  });

  it("validates required form fields", async () => {
    const user = userEvent.setup();
    renderBookingFlow();

    // Navigate to form step
    await waitFor(() => {
      expect(screen.getByText("Individual Counseling")).toBeInTheDocument();
    });

    const serviceCard = screen
      .getByText("Individual Counseling")
      .closest("div");
    await user.click(serviceCard!);
    await user.click(screen.getByTestId("select-available-date"));

    await waitFor(() => {
      expect(screen.getByText("9:00 AM")).toBeInTheDocument();
    });

    const timeButton = screen.getByText("9:00 AM").closest("button");
    await user.click(timeButton!);
    await user.click(screen.getByText("Continue →"));

    // Try to submit form without required fields
    const submitButton = screen.getByText("Continue to Review →");
    expect(submitButton).toBeDisabled();

    // Fill only name
    await user.type(screen.getByLabelText(/Full Name/), "John");
    expect(submitButton).toBeDisabled();

    // Add email
    await user.type(screen.getByLabelText(/Email Address/), "john@example.com");

    // Now button should be enabled
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
  });
});

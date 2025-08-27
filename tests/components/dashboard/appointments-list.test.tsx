import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useSession } from "next-auth/react";
import { AppointmentsList } from "@/components/dashboard/appointments-list";

// Mock NextAuth
jest.mock("next-auth/react");
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;

// Mock fetch
global.fetch = jest.fn();

beforeAll(() => {
  // Suppress console methods during tests
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterAll(() => {
  jest.restoreAllMocks();
});

describe("AppointmentsList", () => {
  const mockUpdate = jest.fn();
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

  const mockAppointment = {
    id: "apt123",
    dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
    status: "CONFIRMED",
    notes: "Test appointment notes",
    service: {
      title: "Individual Counseling",
      duration: 60,
      price: "120.00",
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

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
  });

  it("renders loading state initially", () => {
    (fetch as jest.Mock).mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<AppointmentsList />);

    expect(screen.getByText("My Appointments")).toBeInTheDocument();
    expect(
      screen.getByText("Manage your upcoming appointments")
    ).toBeInTheDocument();

    // Check for loading skeleton
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders empty state when no appointments", async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { appointments: [] },
      }),
    });

    render(<AppointmentsList />);

    await waitFor(() => {
      expect(screen.getByText("No upcoming appointments")).toBeInTheDocument();
      expect(
        screen.getByText("You don't have any scheduled appointments yet.")
      ).toBeInTheDocument();
      expect(
        screen.getByText("Schedule Your First Appointment")
      ).toBeInTheDocument();
    });
  });

  it("renders appointments list with appointment data", async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { appointments: [mockAppointment] },
      }),
    });

    render(<AppointmentsList />);

    await waitFor(() => {
      expect(screen.getByText("Individual Counseling")).toBeInTheDocument();
      expect(screen.getByText("Confirmed")).toBeInTheDocument();
      expect(screen.getByText("60 minutes")).toBeInTheDocument();
      expect(screen.getByText("$120.00")).toBeInTheDocument();
      expect(screen.getByText("1 upcoming appointment")).toBeInTheDocument();
    });
  });

  it("renders appointment notes when provided", async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { appointments: [mockAppointment] },
      }),
    });

    render(<AppointmentsList />);

    await waitFor(() => {
      expect(screen.getByText("Notes:")).toBeInTheDocument();
      expect(screen.getByText("Test appointment notes")).toBeInTheDocument();
    });
  });

  it("handles appointment click", async () => {
    const mockOnAppointmentClick = jest.fn();

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { appointments: [mockAppointment] },
      }),
    });

    render(<AppointmentsList onAppointmentClick={mockOnAppointmentClick} />);

    await waitFor(() => {
      expect(screen.getByText("Individual Counseling")).toBeInTheDocument();
    });

    const appointmentCard = screen
      .getByText("Individual Counseling")
      .closest("div");
    if (!appointmentCard) throw new Error("Appointment card not found");

    await userEvent.click(appointmentCard);
    expect(mockOnAppointmentClick).toHaveBeenCalledWith("apt123");
  });

  it("displays correct status badges", async () => {
    const appointments = [
      { ...mockAppointment, id: "apt1", status: "PENDING" as const },
      { ...mockAppointment, id: "apt2", status: "CONFIRMED" as const },
      { ...mockAppointment, id: "apt3", status: "CANCELLED" as const },
    ];

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { appointments },
      }),
    });

    render(<AppointmentsList />);

    await waitFor(() => {
      expect(screen.getByText("Pending")).toBeInTheDocument();
      expect(screen.getByText("Confirmed")).toBeInTheDocument();
      expect(screen.getByText("Cancelled")).toBeInTheDocument();
    });
  });

  it("formats appointment dates correctly", async () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(14, 30); // 2:30 PM

    const appointmentToday = {
      ...mockAppointment,
      id: "apt-today",
      dateTime: new Date(today.setHours(10, 0)).toISOString(), // 10:00 AM today
    };

    const appointmentTomorrow = {
      ...mockAppointment,
      id: "apt-tomorrow",
      dateTime: tomorrow.toISOString(),
    };

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { appointments: [appointmentToday, appointmentTomorrow] },
      }),
    });

    render(<AppointmentsList />);

    await waitFor(() => {
      expect(screen.getByText(/Today at 10:00 AM/i)).toBeInTheDocument();
      expect(screen.getByText(/Tomorrow at 2:30 PM/i)).toBeInTheDocument();
    });
  });

  it("handles API error gracefully", async () => {
    (fetch as jest.Mock).mockRejectedValueOnce(new Error("API Error"));

    render(<AppointmentsList />);

    await waitFor(() => {
      expect(
        screen.getByText("Unable to load appointments. Please try again.")
      ).toBeInTheDocument();
    });
  });

  it("handles non-ok response", async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    render(<AppointmentsList />);

    await waitFor(() => {
      expect(
        screen.getByText("Unable to load appointments. Please try again.")
      ).toBeInTheDocument();
    });
  });

  it("does not fetch appointments when user is not authenticated", () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: mockUpdate,
    });

    render(<AppointmentsList />);

    expect(fetch).not.toHaveBeenCalled();
  });

  it("displays plural appointment count correctly", async () => {
    const multipleAppointments = [
      { ...mockAppointment, id: "apt1" },
      { ...mockAppointment, id: "apt2" },
      { ...mockAppointment, id: "apt3" },
    ];

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { appointments: multipleAppointments },
      }),
    });

    render(<AppointmentsList />);

    await waitFor(() => {
      expect(screen.getByText("3 upcoming appointments")).toBeInTheDocument();
    });
  });

  it("makes correct API call with upcoming filter", async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { appointments: [] },
      }),
    });

    render(<AppointmentsList />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/appointments?upcoming=true");
    });
  });

  it("renders Schedule Another Appointment link", async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: { appointments: [mockAppointment] },
      }),
    });

    render(<AppointmentsList />);

    await waitFor(() => {
      const scheduleLink = screen.getByText("Schedule Another Appointment");
      expect(scheduleLink.closest("a")).toHaveAttribute("href", "/book");
    });
  });
});

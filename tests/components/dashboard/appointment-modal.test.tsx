import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useSession } from "next-auth/react";
import { AppointmentModal } from "@/components/dashboard/appointment-modal";

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

describe("AppointmentModal", () => {
  const mockOnClose = jest.fn();
  const mockOnCancelClick = jest.fn();
  const mockOnRescheduleClick = jest.fn();
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

  const mockAppointmentData = {
    id: "apt123",
    dateTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
    status: "CONFIRMED",
    notes: "Test appointment notes",
    service: {
      title: "Individual Counseling",
      duration: 60,
      price: "120.00",
    },
    user: {
      name: "John Doe",
      email: "john@example.com",
      phone: "555-0123",
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

  it("does not render when closed", () => {
    render(
      <AppointmentModal
        appointmentId="apt123"
        isOpen={false}
        onClose={mockOnClose}
        onCancelClick={mockOnCancelClick}
        onRescheduleClick={mockOnRescheduleClick}
      />
    );

    expect(screen.queryByText("Appointment Details")).not.toBeInTheDocument();
  });

  it("renders loading state when appointmentId provided but no data yet", () => {
    (fetch as jest.Mock).mockImplementation(() => new Promise(() => {})); // Never resolves

    render(
      <AppointmentModal
        appointmentId="apt123"
        isOpen={true}
        onClose={mockOnClose}
        onCancelClick={mockOnCancelClick}
        onRescheduleClick={mockOnRescheduleClick}
      />
    );

    expect(screen.getByText("Appointment Details")).toBeInTheDocument();

    // Check for loading spinner
    expect(
      screen.getByText("Loading appointment details...")
    ).toBeInTheDocument();
    const spinner = document.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });

  it("renders appointment details when data is loaded", async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockAppointmentData,
      }),
    });

    render(
      <AppointmentModal
        appointmentId="apt123"
        isOpen={true}
        onClose={mockOnClose}
        onCancelClick={mockOnCancelClick}
        onRescheduleClick={mockOnRescheduleClick}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Individual Counseling")).toBeInTheDocument();
      expect(screen.getByText("Confirmed")).toBeInTheDocument();
      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("john@example.com")).toBeInTheDocument();
      expect(screen.getByText("60 minutes")).toBeInTheDocument();
      expect(screen.getByText("$120.00")).toBeInTheDocument();
    });
  });

  it("displays appointment notes when provided", async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockAppointmentData,
      }),
    });

    render(
      <AppointmentModal
        appointmentId="apt123"
        isOpen={true}
        onClose={mockOnClose}
        onCancelClick={mockOnCancelClick}
        onRescheduleClick={mockOnRescheduleClick}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Test appointment notes")).toBeInTheDocument();
    });
  });

  it("does not display notes section when no notes", async () => {
    const dataWithoutNotes = { ...mockAppointmentData, notes: null };

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: dataWithoutNotes,
      }),
    });

    render(
      <AppointmentModal
        appointmentId="apt123"
        isOpen={true}
        onClose={mockOnClose}
        onCancelClick={mockOnCancelClick}
        onRescheduleClick={mockOnRescheduleClick}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Individual Counseling")).toBeInTheDocument();
    });

    expect(screen.queryByText("Notes:")).not.toBeInTheDocument();
  });

  it("displays correct status badges", async () => {
    const statuses = [
      "PENDING",
      "CONFIRMED",
      "CANCELLED",
      "COMPLETED",
      "NO_SHOW",
    ];
    const expectedTexts = [
      "Pending Confirmation",
      "Confirmed",
      "Cancelled",
      "Completed",
      "No Show",
    ];

    for (let i = 0; i < statuses.length; i++) {
      const appointmentWithStatus = {
        ...mockAppointmentData,
        status: statuses[i] as any,
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: appointmentWithStatus,
        }),
      });

      render(
        <AppointmentModal
          appointmentId={`apt${i}`}
          isOpen={true}
          onClose={mockOnClose}
          onCancelClick={mockOnCancelClick}
          onRescheduleClick={mockOnRescheduleClick}
        />
      );

      await waitFor(() => {
        const expectedText = expectedTexts[i];
        if (!expectedText) throw new Error("Expected text not found");
        expect(screen.getByText(expectedText)).toBeInTheDocument();
      });
    }
  });

  it("formats appointment date correctly", async () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(14, 30); // 2:30 PM

    const appointmentTomorrow = {
      ...mockAppointmentData,
      dateTime: tomorrow.toISOString(),
    };

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: appointmentTomorrow,
      }),
    });

    render(
      <AppointmentModal
        appointmentId="apt123"
        isOpen={true}
        onClose={mockOnClose}
        onCancelClick={mockOnCancelClick}
        onRescheduleClick={mockOnRescheduleClick}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Tomorrow at 2:30 PM/i)).toBeInTheDocument();
    });
  });

  it("handles close button click", async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockAppointmentData,
      }),
    });

    render(
      <AppointmentModal
        appointmentId="apt123"
        isOpen={true}
        onClose={mockOnClose}
        onCancelClick={mockOnCancelClick}
        onRescheduleClick={mockOnRescheduleClick}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Individual Counseling")).toBeInTheDocument();
    });

    const closeButton = screen.getByRole("button", { name: /close modal/i });
    await userEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("handles escape key press", async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockAppointmentData,
      }),
    });

    render(
      <AppointmentModal
        appointmentId="apt123"
        isOpen={true}
        onClose={mockOnClose}
        onCancelClick={mockOnCancelClick}
        onRescheduleClick={mockOnRescheduleClick}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Individual Counseling")).toBeInTheDocument();
    });

    await userEvent.keyboard("{Escape}");

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("handles backdrop click", async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockAppointmentData,
      }),
    });

    render(
      <AppointmentModal
        appointmentId="apt123"
        isOpen={true}
        onClose={mockOnClose}
        onCancelClick={mockOnCancelClick}
        onRescheduleClick={mockOnRescheduleClick}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Individual Counseling")).toBeInTheDocument();
    });

    // Click on the backdrop (modal overlay)
    const backdrop = screen.getByRole("dialog").parentElement;
    if (!backdrop) throw new Error("Backdrop not found");

    await userEvent.click(backdrop);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("shows cancel button for PENDING appointments", async () => {
    const appointmentWithStatus = {
      ...mockAppointmentData,
      status: "PENDING" as const,
    };

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: appointmentWithStatus,
      }),
    });

    render(
      <AppointmentModal
        appointmentId="apt123"
        isOpen={true}
        onClose={mockOnClose}
        onCancelClick={mockOnCancelClick}
        onRescheduleClick={mockOnRescheduleClick}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Individual Counseling")).toBeInTheDocument();
    });

    expect(screen.getByText("Cancel Appointment")).toBeInTheDocument();
  });

  it("shows cancel button for CONFIRMED appointments", async () => {
    const appointmentWithStatus = {
      ...mockAppointmentData,
      status: "CONFIRMED" as const,
    };

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: appointmentWithStatus,
      }),
    });

    render(
      <AppointmentModal
        appointmentId="apt124"
        isOpen={true}
        onClose={mockOnClose}
        onCancelClick={mockOnCancelClick}
        onRescheduleClick={mockOnRescheduleClick}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Individual Counseling")).toBeInTheDocument();
    });

    expect(screen.getByText("Cancel Appointment")).toBeInTheDocument();
  });

  it("does not show cancel button for CANCELLED appointments", async () => {
    const appointmentWithStatus = {
      ...mockAppointmentData,
      status: "CANCELLED" as const,
    };

    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: appointmentWithStatus,
      }),
    });

    render(
      <AppointmentModal
        appointmentId="apt125"
        isOpen={true}
        onClose={mockOnClose}
        onCancelClick={mockOnCancelClick}
        onRescheduleClick={mockOnRescheduleClick}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Individual Counseling")).toBeInTheDocument();
    });

    expect(screen.queryByText("Cancel Appointment")).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "This appointment cannot be modified due to its current status."
      )
    ).toBeInTheDocument();
  });

  it("handles cancel button click", async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockAppointmentData,
      }),
    });

    render(
      <AppointmentModal
        appointmentId="apt123"
        isOpen={true}
        onClose={mockOnClose}
        onCancelClick={mockOnCancelClick}
        onRescheduleClick={mockOnRescheduleClick}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Individual Counseling")).toBeInTheDocument();
    });

    const cancelButton = screen.getByText("Cancel Appointment");
    await userEvent.click(cancelButton);

    expect(mockOnCancelClick).toHaveBeenCalledWith("apt123");
  });

  it("handles reschedule button click", async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockAppointmentData,
      }),
    });

    render(
      <AppointmentModal
        appointmentId="apt123"
        isOpen={true}
        onClose={mockOnClose}
        onCancelClick={mockOnCancelClick}
        onRescheduleClick={mockOnRescheduleClick}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Individual Counseling")).toBeInTheDocument();
    });

    const rescheduleButton = screen.getByText("Reschedule");
    await userEvent.click(rescheduleButton);

    expect(mockOnRescheduleClick).toHaveBeenCalledWith("apt123");
  });

  it("handles API error gracefully", async () => {
    (fetch as jest.Mock).mockRejectedValueOnce(new Error("API Error"));

    render(
      <AppointmentModal
        appointmentId="apt123"
        isOpen={true}
        onClose={mockOnClose}
        onCancelClick={mockOnCancelClick}
        onRescheduleClick={mockOnRescheduleClick}
      />
    );

    await waitFor(() => {
      expect(
        screen.getByText(
          "Unable to load appointment details. Please try again."
        )
      ).toBeInTheDocument();
    });
  });

  it("handles non-ok response", async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    render(
      <AppointmentModal
        appointmentId="apt123"
        isOpen={true}
        onClose={mockOnClose}
        onCancelClick={mockOnCancelClick}
        onRescheduleClick={mockOnRescheduleClick}
      />
    );

    await waitFor(() => {
      expect(
        screen.getByText(
          "Unable to load appointment details. Please try again."
        )
      ).toBeInTheDocument();
    });
  });

  it("makes correct API call with appointment ID", async () => {
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockAppointmentData,
      }),
    });

    render(
      <AppointmentModal
        appointmentId="apt123"
        isOpen={true}
        onClose={mockOnClose}
        onCancelClick={mockOnCancelClick}
        onRescheduleClick={mockOnRescheduleClick}
      />
    );

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/appointments/apt123");
    });
  });

  it("does not fetch when no appointmentId provided", () => {
    render(
      <AppointmentModal
        appointmentId={null}
        isOpen={true}
        onClose={mockOnClose}
        onCancelClick={mockOnCancelClick}
        onRescheduleClick={mockOnRescheduleClick}
      />
    );

    expect(fetch).not.toHaveBeenCalled();
  });

  it("refetches when appointmentId changes", async () => {
    (fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockAppointmentData }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { ...mockAppointmentData, id: "apt456" },
        }),
      });

    const { rerender } = render(
      <AppointmentModal
        appointmentId="apt123"
        isOpen={true}
        onClose={mockOnClose}
        onCancelClick={mockOnCancelClick}
        onRescheduleClick={mockOnRescheduleClick}
      />
    );

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/appointments/apt123");
    });

    rerender(
      <AppointmentModal
        appointmentId="apt456"
        isOpen={true}
        onClose={mockOnClose}
        onCancelClick={mockOnCancelClick}
        onRescheduleClick={mockOnRescheduleClick}
      />
    );

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/appointments/apt456");
    });

    expect(fetch).toHaveBeenCalledTimes(2);
  });
});

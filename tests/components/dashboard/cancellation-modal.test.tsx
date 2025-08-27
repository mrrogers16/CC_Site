import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CancellationModal } from "@/components/dashboard/cancellation-modal";

beforeAll(() => {
  // Suppress console methods during tests
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterAll(() => {
  jest.restoreAllMocks();
});

describe("CancellationModal", () => {
  const mockOnClose = jest.fn();
  const mockOnConfirm = jest.fn();

  const mockAppointment = {
    id: "apt123",
    dateTime: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(), // 72 hours from now
    status: "CONFIRMED" as const,
    notes: "Test appointment notes",
    service: {
      title: "Individual Counseling",
      duration: 60,
      price: "120.00",
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnConfirm.mockResolvedValue(undefined);
  });

  afterEach(() => {
    // Reset document overflow style
    document.body.style.overflow = "unset";
  });

  it("does not render when closed", () => {
    render(
      <CancellationModal
        appointment={mockAppointment}
        isOpen={false}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    expect(screen.queryByText("Cancel Appointment")).not.toBeInTheDocument();
  });

  it("does not render when no appointment provided", () => {
    render(
      <CancellationModal
        appointment={null}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    expect(screen.queryByText("Cancel Appointment")).not.toBeInTheDocument();
  });

  it("renders cancellation modal with appointment details", () => {
    render(
      <CancellationModal
        appointment={mockAppointment}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    expect(screen.getByText("Cancel Appointment")).toBeInTheDocument();
    expect(screen.getByText("Individual Counseling")).toBeInTheDocument();
    expect(screen.getByText("60 minutes • $120.00")).toBeInTheDocument();
    expect(
      screen.getByText("Please select a reason for cancellation:")
    ).toBeInTheDocument();
  });

  it("displays correct cancellation policy for 48+ hours", () => {
    const farFutureAppointment = {
      ...mockAppointment,
      dateTime: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(), // 72 hours
    };

    render(
      <CancellationModal
        appointment={farFutureAppointment}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    expect(screen.getByText("Refund: $120.00 (100%)")).toBeInTheDocument();
    expect(screen.getByText(/Free cancellation available/)).toBeInTheDocument();
  });

  it("displays correct cancellation policy for 24-48 hours", () => {
    const nearFutureAppointment = {
      ...mockAppointment,
      dateTime: new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString(), // 36 hours
    };

    render(
      <CancellationModal
        appointment={nearFutureAppointment}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    expect(screen.getByText("Refund: $60.00 (50%)")).toBeInTheDocument();
    expect(
      screen.getByText(/Cancellation within 48 hours/)
    ).toBeInTheDocument();
  });

  it("displays correct cancellation policy for less than 24 hours", () => {
    const soonAppointment = {
      ...mockAppointment,
      dateTime: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(), // 12 hours
    };

    render(
      <CancellationModal
        appointment={soonAppointment}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    expect(screen.getByText("Refund: $0.00 (0%)")).toBeInTheDocument();
    expect(
      screen.getByText(/Cancellation within 24 hours/)
    ).toBeInTheDocument();
  });

  it("allows selecting predefined cancellation reasons", async () => {
    const user = userEvent.setup();

    render(
      <CancellationModal
        appointment={mockAppointment}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    // Select "Schedule conflict" reason
    const scheduleConflictRadio = screen.getByRole("radio", {
      name: /schedule conflict/i,
    });
    await user.click(scheduleConflictRadio);

    expect(scheduleConflictRadio).toBeChecked();

    // Continue button should be enabled
    const continueButton = screen.getByRole("button", { name: /continue/i });
    expect(continueButton).not.toBeDisabled();
  });

  it("shows custom reason text area when 'Other' is selected", async () => {
    const user = userEvent.setup();

    render(
      <CancellationModal
        appointment={mockAppointment}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    // Select "Other" reason
    const otherRadio = screen.getByRole("radio", { name: /other/i });
    await user.click(otherRadio);

    expect(otherRadio).toBeChecked();

    // Custom text area should appear
    const customTextArea = screen.getByPlaceholderText(
      /Please provide additional details/i
    );
    expect(customTextArea).toBeInTheDocument();

    // Continue button should be disabled until text is entered
    const continueButton = screen.getByRole("button", { name: /continue/i });
    expect(continueButton).toBeDisabled();

    // Type in custom reason
    await user.type(customTextArea, "Personal emergency");

    // Continue button should now be enabled
    expect(continueButton).not.toBeDisabled();
  });

  it("tracks character count for custom reason", async () => {
    const user = userEvent.setup();

    render(
      <CancellationModal
        appointment={mockAppointment}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    // Select "Other" reason
    const otherRadio = screen.getByRole("radio", { name: /other/i });
    await user.click(otherRadio);

    const customTextArea = screen.getByPlaceholderText(
      /Please provide additional details/i
    );
    const testText = "This is a test reason";

    await user.type(customTextArea, testText);

    expect(
      screen.getByText(`${testText.length}/500 characters`)
    ).toBeInTheDocument();
  });

  it("progresses to confirmation step when continue is clicked", async () => {
    const user = userEvent.setup();

    render(
      <CancellationModal
        appointment={mockAppointment}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    // Select a reason
    const illnessRadio = screen.getByRole("radio", { name: /illness/i });
    await user.click(illnessRadio);

    // Click continue
    const continueButton = screen.getByRole("button", { name: /continue/i });
    await user.click(continueButton);

    // Should show confirmation step
    expect(screen.getByText("Confirm Cancellation")).toBeInTheDocument();
    expect(
      screen.getByText("Are you sure you want to cancel this appointment?")
    ).toBeInTheDocument();
    expect(screen.getByText("Illness")).toBeInTheDocument(); // Shows selected reason
  });

  it("allows going back from confirmation step", async () => {
    const user = userEvent.setup();

    render(
      <CancellationModal
        appointment={mockAppointment}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    // Select reason and continue to confirmation
    const illnessRadio = screen.getByRole("radio", { name: /illness/i });
    await user.click(illnessRadio);

    const continueButton = screen.getByRole("button", { name: /continue/i });
    await user.click(continueButton);

    // Click back button
    const backButton = screen.getByRole("button", { name: /back/i });
    await user.click(backButton);

    // Should be back on reason selection step
    expect(screen.getByText("Cancel Appointment")).toBeInTheDocument();
    expect(
      screen.getByText("Please select a reason for cancellation:")
    ).toBeInTheDocument();
    expect(illnessRadio).toBeChecked(); // Selection should be preserved
  });

  it("calls onConfirm when final cancellation is confirmed", async () => {
    const user = userEvent.setup();

    render(
      <CancellationModal
        appointment={mockAppointment}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    // Select reason and proceed to confirmation
    const familyEmergencyRadio = screen.getByRole("radio", {
      name: /family emergency/i,
    });
    await user.click(familyEmergencyRadio);

    const continueButton = screen.getByRole("button", { name: /continue/i });
    await user.click(continueButton);

    // Confirm cancellation
    const cancelAppointmentButton = screen.getByRole("button", {
      name: /cancel appointment/i,
    });
    await user.click(cancelAppointmentButton);

    expect(mockOnConfirm).toHaveBeenCalledWith("apt123", "Family emergency");
  });

  it("calls onConfirm with custom reason when other is selected", async () => {
    const user = userEvent.setup();

    render(
      <CancellationModal
        appointment={mockAppointment}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    // Select "Other" and provide custom reason
    const otherRadio = screen.getByRole("radio", { name: /other/i });
    await user.click(otherRadio);

    const customTextArea = screen.getByPlaceholderText(
      /Please provide additional details/i
    );
    const customReason = "Unexpected travel required";
    await user.type(customTextArea, customReason);

    // Continue to confirmation
    const continueButton = screen.getByRole("button", { name: /continue/i });
    await user.click(continueButton);

    // Confirm cancellation
    const cancelAppointmentButton = screen.getByRole("button", {
      name: /cancel appointment/i,
    });
    await user.click(cancelAppointmentButton);

    expect(mockOnConfirm).toHaveBeenCalledWith("apt123", customReason);
  });

  it("shows loading state during cancellation", async () => {
    const user = userEvent.setup();

    // Make onConfirm return a promise that doesn't resolve immediately
    mockOnConfirm.mockImplementation(() => new Promise(() => {}));

    render(
      <CancellationModal
        appointment={mockAppointment}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    // Select reason and proceed to confirmation
    const illnessRadio = screen.getByRole("radio", { name: /illness/i });
    await user.click(illnessRadio);

    const continueButton = screen.getByRole("button", { name: /continue/i });
    await user.click(continueButton);

    // Click cancel appointment button
    const cancelAppointmentButton = screen.getByRole("button", {
      name: /cancel appointment/i,
    });
    await user.click(cancelAppointmentButton);

    // Should show loading state
    expect(screen.getByText("Cancelling...")).toBeInTheDocument();
    expect(cancelAppointmentButton).toBeDisabled();

    // Loading spinner should be visible
    const spinner = document.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });

  it("closes modal after successful cancellation", async () => {
    const user = userEvent.setup();

    render(
      <CancellationModal
        appointment={mockAppointment}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    // Select reason and proceed to confirmation
    const illnessRadio = screen.getByRole("radio", { name: /illness/i });
    await user.click(illnessRadio);

    const continueButton = screen.getByRole("button", { name: /continue/i });
    await user.click(continueButton);

    // Confirm cancellation
    const cancelAppointmentButton = screen.getByRole("button", {
      name: /cancel appointment/i,
    });
    await user.click(cancelAppointmentButton);

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  it("handles close button click", async () => {
    const user = userEvent.setup();

    render(
      <CancellationModal
        appointment={mockAppointment}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    const closeButton = screen.getByRole("button", { name: /close modal/i });
    await user.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("handles escape key press", async () => {
    const user = userEvent.setup();

    render(
      <CancellationModal
        appointment={mockAppointment}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    await user.keyboard("{Escape}");

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("prevents escape key when processing", async () => {
    const user = userEvent.setup();

    // Make onConfirm return a promise that doesn't resolve immediately
    mockOnConfirm.mockImplementation(() => new Promise(() => {}));

    render(
      <CancellationModal
        appointment={mockAppointment}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    // Start cancellation process
    const illnessRadio = screen.getByRole("radio", { name: /illness/i });
    await user.click(illnessRadio);

    const continueButton = screen.getByRole("button", { name: /continue/i });
    await user.click(continueButton);

    const cancelAppointmentButton = screen.getByRole("button", {
      name: /cancel appointment/i,
    });
    await user.click(cancelAppointmentButton);

    // Try to escape while processing
    await user.keyboard("{Escape}");

    // onClose should not be called
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it("handles backdrop click", async () => {
    const user = userEvent.setup();

    render(
      <CancellationModal
        appointment={mockAppointment}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    // Click on the backdrop (modal overlay)
    const backdrop = screen.getByRole("dialog").parentElement;
    if (!backdrop) throw new Error("Backdrop not found");

    await user.click(backdrop);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("prevents backdrop click when processing", async () => {
    const user = userEvent.setup();

    // Make onConfirm return a promise that doesn't resolve immediately
    mockOnConfirm.mockImplementation(() => new Promise(() => {}));

    render(
      <CancellationModal
        appointment={mockAppointment}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    // Start cancellation process
    const illnessRadio = screen.getByRole("radio", { name: /illness/i });
    await user.click(illnessRadio);

    const continueButton = screen.getByRole("button", { name: /continue/i });
    await user.click(continueButton);

    const cancelAppointmentButton = screen.getByRole("button", {
      name: /cancel appointment/i,
    });
    await user.click(cancelAppointmentButton);

    // Try to click backdrop while processing
    const backdrop = screen.getByRole("dialog").parentElement;
    if (!backdrop) throw new Error("Backdrop not found");

    await user.click(backdrop);

    // onClose should not be called
    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it("resets state when modal is reopened", () => {
    const { rerender } = render(
      <CancellationModal
        appointment={mockAppointment}
        isOpen={false}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    // Open modal and select a reason
    rerender(
      <CancellationModal
        appointment={mockAppointment}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    const illnessRadio = screen.getByRole("radio", { name: /illness/i });
    expect(illnessRadio).not.toBeChecked();

    // Close and reopen
    rerender(
      <CancellationModal
        appointment={mockAppointment}
        isOpen={false}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    rerender(
      <CancellationModal
        appointment={mockAppointment}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    // Should be reset to reason selection step
    expect(screen.getByText("Cancel Appointment")).toBeInTheDocument();
    expect(screen.queryByText("Confirm Cancellation")).not.toBeInTheDocument();
  });

  it("sets body overflow hidden when open", () => {
    render(
      <CancellationModal
        appointment={mockAppointment}
        isOpen={true}
        onClose={mockOnClose}
        onConfirm={mockOnConfirm}
      />
    );

    expect(document.body.style.overflow).toBe("hidden");
  });

  it("displays correct warning colors based on time", () => {
    const testCases = [
      { hours: 72, expectedColor: "green" }, // 48+ hours - free cancellation
      { hours: 36, expectedColor: "yellow" }, // 24-48 hours - half refund
      { hours: 12, expectedColor: "red" }, // <24 hours - no refund
    ];

    testCases.forEach(({ hours, expectedColor }) => {
      const appointmentTime = new Date(
        Date.now() + hours * 60 * 60 * 1000
      ).toISOString();
      const testAppointment = {
        ...mockAppointment,
        dateTime: appointmentTime,
      };

      const { unmount } = render(
        <CancellationModal
          appointment={testAppointment}
          isOpen={true}
          onClose={mockOnClose}
          onConfirm={mockOnConfirm}
        />
      );

      // Check that the appropriate color classes are applied
      // The color classes are on the container div, need to traverse up to get it
      const policyDiv = screen.getByText(/Refund:/).closest("div")
        ?.parentElement?.parentElement;

      switch (expectedColor) {
        case "green":
          expect(policyDiv).toHaveClass("bg-green-100");
          expect(policyDiv).toHaveClass("text-green-800");
          expect(policyDiv).toHaveClass("border-green-200");
          break;
        case "yellow":
          expect(policyDiv).toHaveClass("bg-yellow-100");
          expect(policyDiv).toHaveClass("text-yellow-800");
          expect(policyDiv).toHaveClass("border-yellow-200");
          break;
        case "red":
          expect(policyDiv).toHaveClass("bg-red-100");
          expect(policyDiv).toHaveClass("text-red-800");
          expect(policyDiv).toHaveClass("border-red-200");
          break;
      }

      // Clean up after each iteration
      unmount();
    });
  });
});

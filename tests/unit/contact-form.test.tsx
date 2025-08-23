import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ContactForm } from "@/components/forms/contact-form";

// Mock fetch
global.fetch = jest.fn();

// Mock logger
jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe("ContactForm", () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
  });

  it("renders all form fields", () => {
    render(<ContactForm />);

    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/phone/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/subject/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/message/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /send message/i })
    ).toBeInTheDocument();
  });

  it("shows validation errors for empty required fields", async () => {
    const user = userEvent.setup();
    render(<ContactForm />);

    const submitButton = screen.getByRole("button", { name: /send message/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText(/name must be at least 2 characters/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/please enter a valid email address/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/subject must be at least 5 characters/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/message must be at least 10 characters/i)
      ).toBeInTheDocument();
    });
  });

  it("shows validation error for invalid email", async () => {
    const user = userEvent.setup();
    render(<ContactForm />);

    const emailInput = screen.getByLabelText(/email/i);
    await user.type(emailInput, "invalid-email");

    const submitButton = screen.getByRole("button", { name: /send message/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText(/please enter a valid email address/i)
      ).toBeInTheDocument();
    });
  });

  it("submits form with valid data", async () => {
    const user = userEvent.setup();
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        message: "Thank you for your message.",
      }),
    });

    render(<ContactForm />);

    // Fill out the form
    await user.type(screen.getByLabelText(/name/i), "John Doe");
    await user.type(screen.getByLabelText(/email/i), "john@example.com");
    await user.type(screen.getByLabelText(/phone/i), "555-123-4567");
    await user.type(screen.getByLabelText(/subject/i), "Test subject");
    await user.type(
      screen.getByLabelText(/message/i),
      "This is a test message."
    );

    const submitButton = screen.getByRole("button", { name: /send message/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "John Doe",
          email: "john@example.com",
          phone: "555-123-4567",
          subject: "Test subject",
          message: "This is a test message.",
        }),
      });
    });
  });

  it("shows success message after successful submission", async () => {
    const user = userEvent.setup();
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        message: "Thank you for your message.",
      }),
    });

    render(<ContactForm />);

    // Fill out the form with valid data
    await user.type(screen.getByLabelText(/name/i), "John Doe");
    await user.type(screen.getByLabelText(/email/i), "john@example.com");
    await user.type(screen.getByLabelText(/subject/i), "Test subject");
    await user.type(
      screen.getByLabelText(/message/i),
      "This is a test message."
    );

    const submitButton = screen.getByRole("button", { name: /send message/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText(/thank you for your message/i)
      ).toBeInTheDocument();
    });
  });

  it("shows error message when submission fails", async () => {
    const user = userEvent.setup();
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    render(<ContactForm />);

    // Fill out the form with valid data
    await user.type(screen.getByLabelText(/name/i), "John Doe");
    await user.type(screen.getByLabelText(/email/i), "john@example.com");
    await user.type(screen.getByLabelText(/subject/i), "Test subject");
    await user.type(
      screen.getByLabelText(/message/i),
      "This is a test message."
    );

    const submitButton = screen.getByRole("button", { name: /send message/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(
        screen.getByText(/there was an error sending your message/i)
      ).toBeInTheDocument();
    });
  });

  it("disables submit button while submitting", async () => {
    const user = userEvent.setup();
    // Mock a delayed response
    (fetch as jest.Mock).mockImplementation(
      () =>
        new Promise(resolve =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => ({ success: true }),
              }),
            100
          )
        )
    );

    render(<ContactForm />);

    // Fill out the form with valid data
    await user.type(screen.getByLabelText(/name/i), "John Doe");
    await user.type(screen.getByLabelText(/email/i), "john@example.com");
    await user.type(screen.getByLabelText(/subject/i), "Test subject");
    await user.type(
      screen.getByLabelText(/message/i),
      "This is a test message."
    );

    const submitButton = screen.getByRole("button", { name: /send message/i });
    await user.click(submitButton);

    // Button should be disabled and show "Sending..."
    expect(screen.getByRole("button", { name: /sending/i })).toBeDisabled();

    // Wait for submission to complete
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /send message/i })
      ).toBeInTheDocument();
    });
  });

  it("resets form after successful submission", async () => {
    const user = userEvent.setup();
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        message: "Thank you for your message.",
      }),
    });

    render(<ContactForm />);

    const nameInput = screen.getByLabelText(/name/i) as HTMLInputElement;
    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
    const subjectInput = screen.getByLabelText(/subject/i) as HTMLInputElement;
    const messageInput = screen.getByLabelText(
      /message/i
    ) as HTMLTextAreaElement;

    // Fill out the form
    await user.type(nameInput, "John Doe");
    await user.type(emailInput, "john@example.com");
    await user.type(subjectInput, "Test subject");
    await user.type(messageInput, "This is a test message.");

    const submitButton = screen.getByRole("button", { name: /send message/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(nameInput.value).toBe("");
      expect(emailInput.value).toBe("");
      expect(subjectInput.value).toBe("");
      expect(messageInput.value).toBe("");
    });
  });
});

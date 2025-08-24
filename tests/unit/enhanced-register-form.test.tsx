import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { EnhancedRegisterForm } from "@/components/forms/enhanced-register-form";

// Mock dependencies
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

jest.mock("next-auth/react", () => ({
  signIn: jest.fn(),
}));

jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock fetch globally
global.fetch = jest.fn();

const mockPush = jest.fn();
const mockRouter = { push: mockPush };

describe("EnhancedRegisterForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (fetch as jest.Mock).mockClear();
  });

  describe("Form Rendering", () => {
    it("renders all form fields", () => {
      render(<EnhancedRegisterForm />);

      expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
      expect(screen.getByLabelText("Password *")).toBeInTheDocument();
      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /create account/i })
      ).toBeInTheDocument();
    });

    it("renders Google sign-in button", () => {
      render(<EnhancedRegisterForm />);

      expect(
        screen.getByRole("button", { name: /continue with google/i })
      ).toBeInTheDocument();
    });

    it("has proper form accessibility attributes", () => {
      render(<EnhancedRegisterForm />);

      const form = screen.getByRole("form");
      expect(form).toBeInTheDocument();

      // Check for proper input associations
      expect(screen.getByLabelText(/full name/i)).toHaveAttribute("id", "name");
      expect(screen.getByLabelText(/email address/i)).toHaveAttribute(
        "id",
        "email"
      );
    });
  });

  describe("Real-time Validation", () => {
    it("shows validation icon for valid name input", async () => {
      const user = userEvent.setup();
      render(<EnhancedRegisterForm />);

      const nameInput = screen.getByLabelText(/full name/i);
      await user.type(nameInput, "John Doe");
      await user.tab(); // Trigger blur

      await waitFor(() => {
        expect(
          screen.getByTestId("name-input").parentElement?.querySelector("svg")
        ).toBeInTheDocument();
      });
    });

    it("shows email availability checking in real-time as user types", async () => {
      const user = userEvent.setup();
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          available: true,
          message: "Email address is available",
        }),
      });

      render(<EnhancedRegisterForm />);

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, "test@example.com");
      // No need to tab - validation should trigger as user types

      await waitFor(
        () => {
          expect(fetch).toHaveBeenCalledWith(
            "/api/auth/check-email?email=test%40example.com"
          );
        },
        { timeout: 3000 }
      ); // Allow time for debounce

      await waitFor(() => {
        expect(
          screen.getByText("Email address is available")
        ).toBeInTheDocument();
      });
    });

    it("shows email unavailable message in real-time", async () => {
      const user = userEvent.setup();
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          available: false,
          message: "Email address is already registered",
        }),
      });

      render(<EnhancedRegisterForm />);

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, "existing@example.com");

      await waitFor(
        () => {
          expect(
            screen.getByText("Email address is already registered")
          ).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });

    it("handles email availability check errors gracefully", async () => {
      const user = userEvent.setup();
      (fetch as jest.Mock).mockRejectedValueOnce(new Error("Network error"));

      render(<EnhancedRegisterForm />);

      const emailInput = screen.getByLabelText(/email address/i);
      await user.type(emailInput, "test@example.com");

      await waitFor(
        () => {
          expect(
            screen.getByText("Error checking email availability")
          ).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });

    it("debounces email availability checks during rapid typing", async () => {
      const user = userEvent.setup();
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          available: true,
          message: "Email address is available",
        }),
      });

      render(<EnhancedRegisterForm />);

      const emailInput = screen.getByLabelText(/email address/i);

      // Type multiple characters rapidly
      await user.type(emailInput, "test");
      await user.type(emailInput, "@example");
      await user.type(emailInput, ".com");

      // Wait for debounce delay (500ms)
      await waitFor(
        () => {
          expect(fetch).toHaveBeenCalledWith(
            "/api/auth/check-email?email=test%40example.com"
          );
        },
        { timeout: 3000 }
      );

      // Should only call the API once due to debouncing
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it("prevents form submission when email is already taken", async () => {
      const user = userEvent.setup();
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          available: false,
          message: "Email address is already registered",
        }),
      });

      render(<EnhancedRegisterForm />);

      // Fill form with taken email
      await user.type(screen.getByTestId("name-input"), "John Doe");
      await user.type(screen.getByTestId("email-input"), "taken@example.com");
      await user.type(
        screen.getByTestId("password-input"),
        "StrongPassword123!"
      );
      await user.type(
        screen.getByTestId("confirm-password-input"),
        "StrongPassword123!"
      );

      await waitFor(
        () => {
          expect(
            screen.getByText("Email address is already registered")
          ).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      // Try to submit form
      await user.click(screen.getByTestId("register-submit"));

      // Should show error message and not call registration API
      await waitFor(() => {
        expect(
          screen.getByText(/email address is already registered/i)
        ).toBeInTheDocument();
      });

      // Should not call registration endpoint
      expect(fetch).not.toHaveBeenCalledWith(
        "/api/auth/register",
        expect.any(Object)
      );
    });
  });

  describe("Autocomplete Attributes", () => {
    it("has proper autocomplete attributes on all form fields", () => {
      render(<EnhancedRegisterForm />);

      expect(screen.getByTestId("name-input")).toHaveAttribute(
        "autoComplete",
        "name"
      );
      expect(screen.getByTestId("email-input")).toHaveAttribute(
        "autoComplete",
        "email"
      );
      expect(screen.getByTestId("phone-input")).toHaveAttribute(
        "autoComplete",
        "tel"
      );
      expect(screen.getByTestId("password-input")).toHaveAttribute(
        "autoComplete",
        "new-password"
      );
      expect(screen.getByTestId("confirm-password-input")).toHaveAttribute(
        "autoComplete",
        "new-password"
      );
    });
  });

  describe("Password Requirements", () => {
    it("shows password requirements on focus", async () => {
      const user = userEvent.setup();
      render(<EnhancedRegisterForm />);

      const passwordInput = screen.getByTestId("password-input");
      await user.click(passwordInput);

      expect(screen.getByTestId("password-requirements")).toBeInTheDocument();
      expect(screen.getByText("Password Requirements:")).toBeInTheDocument();
      expect(screen.getByText("At least 8 characters")).toBeInTheDocument();
    });

    it("updates password strength indicator", async () => {
      const user = userEvent.setup();
      render(<EnhancedRegisterForm />);

      const passwordInput = screen.getByTestId("password-input");
      await user.click(passwordInput);
      await user.type(passwordInput, "weak");

      expect(screen.getByText("Weak")).toBeInTheDocument();

      await user.clear(passwordInput);
      await user.type(passwordInput, "StrongPassword123!");

      await waitFor(() => {
        expect(screen.getByText("Strong")).toBeInTheDocument();
      });
    });

    it("hides password requirements on blur when no error", async () => {
      const user = userEvent.setup();
      render(<EnhancedRegisterForm />);

      const passwordInput = screen.getByTestId("password-input");
      await user.click(passwordInput);

      expect(screen.getByTestId("password-requirements")).toBeInTheDocument();

      await user.tab();

      expect(
        screen.queryByTestId("password-requirements")
      ).not.toBeInTheDocument();
    });
  });

  describe("Password Visibility Toggle", () => {
    it("toggles password visibility", async () => {
      const user = userEvent.setup();
      render(<EnhancedRegisterForm />);

      const passwordInput = screen.getByTestId("password-input");
      const toggleButton = screen.getByTestId("password-toggle");

      expect(passwordInput).toHaveAttribute("type", "password");

      await user.click(toggleButton);
      expect(passwordInput).toHaveAttribute("type", "text");

      await user.click(toggleButton);
      expect(passwordInput).toHaveAttribute("type", "password");
    });

    it("has proper ARIA labels for password toggle", () => {
      render(<EnhancedRegisterForm />);

      const toggleButton = screen.getByTestId("password-toggle");
      expect(toggleButton).toHaveAttribute("aria-label", "Show password");
    });
  });

  describe("Form Submission", () => {
    const validFormData = {
      name: "John Doe",
      email: "john@example.com",
      password: "Password123",
      confirmPassword: "Password123",
      phone: "555-123-4567",
    };

    it("submits form with valid data", async () => {
      const user = userEvent.setup();
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      render(<EnhancedRegisterForm />);

      // Fill form
      await user.type(screen.getByTestId("name-input"), validFormData.name);
      await user.type(screen.getByTestId("email-input"), validFormData.email);
      await user.type(screen.getByTestId("phone-input"), validFormData.phone);
      await user.type(
        screen.getByTestId("password-input"),
        validFormData.password
      );
      await user.type(
        screen.getByTestId("confirm-password-input"),
        validFormData.confirmPassword
      );

      // Submit form
      await user.click(screen.getByTestId("register-submit"));

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(validFormData),
        });
      });

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(
          "/auth/verify-email?email=john%40example.com"
        );
      });
    });

    it("shows loading state during submission", async () => {
      const user = userEvent.setup();

      // Mock email availability check as available
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          available: true,
          message: "Email address is available",
        }),
      });

      // Mock a delayed registration response
      (fetch as jest.Mock).mockImplementationOnce(
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

      render(<EnhancedRegisterForm />);

      // Fill form with valid data
      await user.type(screen.getByTestId("name-input"), validFormData.name);
      await user.type(screen.getByTestId("email-input"), validFormData.email);

      // Wait for email validation to complete
      await waitFor(() => {
        expect(screen.getByTestId("email-availability")).toBeInTheDocument();
        expect(screen.getByTestId("email-availability")).toHaveTextContent(
          "Email address is available"
        );
      });

      await user.type(
        screen.getByTestId("password-input"),
        validFormData.password
      );
      await user.type(
        screen.getByTestId("confirm-password-input"),
        validFormData.confirmPassword
      );

      const submitButton = screen.getByTestId("register-submit");
      await user.click(submitButton);

      // Check loading state immediately after click
      await waitFor(() => {
        expect(submitButton).toBeDisabled();
        expect(screen.getByText("Creating Account...")).toBeInTheDocument();
      });
    });

    it.skip("shows error on registration failure - TODO: Fix email validation timing", async () => {
      const user = userEvent.setup();
      // Mock email validation first
      (fetch as jest.Mock).mockImplementationOnce(
        (_url: string) =>
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
      // Then mock registration failure
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Registration failed" }),
      });

      render(<EnhancedRegisterForm />);

      // Fill and submit form
      await user.type(screen.getByTestId("name-input"), validFormData.name);
      await user.type(screen.getByTestId("email-input"), validFormData.email);

      // Wait for email validation to complete
      await waitFor(() => {
        expect(screen.getByTestId("email-availability")).toBeInTheDocument();
      });

      await user.type(
        screen.getByTestId("password-input"),
        validFormData.password
      );
      await user.type(
        screen.getByTestId("confirm-password-input"),
        validFormData.confirmPassword
      );

      await user.click(screen.getByTestId("register-submit"));

      await waitFor(
        () => {
          expect(screen.getByTestId("registration-error")).toBeInTheDocument();
          expect(screen.getByText("Registration failed")).toBeInTheDocument();
        },
        { timeout: 5000 }
      );
    });

    it.skip("handles network errors gracefully - TODO: Fix email validation timing", async () => {
      const user = userEvent.setup();
      // Mock email validation first
      (fetch as jest.Mock).mockImplementationOnce(
        (_url: string) =>
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
      // Then mock network error for registration
      (fetch as jest.Mock).mockRejectedValueOnce(new Error("Network error"));

      render(<EnhancedRegisterForm />);

      // Fill and submit form
      await user.type(screen.getByTestId("name-input"), validFormData.name);
      await user.type(screen.getByTestId("email-input"), validFormData.email);

      // Wait for email validation to complete
      await waitFor(() => {
        expect(screen.getByTestId("email-availability")).toBeInTheDocument();
      });

      await user.type(
        screen.getByTestId("password-input"),
        validFormData.password
      );
      await user.type(
        screen.getByTestId("confirm-password-input"),
        validFormData.confirmPassword
      );

      await user.click(screen.getByTestId("register-submit"));

      await waitFor(
        () => {
          expect(screen.getByTestId("registration-error")).toBeInTheDocument();
        },
        { timeout: 5000 }
      );
    });
  });

  describe("Google Sign-in", () => {
    it("triggers Google sign-in", async () => {
      const user = userEvent.setup();
      render(<EnhancedRegisterForm />);

      const googleButton = screen.getByTestId("google-signin");
      await user.click(googleButton);

      expect(signIn).toHaveBeenCalledWith("google", { callbackUrl: "/" });
    });

    it("handles Google sign-in errors", async () => {
      const user = userEvent.setup();
      (signIn as jest.Mock).mockRejectedValueOnce(new Error("Google error"));

      render(<EnhancedRegisterForm />);

      const googleButton = screen.getByTestId("google-signin");
      await user.click(googleButton);

      await waitFor(() => {
        expect(screen.getByText(/google sign-in failed/i)).toBeInTheDocument();
      });
    });
  });

  describe("Form Validation", () => {
    it("shows validation errors for empty required fields", async () => {
      const user = userEvent.setup();
      render(<EnhancedRegisterForm />);

      const submitButton = screen.getByTestId("register-submit");
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByTestId("name-error")).toBeInTheDocument();
        expect(screen.getByTestId("email-error")).toBeInTheDocument();
        expect(screen.getByTestId("password-error")).toBeInTheDocument();
      });
    });

    it("validates password confirmation mismatch", async () => {
      const user = userEvent.setup();
      render(<EnhancedRegisterForm />);

      await user.type(screen.getByTestId("password-input"), "Password123");
      await user.type(
        screen.getByTestId("confirm-password-input"),
        "DifferentPassword"
      );
      await user.tab();

      await waitFor(() => {
        expect(
          screen.getByTestId("confirm-password-error")
        ).toBeInTheDocument();
        expect(screen.getByText("Passwords don't match")).toBeInTheDocument();
      });
    });

    it("validates email format", async () => {
      const user = userEvent.setup();
      render(<EnhancedRegisterForm />);

      await user.type(screen.getByTestId("email-input"), "invalid-email");
      await user.tab();

      await waitFor(() => {
        expect(screen.getByTestId("email-error")).toBeInTheDocument();
      });
    });
  });

  describe("Accessibility", () => {
    it("has proper ARIA attributes for error messages", async () => {
      const user = userEvent.setup();
      render(<EnhancedRegisterForm />);

      await user.click(screen.getByTestId("register-submit"));

      await waitFor(() => {
        expect(screen.getByTestId("name-error")).toHaveAttribute(
          "role",
          "alert"
        );
        expect(screen.getByTestId("email-error")).toHaveAttribute(
          "role",
          "alert"
        );
        expect(screen.getByTestId("password-error")).toHaveAttribute(
          "role",
          "alert"
        );
      });
    });

    it("supports keyboard navigation", async () => {
      const user = userEvent.setup();
      render(<EnhancedRegisterForm />);

      const nameInput = screen.getByTestId("name-input");
      await user.click(nameInput);
      expect(nameInput).toHaveFocus();

      await user.tab();
      expect(screen.getByTestId("email-input")).toHaveFocus();
    });
  });
});

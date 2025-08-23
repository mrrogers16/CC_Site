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

describe("Registration Flow Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (fetch as jest.Mock).mockClear();
  });

  describe("Complete Registration Flow", () => {
    const validFormData = {
      name: "John Doe",
      email: "john@example.com",
      password: "StrongPassword123!",
      confirmPassword: "StrongPassword123!",
      phone: "555-123-4567",
    };

    it("completes full registration flow successfully", async () => {
      const user = userEvent.setup();

      // Mock email availability check
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            available: true,
            message: "Email address is available",
          }),
        })
        // Mock registration API call
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            message: "Registration successful",
          }),
        });

      render(<EnhancedRegisterForm />);

      // Fill out the form
      await user.type(screen.getByTestId("name-input"), validFormData.name);
      await user.type(screen.getByTestId("email-input"), validFormData.email);
      await user.tab(); // Trigger email availability check

      await waitFor(() => {
        expect(
          screen.getByText("Email address is available")
        ).toBeInTheDocument();
      });

      await user.type(screen.getByTestId("phone-input"), validFormData.phone);
      await user.type(
        screen.getByTestId("password-input"),
        validFormData.password
      );
      await user.type(
        screen.getByTestId("confirm-password-input"),
        validFormData.confirmPassword
      );

      // Submit the form
      await user.click(screen.getByTestId("register-submit"));

      // Verify API calls
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          "/api/auth/check-email?email=john%40example.com"
        );
        expect(fetch).toHaveBeenCalledWith("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(validFormData),
        });
      });

      // Verify redirect to verification page
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith(
          "/auth/verify-email?email=john%40example.com"
        );
      });
    });

    it("handles email already exists scenario", async () => {
      const user = userEvent.setup();

      // Mock email availability check - email taken
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          available: false,
          message: "Email address is already registered",
        }),
      });

      render(<EnhancedRegisterForm />);

      await user.type(
        screen.getByTestId("email-input"),
        "existing@example.com"
      );
      await user.tab();

      await waitFor(() => {
        expect(
          screen.getByText("Email address is already registered")
        ).toBeInTheDocument();
      });

      // Fill rest of form
      await user.type(screen.getByTestId("name-input"), validFormData.name);
      await user.type(
        screen.getByTestId("password-input"),
        validFormData.password
      );
      await user.type(
        screen.getByTestId("confirm-password-input"),
        validFormData.confirmPassword
      );

      // Try to submit
      await user.click(screen.getByTestId("register-submit"));

      // Should not call registration API
      expect(fetch).toHaveBeenCalledTimes(1); // Only email check
      expect(mockPush).not.toHaveBeenCalled();
    });

    it("handles registration API errors gracefully", async () => {
      const user = userEvent.setup();

      // Mock successful email check but failed registration
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            available: true,
            message: "Email address is available",
          }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: async () => ({
            error: "Registration failed",
            details: "Server error",
          }),
        });

      render(<EnhancedRegisterForm />);

      // Fill and submit form
      await user.type(screen.getByTestId("name-input"), validFormData.name);
      await user.type(screen.getByTestId("email-input"), validFormData.email);
      await user.tab();

      await waitFor(() => {
        expect(
          screen.getByText("Email address is available")
        ).toBeInTheDocument();
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

      // Should show error and not redirect
      await waitFor(() => {
        expect(screen.getByTestId("registration-error")).toBeInTheDocument();
        expect(screen.getByText("Registration failed")).toBeInTheDocument();
      });

      expect(mockPush).not.toHaveBeenCalled();
    });

    it("validates form before allowing submission", async () => {
      const user = userEvent.setup();
      render(<EnhancedRegisterForm />);

      // Try to submit empty form
      await user.click(screen.getByTestId("register-submit"));

      await waitFor(() => {
        expect(screen.getByTestId("name-error")).toBeInTheDocument();
        expect(screen.getByTestId("email-error")).toBeInTheDocument();
        expect(screen.getByTestId("password-error")).toBeInTheDocument();
      });

      // Should not call any APIs
      expect(fetch).not.toHaveBeenCalled();
      expect(mockPush).not.toHaveBeenCalled();
    });

    it("handles network errors during email availability check", async () => {
      const user = userEvent.setup();

      // Mock network error for email check
      (fetch as jest.Mock).mockRejectedValueOnce(new Error("Network error"));

      render(<EnhancedRegisterForm />);

      await user.type(screen.getByTestId("email-input"), "test@example.com");
      await user.tab();

      await waitFor(() => {
        expect(
          screen.getByText("Error checking email availability")
        ).toBeInTheDocument();
      });

      // Should be able to continue with form submission despite email check error
      await user.type(screen.getByTestId("name-input"), validFormData.name);
      await user.type(
        screen.getByTestId("password-input"),
        validFormData.password
      );
      await user.type(
        screen.getByTestId("confirm-password-input"),
        validFormData.confirmPassword
      );

      // Mock successful registration
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await user.click(screen.getByTestId("register-submit"));

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          "/api/auth/register",
          expect.any(Object)
        );
        expect(mockPush).toHaveBeenCalledWith(
          "/auth/verify-email?email=test%40example.com"
        );
      });
    });
  });

  describe("Google Sign-in Integration", () => {
    it("successfully redirects after Google sign-in", async () => {
      const user = userEvent.setup();
      (signIn as jest.Mock).mockResolvedValueOnce({ ok: true });

      render(<EnhancedRegisterForm />);

      await user.click(screen.getByTestId("google-signin"));

      expect(signIn).toHaveBeenCalledWith("google", { callbackUrl: "/" });
    });

    it("handles Google sign-in errors", async () => {
      const user = userEvent.setup();
      (signIn as jest.Mock).mockRejectedValueOnce(
        new Error("Google authentication failed")
      );

      render(<EnhancedRegisterForm />);

      await user.click(screen.getByTestId("google-signin"));

      await waitFor(() => {
        expect(screen.getByText(/google sign-in failed/i)).toBeInTheDocument();
      });
    });
  });

  describe("Form State Management", () => {
    it("maintains form state during async operations", async () => {
      const user = userEvent.setup();

      // Mock slow email availability check
      (fetch as jest.Mock).mockImplementationOnce(
        () =>
          new Promise(resolve =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => ({
                    available: true,
                    message: "Email address is available",
                  }),
                }),
              100
            )
          )
      );

      render(<EnhancedRegisterForm />);

      // Fill form while email check is in progress
      await user.type(screen.getByTestId("name-input"), "John Doe");
      await user.type(screen.getByTestId("email-input"), "test@example.com");
      await user.type(
        screen.getByTestId("password-input"),
        "StrongPassword123!"
      );

      // Values should remain in form
      expect(screen.getByTestId("name-input")).toHaveValue("John Doe");
      expect(screen.getByTestId("email-input")).toHaveValue("test@example.com");
      expect(screen.getByTestId("password-input")).toHaveValue(
        "StrongPassword123!"
      );

      // Wait for email availability result
      await waitFor(() => {
        expect(
          screen.getByText("Email address is available")
        ).toBeInTheDocument();
      });

      // Form values should still be preserved
      expect(screen.getByTestId("name-input")).toHaveValue("John Doe");
      expect(screen.getByTestId("password-input")).toHaveValue(
        "StrongPassword123!"
      );
    });

    it("prevents double submission", async () => {
      const user = userEvent.setup();

      // Mock slow registration API
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            available: true,
            message: "Email address is available",
          }),
        })
        .mockImplementationOnce(
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

      // Fill form
      await user.type(screen.getByTestId("name-input"), "John Doe");
      await user.type(screen.getByTestId("email-input"), "test@example.com");
      await user.tab();

      await waitFor(() => {
        expect(
          screen.getByText("Email address is available")
        ).toBeInTheDocument();
      });

      await user.type(
        screen.getByTestId("password-input"),
        "StrongPassword123!"
      );
      await user.type(
        screen.getByTestId("confirm-password-input"),
        "StrongPassword123!"
      );

      const submitButton = screen.getByTestId("register-submit");

      // Click submit button twice quickly
      await user.click(submitButton);
      await user.click(submitButton);

      // Button should be disabled during submission
      expect(submitButton).toBeDisabled();
      expect(screen.getByText("Creating Account...")).toBeInTheDocument();

      // Should only call registration API once
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith(
          "/api/auth/register",
          expect.any(Object)
        );
      });

      // Count calls to registration endpoint (excluding email availability check)
      const registrationCalls = (fetch as jest.Mock).mock.calls.filter(
        call => call[0] === "/api/auth/register"
      );
      expect(registrationCalls).toHaveLength(1);
    });
  });
});

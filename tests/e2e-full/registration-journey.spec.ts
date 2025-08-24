import { test, expect } from "@playwright/test";

test.describe("Registration User Journey", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to registration page
    await page.goto("/auth/register");
  });

  test("complete registration flow from start to verification page", async ({
    page,
  }) => {
    // Verify registration page loads correctly
    await expect(page.getByText("Create Your Account")).toBeVisible();
    await expect(page.getByText("Register")).toBeVisible();

    // Fill out registration form
    await page.getByTestId("name-input").fill("John Doe");
    await page.getByTestId("email-input").fill("john.doe@example.com");

    // Wait for real-time email availability check (no blur needed)
    await expect(page.getByText("Email address is available")).toBeVisible({
      timeout: 10000,
    });

    await page.getByTestId("phone-input").fill("555-123-4567");
    await page.getByTestId("password-input").fill("StrongPassword123!");

    // Verify password requirements appear
    await expect(page.getByTestId("password-requirements")).toBeVisible();
    await expect(page.getByText("Strong")).toBeVisible();

    await page.getByTestId("confirm-password-input").fill("StrongPassword123!");

    // Submit form
    await page.getByTestId("register-submit").click();

    // Verify loading state
    await expect(page.getByText("Creating Account...")).toBeVisible();

    // Verify redirect to verification page
    await expect(page).toHaveURL(
      /\/auth\/verify-email\?email=john\.doe%40example\.com/
    );

    // Verify verification page content
    await expect(page.getByText("Check Your Email")).toBeVisible();
    await expect(page.getByText("Verification Email Sent")).toBeVisible();
    await expect(page.getByTestId("email-display")).toContainText(
      "john.doe@example.com"
    );

    // Verify step-by-step instructions
    await expect(page.getByText("Check your email inbox")).toBeVisible();
    await expect(page.getByText("Click the verification link")).toBeVisible();
    await expect(page.getByText("Start your wellness journey")).toBeVisible();

    // Test resend verification email functionality
    await page.getByTestId("resend-button").click();
    await expect(page.getByText("Sending...")).toBeVisible();
    await expect(page.getByTestId("resend-message")).toBeVisible({
      timeout: 10000,
    });
    await expect(
      page.getByText("Verification email sent! Please check your inbox.")
    ).toBeVisible();
  });

  test("handles email already exists scenario", async ({ page }) => {
    // Fill form with existing email
    await page.getByTestId("name-input").fill("Jane Doe");
    await page.getByTestId("email-input").fill("existing@example.com");

    // Wait for real-time email availability check
    await expect(
      page.getByText("Email address is already registered")
    ).toBeVisible({ timeout: 10000 });

    // Fill rest of form
    await page.getByTestId("password-input").fill("StrongPassword123!");
    await page.getByTestId("confirm-password-input").fill("StrongPassword123!");

    // Submit button should be disabled or form should show validation error
    await page.getByTestId("register-submit").click();

    // Should not navigate away from registration page
    await expect(page).toHaveURL(/\/auth\/register/);

    // Should show error message preventing submission
    await expect(
      page.getByText(/email address is already registered/i)
    ).toBeVisible();
  });

  test("form validation prevents submission with invalid data", async ({
    page,
  }) => {
    // Try to submit empty form
    await page.getByTestId("register-submit").click();

    // Check for validation errors
    await expect(page.getByTestId("name-error")).toBeVisible();
    await expect(page.getByTestId("email-error")).toBeVisible();
    await expect(page.getByTestId("password-error")).toBeVisible();

    // Should stay on registration page
    await expect(page).toHaveURL(/\/auth\/register/);

    // Test invalid email format
    await page.getByTestId("email-input").fill("invalid-email");
    await page.getByTestId("email-input").blur();
    await expect(page.getByTestId("email-error")).toBeVisible();

    // Test password mismatch
    await page.getByTestId("password-input").fill("Password123!");
    await page.getByTestId("confirm-password-input").fill("DifferentPassword");
    await page.getByTestId("confirm-password-input").blur();
    await expect(page.getByTestId("confirm-password-error")).toBeVisible();
    await expect(page.getByText("Passwords don't match")).toBeVisible();
  });

  test("password requirements and strength indicator work correctly", async ({
    page,
  }) => {
    const passwordInput = page.getByTestId("password-input");

    // Focus on password field
    await passwordInput.click();
    await expect(page.getByTestId("password-requirements")).toBeVisible();
    await expect(page.getByText("Password Requirements:")).toBeVisible();
    await expect(page.getByText("At least 8 characters")).toBeVisible();

    // Test weak password
    await passwordInput.fill("weak");
    await expect(page.getByText("Weak")).toBeVisible();

    // Test medium password
    await passwordInput.fill("MediumPass123");
    await expect(page.getByText("Medium")).toBeVisible();

    // Test strong password
    await passwordInput.fill("StrongPassword123!");
    await expect(page.getByText("Strong")).toBeVisible();

    // Requirements should hide on blur if no error
    await page.getByTestId("name-input").click();
    await expect(page.getByTestId("password-requirements")).not.toBeVisible();
  });

  test("password visibility toggle works correctly", async ({ page }) => {
    const passwordInput = page.getByTestId("password-input");
    const toggleButton = page.getByTestId("password-toggle");

    // Initial state should be password (hidden)
    await expect(passwordInput).toHaveAttribute("type", "password");

    // Click toggle to show password
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute("type", "text");

    // Click again to hide password
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute("type", "password");
  });

  test("Google sign-in button is functional", async ({ page }) => {
    const googleButton = page.getByTestId("google-signin");

    await expect(googleButton).toBeVisible();
    await expect(googleButton).toContainText("Continue with Google");

    // Note: We don't actually test the OAuth flow in E2E tests
    // as it requires external service integration
    await expect(googleButton).toBeEnabled();
  });

  test("navigation and page structure are correct", async ({ page }) => {
    // Check navigation is present
    await expect(page.getByRole("navigation")).toBeVisible();

    // Check hero section
    await expect(page.getByText("Create Your Account")).toBeVisible();
    await expect(
      page.getByText("Join our community and take the first step")
    ).toBeVisible();

    // Check benefits section
    await expect(page.getByText("Why Create an Account?")).toBeVisible();
    await expect(page.getByText("Easy Booking")).toBeVisible();
    await expect(page.getByText("Secure & Private")).toBeVisible();
    await expect(page.getByText("Personal Dashboard")).toBeVisible();

    // Check footer is present
    await expect(page.getByRole("contentinfo")).toBeVisible();
  });

  test("handles network errors gracefully", async ({ page }) => {
    // Intercept and fail email availability check
    await page.route("/api/auth/check-email*", route => route.abort());

    await page.getByTestId("email-input").fill("test@example.com");
    await page.getByTestId("email-input").blur();

    // Should show error message
    await expect(
      page.getByText("Error checking email availability")
    ).toBeVisible({ timeout: 10000 });

    // Should still allow form submission
    await page.getByTestId("name-input").fill("John Doe");
    await page.getByTestId("password-input").fill("StrongPassword123!");
    await page.getByTestId("confirm-password-input").fill("StrongPassword123!");

    // Intercept registration API to simulate success
    await page.route("/api/auth/register", route =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true }),
      })
    );

    await page.getByTestId("register-submit").click();

    // Should navigate to verification page
    await expect(page).toHaveURL(
      /\/auth\/verify-email\?email=test%40example\.com/
    );
  });

  test("handles registration API errors", async ({ page }) => {
    // Mock successful email availability check
    await page.route("/api/auth/check-email*", route =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          available: true,
          message: "Email address is available",
        }),
      })
    );

    // Mock failed registration
    await page.route("/api/auth/register", route =>
      route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Registration failed",
          details: "Server error",
        }),
      })
    );

    // Fill and submit form
    await page.getByTestId("name-input").fill("John Doe");
    await page.getByTestId("email-input").fill("test@example.com");
    await page.getByTestId("email-input").blur();

    await expect(page.getByText("Email address is available")).toBeVisible();

    await page.getByTestId("password-input").fill("StrongPassword123!");
    await page.getByTestId("confirm-password-input").fill("StrongPassword123!");
    await page.getByTestId("register-submit").click();

    // Should show error message and stay on page
    await expect(page.getByTestId("registration-error")).toBeVisible();
    await expect(page.getByText("Registration failed")).toBeVisible();
    await expect(page).toHaveURL(/\/auth\/register/);
  });
});

test.describe("Verify Email Page Direct Access", () => {
  test("displays correctly when accessed with email parameter", async ({
    page,
  }) => {
    await page.goto("/auth/verify-email?email=test@example.com");

    await expect(page.getByText("Check Your Email")).toBeVisible();
    await expect(page.getByTestId("email-display")).toContainText(
      "test@example.com"
    );
    await expect(page.getByTestId("resend-button")).toBeEnabled();
  });

  test("handles missing email parameter gracefully", async ({ page }) => {
    await page.goto("/auth/verify-email");

    await expect(page.getByText("Check Your Email")).toBeVisible();
    await expect(page.getByTestId("resend-button")).toBeDisabled();
    await expect(page.getByText("Return to registration")).toBeVisible();
  });

  test("resend verification functionality works", async ({ page }) => {
    await page.goto("/auth/verify-email?email=test@example.com");

    await page.getByTestId("resend-button").click();
    await expect(page.getByText("Sending...")).toBeVisible();

    // Wait for simulated delay (1500ms)
    await expect(page.getByTestId("resend-message")).toBeVisible({
      timeout: 3000,
    });
    await expect(
      page.getByText("Verification email sent! Please check your inbox.")
    ).toBeVisible();
  });

  test("support section provides helpful information", async ({ page }) => {
    await page.goto("/auth/verify-email?email=test@example.com");

    await expect(page.getByText("Need Help?")).toBeVisible();
    await expect(page.getByText("Didn't Receive the Email?")).toBeVisible();
    await expect(page.getByText("Still Having Issues?")).toBeVisible();
    await expect(page.getByText("(555) 123-4567")).toBeVisible();
    await expect(page.getByText("support@healingpathways.com")).toBeVisible();

    // Check what happens after verification section
    await expect(
      page.getByText("What Happens After Verification?")
    ).toBeVisible();
    await expect(
      page.getByText("Your account will be fully activated")
    ).toBeVisible();
  });

  test("form fields have proper autocomplete attributes", async ({ page }) => {
    await page.goto("/auth/register");

    // Check autocomplete attributes for all form fields
    await expect(page.getByTestId("name-input")).toHaveAttribute(
      "autocomplete",
      "name"
    );
    await expect(page.getByTestId("email-input")).toHaveAttribute(
      "autocomplete",
      "email"
    );
    await expect(page.getByTestId("phone-input")).toHaveAttribute(
      "autocomplete",
      "tel"
    );
    await expect(page.getByTestId("password-input")).toHaveAttribute(
      "autocomplete",
      "new-password"
    );
    await expect(page.getByTestId("confirm-password-input")).toHaveAttribute(
      "autocomplete",
      "new-password"
    );
  });

  test("real-time email validation shows visual feedback", async ({ page }) => {
    await page.goto("/auth/register");

    // Mock successful email availability check
    await page.route("/api/auth/check-email*", route =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          available: true,
          message: "Email address is available",
        }),
      })
    );

    await page.getByTestId("email-input").fill("available@example.com");

    // Should show availability message without requiring blur
    await expect(page.getByText("Email address is available")).toBeVisible({
      timeout: 3000,
    });

    // Should show green checkmark
    await expect(page.getByTestId("email-available")).toBeVisible();
  });
});

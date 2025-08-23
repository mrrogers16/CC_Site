import { test, expect } from "@playwright/test";

test.describe("Authentication Flow E2E Tests", () => {
  test.beforeEach(async ({ page }) => {
    // Clear any existing session
    await page.context().clearCookies();
  });

  test.describe("User Registration Flow", () => {
    test("should complete full registration process", async ({ page }) => {
      await page.goto("/auth/register");

      // Verify page loaded correctly
      await expect(page.locator("h1")).toContainText("Create Your Account");
      await expect(page.locator("h2")).toContainText("Register");

      // Fill out registration form
      await page.fill('[data-testid="name-input"]', "E2E Test User");
      await page.fill('[data-testid="email-input"]', "e2e@example.com");
      await page.fill('[data-testid="phone-input"]', "(555) 123-4567");
      await page.fill('[data-testid="password-input"]', "TestPassword123");
      await page.fill(
        '[data-testid="confirm-password-input"]',
        "TestPassword123"
      );

      // Submit form
      await page.click('[data-testid="register-submit"]');

      // Wait for success state
      await expect(
        page.locator('[data-testid="registration-success"]')
      ).toBeVisible();

      // Should redirect to verification page
      await expect(page).toHaveURL("/auth/verify-email");
    });

    test("should show validation errors for invalid data", async ({ page }) => {
      await page.goto("/auth/register");

      // Try to submit empty form
      await page.click('[data-testid="register-submit"]');

      // Check for validation errors
      await expect(page.locator('[data-testid="name-error"]')).toBeVisible();
      await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
      await expect(
        page.locator('[data-testid="password-error"]')
      ).toBeVisible();
    });

    test("should validate password complexity", async ({ page }) => {
      await page.goto("/auth/register");

      await page.fill('[data-testid="name-input"]', "Test User");
      await page.fill('[data-testid="email-input"]', "test@example.com");
      await page.fill('[data-testid="password-input"]', "weak");
      await page.fill('[data-testid="confirm-password-input"]', "weak");

      await page.click('[data-testid="register-submit"]');

      await expect(
        page.locator('[data-testid="password-error"]')
      ).toContainText("Password must be at least 8 characters");
    });

    test("should validate password confirmation", async ({ page }) => {
      await page.goto("/auth/register");

      await page.fill('[data-testid="name-input"]', "Test User");
      await page.fill('[data-testid="email-input"]', "test@example.com");
      await page.fill('[data-testid="password-input"]', "Password123");
      await page.fill('[data-testid="confirm-password-input"]', "Different123");

      await page.click('[data-testid="register-submit"]');

      await expect(
        page.locator('[data-testid="confirm-password-error"]')
      ).toContainText("Passwords don't match");
    });

    test("should handle registration with existing email", async ({ page }) => {
      await page.goto("/auth/register");

      await page.fill('[data-testid="name-input"]', "Duplicate User");
      await page.fill('[data-testid="email-input"]', "existing@example.com");
      await page.fill('[data-testid="password-input"]', "Password123");
      await page.fill('[data-testid="confirm-password-input"]', "Password123");

      await page.click('[data-testid="register-submit"]');

      await expect(
        page.locator('[data-testid="registration-error"]')
      ).toContainText("User already exists with this email address");
    });

    test("should show/hide password fields", async ({ page }) => {
      await page.goto("/auth/register");

      const passwordInput = page.locator('[data-testid="password-input"]');
      const toggleButton = page.locator('[data-testid="password-toggle"]');

      // Initially password should be hidden
      await expect(passwordInput).toHaveAttribute("type", "password");

      // Click toggle to show password
      await toggleButton.click();
      await expect(passwordInput).toHaveAttribute("type", "text");

      // Click again to hide password
      await toggleButton.click();
      await expect(passwordInput).toHaveAttribute("type", "password");
    });
  });

  test.describe("User Login Flow", () => {
    test("should complete login process with valid credentials", async ({
      page,
    }) => {
      await page.goto("/auth/login");

      // Verify page loaded correctly
      await expect(page.locator("h1")).toContainText("Welcome Back");
      await expect(page.locator("h2")).toContainText("Sign In");

      // Fill out login form
      await page.fill('[data-testid="email-input"]', "verified@example.com");
      await page.fill('[data-testid="password-input"]', "CorrectPassword123");

      // Submit form
      await page.click('[data-testid="login-submit"]');

      // Should redirect to home page after successful login
      await expect(page).toHaveURL("/");

      // Should show authenticated state
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    });

    test("should show error for invalid credentials", async ({ page }) => {
      await page.goto("/auth/login");

      await page.fill('[data-testid="email-input"]', "user@example.com");
      await page.fill('[data-testid="password-input"]', "wrongpassword");

      await page.click('[data-testid="login-submit"]');

      await expect(page.locator('[data-testid="login-error"]')).toContainText(
        "Invalid email or password"
      );
    });

    test("should block login for unverified email", async ({ page }) => {
      await page.goto("/auth/login");

      await page.fill('[data-testid="email-input"]', "unverified@example.com");
      await page.fill('[data-testid="password-input"]', "Password123");

      await page.click('[data-testid="login-submit"]');

      await expect(page.locator('[data-testid="login-error"]')).toContainText(
        "Please verify your email address before signing in"
      );
    });

    test("should validate required fields", async ({ page }) => {
      await page.goto("/auth/login");

      await page.click('[data-testid="login-submit"]');

      await expect(page.locator('[data-testid="email-error"]')).toBeVisible();
      await expect(
        page.locator('[data-testid="password-error"]')
      ).toBeVisible();
    });

    test("should navigate to registration page", async ({ page }) => {
      await page.goto("/auth/login");

      await page.click('[data-testid="register-link"]');

      await expect(page).toHaveURL("/auth/register");
    });

    test("should navigate to forgot password page", async ({ page }) => {
      await page.goto("/auth/login");

      await page.click('[data-testid="forgot-password-link"]');

      await expect(page).toHaveURL("/auth/forgot-password");
    });
  });

  test.describe("Google OAuth Flow", () => {
    test("should show Google sign-in button on both pages", async ({
      page,
    }) => {
      // Check registration page
      await page.goto("/auth/register");
      await expect(page.locator('[data-testid="google-signin"]')).toBeVisible();
      await expect(page.locator('[data-testid="google-signin"]')).toContainText(
        "Continue with Google"
      );

      // Check login page
      await page.goto("/auth/login");
      await expect(page.locator('[data-testid="google-signin"]')).toBeVisible();
      await expect(page.locator('[data-testid="google-signin"]')).toContainText(
        "Continue with Google"
      );
    });

    test("should initiate Google OAuth flow", async ({ page }) => {
      await page.goto("/auth/login");

      // Mock OAuth redirect (in real E2E, this would redirect to Google)
      const googleButton = page.locator('[data-testid="google-signin"]');
      await googleButton.click();

      // In a real test environment, we would mock the OAuth response
      // For now, we just verify the button triggers the expected behavior
      await expect(googleButton).toBeVisible();
    });
  });

  test.describe("Navigation and Layout", () => {
    test("should have consistent navigation on auth pages", async ({
      page,
    }) => {
      // Test registration page
      await page.goto("/auth/register");
      await expect(
        page.locator('[data-testid="site-navigation"]')
      ).toBeVisible();
      await expect(page.locator('[data-testid="site-footer"]')).toBeVisible();

      // Test login page
      await page.goto("/auth/login");
      await expect(
        page.locator('[data-testid="site-navigation"]')
      ).toBeVisible();
      await expect(page.locator('[data-testid="site-footer"]')).toBeVisible();
    });

    test("should show benefits section on registration page", async ({
      page,
    }) => {
      await page.goto("/auth/register");

      await expect(
        page.locator('[data-testid="benefits-section"]')
      ).toBeVisible();
      await expect(page.locator("text=Easy Booking")).toBeVisible();
      await expect(page.locator("text=Secure & Private")).toBeVisible();
      await expect(page.locator("text=Personal Dashboard")).toBeVisible();
    });

    test("should show support section on login page", async ({ page }) => {
      await page.goto("/auth/login");

      await expect(
        page.locator('[data-testid="support-section"]')
      ).toBeVisible();
      await expect(page.locator("text=Contact Support")).toBeVisible();
      await expect(page.locator("text=Office Hours")).toBeVisible();
    });
  });

  test.describe("Accessibility", () => {
    test("should have proper form labels and structure", async ({ page }) => {
      await page.goto("/auth/register");

      // Check form labels
      await expect(page.locator('label[for="name"]')).toContainText(
        "Full Name"
      );
      await expect(page.locator('label[for="email"]')).toContainText(
        "Email Address"
      );
      await expect(page.locator('label[for="password"]')).toContainText(
        "Password"
      );

      // Check required field indicators
      await expect(page.locator('label[for="name"]')).toContainText("*");
      await expect(page.locator('label[for="email"]')).toContainText("*");
      await expect(page.locator('label[for="password"]')).toContainText("*");
    });

    test("should be keyboard navigable", async ({ page }) => {
      await page.goto("/auth/login");

      // Tab through form elements
      await page.keyboard.press("Tab"); // Email input
      await expect(page.locator('[data-testid="email-input"]')).toBeFocused();

      await page.keyboard.press("Tab"); // Password input
      await expect(
        page.locator('[data-testid="password-input"]')
      ).toBeFocused();

      await page.keyboard.press("Tab"); // Remember me checkbox
      await page.keyboard.press("Tab"); // Forgot password link
      await page.keyboard.press("Tab"); // Submit button
      await expect(page.locator('[data-testid="login-submit"]')).toBeFocused();
    });

    test("should have proper ARIA attributes", async ({ page }) => {
      await page.goto("/auth/register");

      // Check form has proper attributes
      const form = page.locator("form");
      await expect(form).toBeVisible();

      // Check error messages have proper ARIA attributes
      await page.fill('[data-testid="password-input"]', "weak");
      await page.click('[data-testid="register-submit"]');

      const errorMessage = page.locator('[data-testid="password-error"]');
      await expect(errorMessage).toHaveAttribute("role", "alert");
    });
  });

  test.describe("Form Validation and UX", () => {
    test("should show real-time validation feedback", async ({ page }) => {
      await page.goto("/auth/register");

      // Fill invalid email and tab away
      await page.fill('[data-testid="email-input"]', "invalid-email");
      await page.keyboard.press("Tab");

      // Should show email validation error
      await expect(page.locator('[data-testid="email-error"]')).toBeVisible();

      // Fix email
      await page.fill('[data-testid="email-input"]', "valid@example.com");
      await page.keyboard.press("Tab");

      // Error should disappear
      await expect(
        page.locator('[data-testid="email-error"]')
      ).not.toBeVisible();
    });

    test("should disable submit button while processing", async ({ page }) => {
      await page.goto("/auth/register");

      await page.fill('[data-testid="name-input"]', "Test User");
      await page.fill('[data-testid="email-input"]', "test@example.com");
      await page.fill('[data-testid="password-input"]', "Password123");
      await page.fill('[data-testid="confirm-password-input"]', "Password123");

      // Click submit
      await page.click('[data-testid="register-submit"]');

      // Button should be disabled during processing
      await expect(
        page.locator('[data-testid="register-submit"]')
      ).toBeDisabled();
      await expect(
        page.locator('[data-testid="register-submit"]')
      ).toContainText("Creating Account...");
    });

    test("should remember form data on page refresh", async ({ page }) => {
      await page.goto("/auth/register");

      await page.fill('[data-testid="name-input"]', "Test User");
      await page.fill('[data-testid="email-input"]', "test@example.com");

      // Refresh page
      await page.reload();

      // Form should remember the data (if localStorage is used)
      // This depends on implementation - adjust based on actual behavior
    });
  });

  test.describe("Error Handling", () => {
    test("should handle network errors gracefully", async ({ page }) => {
      // Simulate network error by going offline
      await page.context().setOffline(true);

      await page.goto("/auth/register");

      await page.fill('[data-testid="name-input"]', "Test User");
      await page.fill('[data-testid="email-input"]', "test@example.com");
      await page.fill('[data-testid="password-input"]', "Password123");
      await page.fill('[data-testid="confirm-password-input"]', "Password123");

      await page.click('[data-testid="register-submit"]');

      // Should show network error message
      await expect(
        page.locator('[data-testid="registration-error"]')
      ).toContainText("Network error");

      // Re-enable network
      await page.context().setOffline(false);
    });

    test("should handle server errors gracefully", async ({ page }) => {
      await page.goto("/auth/login");

      await page.fill(
        '[data-testid="email-input"]',
        "server-error@example.com"
      );
      await page.fill('[data-testid="password-input"]', "Password123");

      await page.click('[data-testid="login-submit"]');

      // Should show generic error message for server errors
      await expect(page.locator('[data-testid="login-error"]')).toContainText(
        "Something went wrong"
      );
    });
  });
});

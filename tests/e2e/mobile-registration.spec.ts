import { test, expect, devices } from "@playwright/test";

test.describe("Mobile Registration - iPhone 12", () => {
  test.use(devices["iPhone 12"]);

  test("registration form is fully accessible on mobile", async ({ page }) => {
    await page.goto("/auth/register");

    // Check viewport is mobile
    const viewport = page.viewportSize();
    expect(viewport!.width).toBeLessThan(768);

    // Verify mobile layout
    await expect(page.getByText("Create Your Account")).toBeVisible();

    // Check form is properly sized for mobile
    const form = page.getByRole("form");
    await expect(form).toBeVisible();

    // Verify all form fields are accessible
    await expect(page.getByTestId("name-input")).toBeVisible();
    await expect(page.getByTestId("email-input")).toBeVisible();
    await expect(page.getByTestId("phone-input")).toBeVisible();
    await expect(page.getByTestId("password-input")).toBeVisible();
    await expect(page.getByTestId("confirm-password-input")).toBeVisible();
    await expect(page.getByTestId("register-submit")).toBeVisible();
    await expect(page.getByTestId("google-signin")).toBeVisible();
  });

  test("touch interactions work correctly", async ({ page }) => {
    await page.goto("/auth/register");

    // Test touch tap on input fields
    await page.getByTestId("name-input").tap();
    await expect(page.getByTestId("name-input")).toBeFocused();

    // Test touch on password visibility toggle
    await page.getByTestId("password-input").tap();
    await page.getByTestId("password-input").fill("test");

    const passwordToggle = page.getByTestId("password-toggle");
    await passwordToggle.tap();
    await expect(page.getByTestId("password-input")).toHaveAttribute(
      "type",
      "text"
    );

    await passwordToggle.tap();
    await expect(page.getByTestId("password-input")).toHaveAttribute(
      "type",
      "password"
    );
  });

  test("mobile keyboard behavior works correctly", async ({ page }) => {
    await page.goto("/auth/register");

    // Test email input triggers email keyboard
    const emailInput = page.getByTestId("email-input");
    await emailInput.tap();
    await expect(emailInput).toHaveAttribute("type", "email");
    await expect(emailInput).toHaveAttribute("inputmode", "email");

    // Test phone input triggers numeric keyboard
    const phoneInput = page.getByTestId("phone-input");
    await phoneInput.tap();
    await expect(phoneInput).toHaveAttribute("type", "tel");
    await expect(phoneInput).toHaveAttribute("inputmode", "tel");

    // Test password input is secure
    const passwordInput = page.getByTestId("password-input");
    await passwordInput.tap();
    await expect(passwordInput).toHaveAttribute("type", "password");
  });

  test("form scrolls properly on mobile when keyboard appears", async ({
    page,
  }) => {
    await page.goto("/auth/register");

    // Scroll to bottom input
    await page.getByTestId("confirm-password-input").scrollIntoViewIfNeeded();
    await page.getByTestId("confirm-password-input").tap();

    // Verify input is still visible (not hidden by virtual keyboard)
    await expect(page.getByTestId("confirm-password-input")).toBeVisible();

    // Test that submit button is accessible
    await expect(page.getByTestId("register-submit")).toBeVisible();
  });

  test("password requirements display properly on mobile", async ({ page }) => {
    await page.goto("/auth/register");

    const passwordInput = page.getByTestId("password-input");
    await passwordInput.tap();

    // Password requirements should be visible and readable
    await expect(page.getByTestId("password-requirements")).toBeVisible();

    // Check that requirements don't overflow
    const requirements = page.getByTestId("password-requirements");
    const boundingBox = await requirements.boundingBox();
    const viewport = page.viewportSize();

    expect(boundingBox!.x).toBeGreaterThanOrEqual(0);
    expect(boundingBox!.x + boundingBox!.width).toBeLessThanOrEqual(
      viewport!.width
    );
  });

  test("navigation menu works on mobile", async ({ page }) => {
    await page.goto("/auth/register");

    // Check if mobile menu toggle exists (depends on implementation)
    const mobileMenuButton = page.locator('[data-testid="mobile-menu-button"]');
    if (await mobileMenuButton.isVisible()) {
      await mobileMenuButton.tap();
      // Verify menu opens
      await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
    }

    // Navigation should be accessible
    await expect(page.getByRole("navigation")).toBeVisible();
  });

  test("benefits section is readable on mobile", async ({ page }) => {
    await page.goto("/auth/register");

    // Scroll to benefits section
    await page.getByText("Why Create an Account?").scrollIntoViewIfNeeded();

    // Verify benefits cards are stacked properly on mobile
    const benefitCards = page.getByTestId("benefit-card");
    const firstCard = benefitCards.first();
    const lastCard = benefitCards.last();

    await expect(firstCard).toBeVisible();
    await expect(lastCard).toBeVisible();

    // Cards should be stacked vertically (y position should be different)
    const firstBox = await firstCard.boundingBox();
    const lastBox = await lastCard.boundingBox();
    expect(lastBox!.y).toBeGreaterThan(firstBox!.y + firstBox!.height);
  });

  test("error messages are properly displayed on mobile", async ({ page }) => {
    await page.goto("/auth/register");

    // Trigger validation errors
    await page.getByTestId("register-submit").tap();

    await expect(page.getByTestId("name-error")).toBeVisible();
    await expect(page.getByTestId("email-error")).toBeVisible();
    await expect(page.getByTestId("password-error")).toBeVisible();

    // Verify error messages don't overflow
    const nameError = page.getByTestId("name-error");
    const errorBox = await nameError.boundingBox();
    const viewport = page.viewportSize();

    expect(errorBox!.x + errorBox!.width).toBeLessThanOrEqual(viewport!.width);
  });

  test("form submission loading state works on mobile", async ({ page }) => {
    await page.goto("/auth/register");

    // Mock slow API response
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

    await page.route(
      "/api/auth/register",
      route =>
        new Promise(resolve =>
          setTimeout(() => {
            route.fulfill({
              status: 200,
              contentType: "application/json",
              body: JSON.stringify({ success: true }),
            });
            resolve(undefined);
          }, 1000)
        )
    );

    // Fill form
    await page.getByTestId("name-input").fill("John Doe");
    await page.getByTestId("email-input").fill("test@example.com");
    await page.getByTestId("email-input").blur();

    await expect(page.getByText("Email address is available")).toBeVisible();

    await page.getByTestId("password-input").fill("StrongPassword123!");
    await page.getByTestId("confirm-password-input").fill("StrongPassword123!");

    // Submit form
    await page.getByTestId("register-submit").tap();

    // Verify loading state
    await expect(page.getByText("Creating Account...")).toBeVisible();
    const submitButton = page.getByTestId("register-submit");
    await expect(submitButton).toBeDisabled();

    // Wait for completion
    await expect(page).toHaveURL(/\/auth\/verify-email/, { timeout: 5000 });
  });

  test("verify email page is mobile-friendly", async ({ page }) => {
    await page.goto("/auth/verify-email?email=test@example.com");

    // Check responsive layout
    await expect(page.getByText("Check Your Email")).toBeVisible();
    await expect(page.getByText("Verification Email Sent")).toBeVisible();

    // Email display should be readable
    await expect(page.getByTestId("email-display")).toBeVisible();
    const emailDisplay = page.getByTestId("email-display");
    const emailBox = await emailDisplay.boundingBox();
    const viewport = page.viewportSize();

    expect(emailBox!.x + emailBox!.width).toBeLessThanOrEqual(viewport!.width);

    // Resend button should be accessible
    const resendButton = page.getByTestId("resend-button");
    await expect(resendButton).toBeVisible();
    await resendButton.tap();

    await expect(page.getByText("Sending...")).toBeVisible();
  });

  test("support cards are accessible on mobile", async ({ page }) => {
    await page.goto("/auth/verify-email?email=test@example.com");

    // Scroll to support section
    await page.getByText("Need Help?").scrollIntoViewIfNeeded();

    // Support cards should be stacked on mobile
    const supportCards = page.getByTestId("support-card");
    await expect(supportCards.first()).toBeVisible();
    await expect(supportCards.last()).toBeVisible();

    // Verify content is readable
    await expect(page.getByText("Didn't Receive the Email?")).toBeVisible();
    await expect(page.getByText("Still Having Issues?")).toBeVisible();
    await expect(page.getByText("(555) 123-4567")).toBeVisible();
  });
});

// Test responsive breakpoints
test.describe("Responsive Breakpoint Testing", () => {
  [
    { width: 320, height: 568, name: "Small Mobile" },
    { width: 375, height: 667, name: "Medium Mobile" },
    { width: 414, height: 896, name: "Large Mobile" },
    { width: 768, height: 1024, name: "Tablet" },
  ].forEach(({ width, height, name }) => {
    test(`${name} (${width}x${height}) layout works correctly`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height });
      await page.goto("/auth/register");

      // Form should be properly sized
      const form = page.getByRole("form");
      await expect(form).toBeVisible();

      // All inputs should be visible and properly sized
      const inputs = [
        "name-input",
        "email-input",
        "phone-input",
        "password-input",
        "confirm-password-input",
      ];

      for (const inputTestId of inputs) {
        const input = page.getByTestId(inputTestId);
        await expect(input).toBeVisible();

        const inputBox = await input.boundingBox();
        expect(inputBox!.x).toBeGreaterThanOrEqual(0);
        expect(inputBox!.x + inputBox!.width).toBeLessThanOrEqual(width);
      }

      // Submit button should be visible and properly sized
      const submitButton = page.getByTestId("register-submit");
      await expect(submitButton).toBeVisible();

      const buttonBox = await submitButton.boundingBox();
      expect(buttonBox!.x + buttonBox!.width).toBeLessThanOrEqual(width);
    });
  });
});

// Test accessibility on mobile
test.describe("Mobile Accessibility", () => {
  test.use(devices["iPhone 12"]);

  test("screen reader navigation works correctly", async ({ page }) => {
    await page.goto("/auth/register");

    // Check ARIA labels and roles
    await expect(page.getByRole("form")).toBeVisible();
    await expect(page.getByLabel(/full name/i)).toBeVisible();
    await expect(page.getByLabel(/email address/i)).toBeVisible();
    await expect(page.getByLabel(/phone number/i)).toBeVisible();
    await expect(page.getByLabel("Password *")).toBeVisible();
    await expect(page.getByLabel(/confirm password/i)).toBeVisible();

    // Check button accessibility
    await expect(
      page.getByRole("button", { name: /create account/i })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /continue with google/i })
    ).toBeVisible();
  });

  test("focus management works properly on mobile", async ({ page }) => {
    await page.goto("/auth/register");

    // Test tab navigation
    await page.keyboard.press("Tab");
    await expect(page.getByTestId("name-input")).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(page.getByTestId("email-input")).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(page.getByTestId("phone-input")).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(page.getByTestId("password-input")).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(page.getByTestId("confirm-password-input")).toBeFocused();
  });

  test("error announcements work correctly", async ({ page }) => {
    await page.goto("/auth/register");

    // Trigger validation errors
    await page.getByTestId("register-submit").click();

    // Error messages should have proper ARIA attributes
    await expect(page.getByTestId("name-error")).toHaveAttribute(
      "role",
      "alert"
    );
    await expect(page.getByTestId("email-error")).toHaveAttribute(
      "role",
      "alert"
    );
    await expect(page.getByTestId("password-error")).toHaveAttribute(
      "role",
      "alert"
    );
  });
});

import { test, expect, devices } from "@playwright/test";

// Configure mobile device testing
test.use({ ...devices["iPhone 12"] });

test.describe("Mobile Booking Experience", () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
  });

  test.describe("Mobile-Responsive Booking Flow", () => {
    test("should have touch-friendly booking interface on mobile", async ({
      page,
    }) => {
      await page.goto("/book");

      // Check mobile layout
      await expect(
        page.getByRole("heading", { name: /book.*appointment/i })
      ).toBeVisible();

      // Service cards should be full-width and touch-friendly
      await page.waitForSelector('[data-testid="service-card"]');
      const serviceCards = page.locator('[data-testid="service-card"]');

      for (let i = 0; i < (await serviceCards.count()); i++) {
        const card = serviceCards.nth(i);
        const boundingBox = await card.boundingBox();

        // Cards should be wide enough for mobile (minimum 300px)
        expect(boundingBox?.width).toBeGreaterThan(300);
        // Cards should have sufficient height for touch (minimum 100px)
        expect(boundingBox?.height).toBeGreaterThan(100);
      }

      // Buttons should be touch-friendly (minimum 44px height)
      const selectButton = page
        .locator('[data-testid="service-card"] button')
        .first();
      const buttonBox = await selectButton.boundingBox();
      expect(buttonBox?.height).toBeGreaterThanOrEqual(44);
    });

    test("completes booking flow with touch interactions", async ({ page }) => {
      await page.goto("/book");

      // Step 1: Touch select service
      await page.waitForSelector('[data-testid="service-card"]');
      await page.locator('[data-testid="service-card"]').first().tap();

      // Verify visual feedback for touch
      await expect(
        page.locator('[data-testid="service-card"]').first()
      ).toHaveClass(/border-primary/);

      // Touch continue button
      await page.locator('[data-testid="continue-to-date"]').tap();

      // Step 2: Touch calendar date selection
      await expect(page.getByRole("grid")).toBeVisible();
      await page.waitForTimeout(2000); // Allow calendar to load

      // Calendar should be responsive and touch-friendly
      const calendar = page.getByRole("grid");
      const calendarBox = await calendar.boundingBox();
      const viewportSize = page.viewportSize();

      // Calendar should fit mobile viewport
      expect(calendarBox?.width).toBeLessThanOrEqual(viewportSize!.width);

      // Touch select available date
      await page.locator(".rdp-day_available").first().tap();
      await expect(page.locator(".rdp-day_selected")).toBeVisible();

      // Touch navigation buttons
      const nextButton = page.getByRole("button", { name: /next month/i });
      const nextButtonBox = await nextButton.boundingBox();
      expect(nextButtonBox?.width).toBeGreaterThanOrEqual(44);
      expect(nextButtonBox?.height).toBeGreaterThanOrEqual(44);

      await page.locator('[data-testid="continue-to-time"]').tap();

      // Step 3: Touch time slot selection
      await page.waitForSelector('[data-testid="time-slot"]');

      // Time slots should be touch-friendly
      const timeSlots = page.locator(
        '[data-testid="time-slot"]:not(.disabled)'
      );
      const firstSlot = timeSlots.first();
      const slotBox = await firstSlot.boundingBox();

      expect(slotBox?.height).toBeGreaterThanOrEqual(44);
      expect(slotBox?.width).toBeGreaterThan(100);

      await firstSlot.tap();
      await expect(firstSlot).toHaveClass(/selected/);

      await page.locator('[data-testid="continue-to-form"]').tap();

      // Step 4: Touch form interactions
      await expect(page.getByLabel(/name/i)).toBeVisible();

      // Form inputs should be touch-friendly
      const nameInput = page.locator('[data-testid="booking-name"]');
      const inputBox = await nameInput.boundingBox();
      expect(inputBox?.height).toBeGreaterThanOrEqual(44);

      // Fill form with touch-friendly interactions
      await nameInput.tap();
      await nameInput.fill("Mobile Test User");

      await page.locator('[data-testid="booking-email"]').tap();
      await page
        .locator('[data-testid="booking-email"]')
        .fill("mobile@test.com");

      await page.locator('[data-testid="booking-phone"]').tap();
      await page.locator('[data-testid="booking-phone"]').fill("+1234567890");

      // Submit button should be prominent on mobile
      const submitButton = page.locator('[data-testid="submit-booking"]');
      const submitBox = await submitButton.boundingBox();
      expect(submitBox?.height).toBeGreaterThanOrEqual(48);

      await submitButton.tap();

      // Step 5: Verify mobile-optimized confirmation
      await expect(
        page.getByRole("heading", { name: /booking.*confirmed/i })
      ).toBeVisible();
      await expect(page.getByText("Mobile Test User")).toBeVisible();
    });

    test("handles mobile calendar navigation smoothly", async ({ page }) => {
      await page.goto("/book");

      await page.waitForSelector('[data-testid="service-card"]');
      await page.locator('[data-testid="service-card"]').first().tap();
      await page.locator('[data-testid="continue-to-date"]').tap();

      await expect(page.getByRole("grid")).toBeVisible();
      await page.waitForTimeout(2000);

      // Test month navigation with touch
      const nextButton = page.getByRole("button", { name: /next month/i });
      await nextButton.tap();

      // Calendar should update without layout issues
      await expect(page.getByRole("grid")).toBeVisible();

      const prevButton = page.getByRole("button", { name: /previous month/i });
      await prevButton.tap();

      await expect(page.getByRole("grid")).toBeVisible();

      // Test date selection after navigation
      await page.locator(".rdp-day_available").first().tap();
      await expect(page.locator(".rdp-day_selected")).toBeVisible();
    });

    test("shows mobile-optimized error states", async ({ page }) => {
      // Mock API error
      await page.route("/api/services", route => {
        route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ success: false, error: "Server error" }),
        });
      });

      await page.goto("/book");

      // Error message should be readable on mobile
      await expect(page.getByText(/unable.*load.*services/i)).toBeVisible();

      const errorMessage = page.getByText(/unable.*load.*services/i);
      const messageBox = await errorMessage.boundingBox();
      const viewportSize = page.viewportSize();

      // Error text should fit within mobile viewport
      expect(messageBox?.width).toBeLessThan(viewportSize!.width);

      // Retry button should be touch-friendly
      const retryButton = page.getByText(/try again/i);
      const retryBox = await retryButton.boundingBox();
      expect(retryBox?.height).toBeGreaterThanOrEqual(44);
    });

    test("maintains mobile responsiveness during form validation", async ({
      page,
    }) => {
      await page.goto("/book");

      // Complete flow to booking form
      await page.waitForSelector('[data-testid="service-card"]');
      await page.locator('[data-testid="service-card"]').first().tap();
      await page.locator('[data-testid="continue-to-date"]').tap();

      await page.waitForTimeout(2000);
      await page.locator(".rdp-day_available").first().tap();
      await page.locator('[data-testid="continue-to-time"]').tap();

      await page.waitForSelector('[data-testid="time-slot"]');
      await page
        .locator('[data-testid="time-slot"]:not(.disabled)')
        .first()
        .tap();
      await page.locator('[data-testid="continue-to-form"]').tap();

      // Try to submit empty form
      await page.locator('[data-testid="submit-booking"]').tap();

      // Validation errors should be visible and readable on mobile
      await expect(page.getByText(/name.*required/i)).toBeVisible();
      await expect(page.getByText(/email.*required/i)).toBeVisible();

      // Error messages should not break mobile layout
      const errorText = page.getByText(/name.*required/i);
      const errorBox = await errorText.boundingBox();
      const viewportSize = page.viewportSize();

      expect(errorBox?.width).toBeLessThan(viewportSize!.width);

      // Form should remain usable after validation errors
      const nameInput = page.locator('[data-testid="booking-name"]');
      await nameInput.tap();
      await nameInput.fill("Test User");

      // Input should still be touch-friendly after error state
      const inputBox = await nameInput.boundingBox();
      expect(inputBox?.height).toBeGreaterThanOrEqual(44);
    });

    test("handles mobile orientation changes gracefully", async ({
      page,
      context: _context,
    }) => {
      // Start in portrait mode (default iPhone 12)
      await page.goto("/book");

      await page.waitForSelector('[data-testid="service-card"]');
      await page.locator('[data-testid="service-card"]').first().tap();
      await page.locator('[data-testid="continue-to-date"]').tap();

      await expect(page.getByRole("grid")).toBeVisible();

      // Simulate landscape orientation
      await page.setViewportSize({ width: 844, height: 390 }); // iPhone 12 landscape

      // Calendar should still be visible and functional
      await expect(page.getByRole("grid")).toBeVisible();

      // Calendar should adapt to landscape layout
      const calendar = page.getByRole("grid");
      const calendarBox = await calendar.boundingBox();
      expect(calendarBox?.width).toBeLessThanOrEqual(844);

      // Touch interactions should still work
      await page.waitForTimeout(2000);
      await page.locator(".rdp-day_available").first().tap();
      await expect(page.locator(".rdp-day_selected")).toBeVisible();

      // Return to portrait
      await page.setViewportSize({ width: 390, height: 844 }); // iPhone 12 portrait

      // Should maintain functionality
      await expect(page.getByRole("grid")).toBeVisible();
      await expect(page.locator(".rdp-day_selected")).toBeVisible();
    });
  });

  test.describe("Mobile Performance", () => {
    test("loads booking components quickly on mobile", async ({ page }) => {
      const startTime = Date.now();

      await page.goto("/book");
      await page.waitForSelector('[data-testid="service-card"]');

      const loadTime = Date.now() - startTime;

      // Should load within reasonable time for mobile (5 seconds)
      expect(loadTime).toBeLessThan(5000);

      // Service cards should be visible quickly
      const serviceCards = page.locator('[data-testid="service-card"]');
      await expect(serviceCards.first()).toBeVisible();
    });

    test("handles touch scroll performance", async ({ page }) => {
      await page.goto("/book");

      await page.waitForSelector('[data-testid="service-card"]');

      // Simulate touch scroll
      await page.touchscreen.tap(200, 400);
      await page.mouse.wheel(0, 500);

      // Page should remain responsive after scroll
      await page.locator('[data-testid="service-card"]').first().tap();
      await expect(
        page.locator('[data-testid="service-card"]').first()
      ).toHaveClass(/border-primary/);
    });

    test("maintains performance with multiple calendar interactions", async ({
      page,
    }) => {
      await page.goto("/book");

      await page.waitForSelector('[data-testid="service-card"]');
      await page.locator('[data-testid="service-card"]').first().tap();
      await page.locator('[data-testid="continue-to-date"]').tap();

      await expect(page.getByRole("grid")).toBeVisible();
      await page.waitForTimeout(2000);

      // Rapidly tap navigation buttons
      const nextButton = page.getByRole("button", { name: /next month/i });
      const prevButton = page.getByRole("button", { name: /previous month/i });

      for (let i = 0; i < 5; i++) {
        await nextButton.tap();
        await page.waitForTimeout(100);
      }

      for (let i = 0; i < 5; i++) {
        await prevButton.tap();
        await page.waitForTimeout(100);
      }

      // Calendar should still be responsive
      await expect(page.getByRole("grid")).toBeVisible();
      await page.locator(".rdp-day_available").first().tap();
      await expect(page.locator(".rdp-day_selected")).toBeVisible();
    });
  });

  test.describe("Mobile Accessibility", () => {
    test("supports mobile screen reader navigation", async ({ page }) => {
      await page.goto("/book");

      // Service selection should be accessible
      await page.waitForSelector('[data-testid="service-card"]');
      const serviceCard = page.locator('[data-testid="service-card"]').first();

      // Should have proper ARIA labels for screen readers
      await expect(serviceCard.locator("button")).toHaveAttribute(
        "aria-label",
        /select.*service/i
      );

      await serviceCard.tap();
      await page.locator('[data-testid="continue-to-date"]').tap();

      // Calendar should be screen reader accessible
      await expect(page.getByRole("grid")).toBeVisible();

      const dayCells = page.getByRole("gridcell");
      await expect(dayCells.first()).toHaveAttribute("aria-label");
    });

    test("maintains focus indicators on mobile", async ({ page }) => {
      await page.goto("/book");

      await page.waitForSelector('[data-testid="service-card"]');

      // Focus should be visible when using external keyboard with mobile device
      await page.keyboard.press("Tab");

      const focusedElement = page.locator(":focus");
      await expect(focusedElement).toBeVisible();

      // Focus indicator should be visible against mobile background
      const focusBox = await focusedElement.boundingBox();
      expect(focusBox).toBeTruthy();
    });

    test("provides appropriate touch feedback", async ({ page }) => {
      await page.goto("/book");

      await page.waitForSelector('[data-testid="service-card"]');

      // Touch should provide visual feedback
      const serviceCard = page.locator('[data-testid="service-card"]').first();

      // Tap and hold to verify touch feedback
      await page.touchscreen.tap(200, 300);
      await page.waitForTimeout(100);

      // Should have appropriate visual state changes
      await serviceCard.tap();
      await expect(serviceCard).toHaveClass(/border-primary/);
    });
  });

  test.describe("Mobile Form Interactions", () => {
    test("handles mobile keyboard interactions", async ({ page }) => {
      await page.goto("/book");

      // Complete flow to form
      await page.waitForSelector('[data-testid="service-card"]');
      await page.locator('[data-testid="service-card"]').first().tap();
      await page.locator('[data-testid="continue-to-date"]').tap();

      await page.waitForTimeout(2000);
      await page.locator(".rdp-day_available").first().tap();
      await page.locator('[data-testid="continue-to-time"]').tap();

      await page.waitForSelector('[data-testid="time-slot"]');
      await page
        .locator('[data-testid="time-slot"]:not(.disabled)')
        .first()
        .tap();
      await page.locator('[data-testid="continue-to-form"]').tap();

      // Mobile keyboard should appear for text inputs
      const nameInput = page.locator('[data-testid="booking-name"]');
      await nameInput.tap();

      // Input should be focused and keyboard should trigger
      await expect(nameInput).toBeFocused();

      await nameInput.fill("Mobile User");

      // Email input should trigger email keyboard on mobile
      const emailInput = page.locator('[data-testid="booking-email"]');
      await emailInput.tap();
      await emailInput.fill("mobile@test.com");

      // Phone input should trigger numeric keyboard
      const phoneInput = page.locator('[data-testid="booking-phone"]');
      await phoneInput.tap();
      await phoneInput.fill("+1234567890");

      // Form should be submittable
      await page.locator('[data-testid="submit-booking"]').tap();
      await expect(
        page.getByRole("heading", { name: /booking.*confirmed/i })
      ).toBeVisible();
    });

    test("handles mobile form validation feedback", async ({ page }) => {
      await page.goto("/book");

      // Complete flow to form
      await page.waitForSelector('[data-testid="service-card"]');
      await page.locator('[data-testid="service-card"]').first().tap();
      await page.locator('[data-testid="continue-to-date"]').tap();

      await page.waitForTimeout(2000);
      await page.locator(".rdp-day_available").first().tap();
      await page.locator('[data-testid="continue-to-time"]').tap();

      await page.waitForSelector('[data-testid="time-slot"]');
      await page
        .locator('[data-testid="time-slot"]:not(.disabled)')
        .first()
        .tap();
      await page.locator('[data-testid="continue-to-form"]').tap();

      // Enter invalid data
      await page.locator('[data-testid="booking-name"]').tap();
      await page.locator('[data-testid="booking-name"]').fill("A"); // Too short

      await page.locator('[data-testid="booking-email"]').tap();
      await page.locator('[data-testid="booking-email"]').fill("invalid"); // Invalid email

      await page.locator('[data-testid="submit-booking"]').tap();

      // Validation errors should be clearly visible on mobile
      await expect(page.getByText(/name.*least.*characters/i)).toBeVisible();
      await expect(page.getByText(/valid.*email/i)).toBeVisible();

      // Error messages should not break mobile layout
      const viewportSize = page.viewportSize();
      const errorMessage = page.getByText(/valid.*email/i);
      const errorBox = await errorMessage.boundingBox();

      expect(errorBox?.width).toBeLessThan(viewportSize!.width);
      expect(errorBox?.x).toBeGreaterThanOrEqual(0);
    });
  });
});

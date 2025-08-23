import { test, expect } from "@playwright/test";

test.describe("Appointment Booking Journey", () => {
  test.beforeEach(async ({ page }) => {
    // Clean up any existing sessions
    await page.context().clearCookies();
    await page.goto("/");
  });

  test.describe("Complete Booking Flow", () => {
    test("completes full booking journey from homepage to confirmation", async ({
      page,
    }) => {
      // Step 1: Navigate to booking from homepage
      await page.click('[data-testid="book-appointment-cta"]');
      await expect(page).toHaveURL("/book");

      // Step 2: Verify booking page loads
      await expect(page.getByRole("heading", { name: /book.*appointment/i })).toBeVisible();
      await expect(page.getByText(/select.*service/i)).toBeVisible();

      // Step 3: Select a service
      await page.waitForSelector('[data-testid="service-card"]');
      const serviceCards = page.locator('[data-testid="service-card"]');
      await expect(serviceCards).toHaveCount(3); // Expecting 3 services

      // Click on first service
      await serviceCards.first().click();
      
      // Verify service is selected
      await expect(serviceCards.first()).toHaveClass(/border-primary/);
      await expect(page.getByText("Selected")).toBeVisible();

      // Step 4: Proceed to date selection
      await page.click('[data-testid="continue-to-date"]');
      
      // Verify calendar view loads
      await expect(page.getByRole("heading", { name: /select.*date/i })).toBeVisible();
      await expect(page.getByRole("grid")).toBeVisible();

      // Step 5: Select an available date
      // Wait for calendar to load available dates
      await page.waitForTimeout(2000); // Allow time for API calls
      
      // Find and click an available date (with class indicating availability)
      const availableDate = page.locator('.rdp-day_available').first();
      await expect(availableDate).toBeVisible();
      await availableDate.click();

      // Verify date selection
      await expect(page.locator('.rdp-day_selected')).toBeVisible();

      // Step 6: Proceed to time selection
      await page.click('[data-testid="continue-to-time"]');
      
      // Verify time slots load
      await expect(page.getByRole("heading", { name: /select.*time/i })).toBeVisible();
      await page.waitForSelector('[data-testid="time-slot"]');
      
      // Select first available time slot
      const timeSlots = page.locator('[data-testid="time-slot"]:not(.disabled)');
      await expect(timeSlots).not.toHaveCount(0);
      await timeSlots.first().click();

      // Verify time slot is selected
      await expect(timeSlots.first()).toHaveClass(/selected/);

      // Step 7: Proceed to booking form
      await page.click('[data-testid="continue-to-form"]');
      
      // Verify booking form loads
      await expect(page.getByRole("heading", { name: /complete.*booking/i })).toBeVisible();
      await expect(page.getByLabel(/name/i)).toBeVisible();
      await expect(page.getByLabel(/email/i)).toBeVisible();

      // Step 8: Fill out booking form
      await page.fill('[data-testid="booking-name"]', "E2E Test User");
      await page.fill('[data-testid="booking-email"]', "e2e@test.com");
      await page.fill('[data-testid="booking-phone"]', "+1234567890");
      await page.fill('[data-testid="booking-notes"]', "This is an E2E test booking");

      // Step 9: Submit booking
      await page.click('[data-testid="submit-booking"]');
      
      // Step 10: Verify confirmation page
      await expect(page.getByRole("heading", { name: /booking.*confirmed/i })).toBeVisible();
      await expect(page.getByText(/appointment.*booked.*successfully/i)).toBeVisible();
      
      // Verify booking details are displayed
      await expect(page.getByText("E2E Test User")).toBeVisible();
      await expect(page.getByText("e2e@test.com")).toBeVisible();
      await expect(page.getByText(/individual.*counseling/i)).toBeVisible();
      
      // Verify booking reference/ID is shown
      await expect(page.getByText(/booking.*id|reference/i)).toBeVisible();
    });

    test("allows users to go back and change selections", async ({ page }) => {
      await page.goto("/book");

      // Select first service
      await page.waitForSelector('[data-testid="service-card"]');
      await page.locator('[data-testid="service-card"]').first().click();
      await page.click('[data-testid="continue-to-date"]');

      // Go back to service selection
      await page.click('[data-testid="back-to-services"]');
      await expect(page.getByText(/select.*service/i)).toBeVisible();

      // Select different service
      const serviceCards = page.locator('[data-testid="service-card"]');
      await serviceCards.nth(1).click();
      await expect(serviceCards.nth(1)).toHaveClass(/border-primary/);

      // Proceed to date selection again
      await page.click('[data-testid="continue-to-date"]');
      await expect(page.getByRole("grid")).toBeVisible();

      // Select date and continue
      await page.waitForTimeout(2000);
      await page.locator('.rdp-day_available').first().click();
      await page.click('[data-testid="continue-to-time"]');

      // Go back to date selection
      await page.click('[data-testid="back-to-calendar"]');
      await expect(page.getByRole("grid")).toBeVisible();
      await expect(page.locator('.rdp-day_selected')).toBeVisible();

      // Select different date
      await page.locator('.rdp-day_available').nth(1).click();
      await page.click('[data-testid="continue-to-time"]');
      
      // Verify new date reflected in time selection
      await expect(page.getByRole("heading", { name: /select.*time/i })).toBeVisible();
    });

    test("handles form validation errors", async ({ page }) => {
      await page.goto("/book");

      // Complete flow up to booking form
      await page.waitForSelector('[data-testid="service-card"]');
      await page.locator('[data-testid="service-card"]').first().click();
      await page.click('[data-testid="continue-to-date"]');
      
      await page.waitForTimeout(2000);
      await page.locator('.rdp-day_available').first().click();
      await page.click('[data-testid="continue-to-time"]');
      
      await page.waitForSelector('[data-testid="time-slot"]');
      await page.locator('[data-testid="time-slot"]:not(.disabled)').first().click();
      await page.click('[data-testid="continue-to-form"]');

      // Try to submit form without required fields
      await page.click('[data-testid="submit-booking"]');

      // Verify validation errors appear
      await expect(page.getByText(/name.*required/i)).toBeVisible();
      await expect(page.getByText(/email.*required/i)).toBeVisible();

      // Fill invalid email
      await page.fill('[data-testid="booking-name"]', "Test User");
      await page.fill('[data-testid="booking-email"]', "invalid-email");
      await page.click('[data-testid="submit-booking"]');

      // Verify email validation error
      await expect(page.getByText(/valid.*email/i)).toBeVisible();

      // Fill valid email
      await page.fill('[data-testid="booking-email"]', "valid@test.com");
      await page.click('[data-testid="submit-booking"]');

      // Form should submit successfully now
      await expect(page.getByRole("heading", { name: /booking.*confirmed/i })).toBeVisible();
    });

    test("shows appropriate messages for no available slots", async ({ page }) => {
      // This test assumes there might be dates with no available slots
      await page.goto("/book");

      await page.waitForSelector('[data-testid="service-card"]');
      await page.locator('[data-testid="service-card"]').first().click();
      await page.click('[data-testid="continue-to-date"]');

      await page.waitForTimeout(2000);
      
      // If no available dates, should show message
      const noAvailableMessage = page.getByText(/no available dates/i);
      if (await noAvailableMessage.isVisible()) {
        await expect(page.getByText(/contact us directly/i)).toBeVisible();
      } else {
        // If dates are available, select one and check time slots
        await page.locator('.rdp-day_available').first().click();
        await page.click('[data-testid="continue-to-time"]');
        
        // Check if any time slots are available
        const noSlotsMessage = page.getByText(/no available.*slots/i);
        if (await noSlotsMessage.isVisible()) {
          await expect(page.getByText(/try.*different.*date/i)).toBeVisible();
        }
      }
    });

    test("maintains booking progress state", async ({ page }) => {
      await page.goto("/book");

      // Select service
      await page.waitForSelector('[data-testid="service-card"]');
      const firstService = page.locator('[data-testid="service-card"]').first();
      const serviceTitle = await firstService.getByRole("heading").textContent();
      await firstService.click();

      // Verify service selection is shown in progress
      await expect(page.getByText("Step 1 of 3")).toBeVisible();
      
      await page.click('[data-testid="continue-to-date"]');

      // Verify progress updated
      await expect(page.getByText("Step 2 of 3")).toBeVisible();
      
      // Verify selected service info is still shown
      await expect(page.getByText(serviceTitle!)).toBeVisible();

      // Select date and continue
      await page.waitForTimeout(2000);
      await page.locator('.rdp-day_available').first().click();
      await page.click('[data-testid="continue-to-time"]');

      // Verify progress and previous selections shown
      await expect(page.getByText("Step 3 of 3")).toBeVisible();
      await expect(page.getByText(serviceTitle!)).toBeVisible();
      
      // Selected date should be shown (format may vary)
      await expect(page.locator('[data-testid="selected-date"]')).toBeVisible();
    });

    test("handles browser navigation (back/forward)", async ({ page }) => {
      await page.goto("/book");

      // Select service and go to date selection
      await page.waitForSelector('[data-testid="service-card"]');
      await page.locator('[data-testid="service-card"]').first().click();
      await page.click('[data-testid="continue-to-date"]');

      // Use browser back button
      await page.goBack();
      await expect(page.getByText(/select.*service/i)).toBeVisible();
      
      // Service should still be selected
      await expect(page.locator('[data-testid="service-card"]').first()).toHaveClass(/border-primary/);

      // Use browser forward button
      await page.goForward();
      await expect(page.getByRole("grid")).toBeVisible();

      // Continue with booking
      await page.waitForTimeout(2000);
      await page.locator('.rdp-day_available').first().click();
      await page.click('[data-testid="continue-to-time"]');
      await page.waitForSelector('[data-testid="time-slot"]');

      // Use browser back button
      await page.goBack();
      await expect(page.getByRole("grid")).toBeVisible();
      
      // Selected date should be maintained
      await expect(page.locator('.rdp-day_selected')).toBeVisible();
    });
  });

  test.describe("Accessibility", () => {
    test("supports keyboard navigation throughout booking flow", async ({ page }) => {
      await page.goto("/book");

      // Navigate service selection with keyboard
      await page.waitForSelector('[data-testid="service-card"]');
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");
      
      // First service should be focusable and selectable with Enter
      const firstService = page.locator('[data-testid="service-card"]').first();
      await firstService.focus();
      await page.keyboard.press("Enter");
      
      await expect(firstService).toHaveClass(/border-primary/);

      // Tab to continue button and activate
      await page.keyboard.press("Tab");
      await page.keyboard.press("Enter");

      // Calendar should be navigable with arrow keys
      await expect(page.getByRole("grid")).toBeVisible();
      await page.waitForTimeout(2000);
      
      // Focus calendar and navigate with arrows
      const calendar = page.getByRole("grid");
      await calendar.focus();
      await page.keyboard.press("ArrowRight");
      await page.keyboard.press("ArrowRight");
      await page.keyboard.press("Enter");

      // Should select date and allow continuation
      await expect(page.locator('.rdp-day_selected')).toBeVisible();
    });

    test("provides proper ARIA labels and roles", async ({ page }) => {
      await page.goto("/book");

      // Check service selection accessibility
      await page.waitForSelector('[data-testid="service-card"]');
      const serviceButton = page.locator('[data-testid="service-card"] button').first();
      await expect(serviceButton).toHaveAttribute("aria-label", /select.*service/i);

      // Navigate to calendar
      await page.locator('[data-testid="service-card"]').first().click();
      await page.click('[data-testid="continue-to-date"]');

      // Check calendar accessibility
      await expect(page.getByRole("grid")).toBeVisible();
      
      const prevButton = page.getByRole("button", { name: /previous month/i });
      const nextButton = page.getByRole("button", { name: /next month/i });
      
      await expect(prevButton).toBeVisible();
      await expect(nextButton).toBeVisible();

      // Check day cells have proper labels
      const dayCells = page.getByRole("gridcell");
      await expect(dayCells).not.toHaveCount(0);
    });

    test("maintains focus management during navigation", async ({ page }) => {
      await page.goto("/book");

      await page.waitForSelector('[data-testid="service-card"]');
      await page.locator('[data-testid="service-card"]').first().click();
      await page.click('[data-testid="continue-to-date"]');

      // When going back, focus should be managed appropriately
      await page.click('[data-testid="back-to-services"]');
      
      // Focus should return to selected service or first service
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    });
  });

  test.describe("Error Handling", () => {
    test("handles API errors gracefully", async ({ page }) => {
      // Mock API failure for services
      await page.route("/api/services", route => {
        route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ success: false, error: "Server error" })
        });
      });

      await page.goto("/book");

      // Should show error message
      await expect(page.getByText(/unable.*load.*services/i)).toBeVisible();
      await expect(page.getByText(/try again/i)).toBeVisible();
    });

    test("handles network connectivity issues", async ({ page }) => {
      await page.goto("/book");

      // Select service and proceed to date selection
      await page.waitForSelector('[data-testid="service-card"]');
      await page.locator('[data-testid="service-card"]').first().click();
      
      // Mock network failure for availability API
      await page.route("/api/appointments/available*", route => {
        route.abort();
      });

      await page.click('[data-testid="continue-to-date"]');

      // Should show error message for calendar loading
      await expect(page.getByText(/unable.*load.*calendar/i)).toBeVisible();
      await expect(page.getByRole("button", { name: /try again/i })).toBeVisible();
    });

    test("recovers from temporary errors", async ({ page }) => {
      await page.goto("/book");

      await page.waitForSelector('[data-testid="service-card"]');
      await page.locator('[data-testid="service-card"]').first().click();

      // First request fails
      let requestCount = 0;
      await page.route("/api/appointments/available*", route => {
        requestCount++;
        if (requestCount === 1) {
          route.fulfill({
            status: 500,
            contentType: "application/json",
            body: JSON.stringify({ success: false, error: "Server error" })
          });
        } else {
          // Second request succeeds
          route.continue();
        }
      });

      await page.click('[data-testid="continue-to-date"]');

      // Should show error initially
      await expect(page.getByText(/unable.*load.*calendar/i)).toBeVisible();

      // Click retry
      await page.click('[data-testid="retry-calendar"]');

      // Should load successfully on retry
      await expect(page.getByRole("grid")).toBeVisible();
    });
  });
});
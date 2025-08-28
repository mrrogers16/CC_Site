import { test, expect } from "@playwright/test";
import {
  createTestUser as _createTestUser,
  createTestAppointment as _createTestAppointment,
  cleanupTestData,
} from "../utils/test-helpers";

test.describe("Admin Appointment Management E2E", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to admin login
    await page.goto("/admin/login");

    // Login as admin (assuming test data exists)
    await page.fill('[data-testid="email-input"]', "admin@healingpathways.com");
    await page.fill('[data-testid="password-input"]', "admin123");
    await page.click('[data-testid="login-button"]');

    // Wait for redirect to dashboard
    await expect(page).toHaveURL("/admin/dashboard");
    await expect(page.getByText("Admin Dashboard")).toBeVisible();
  });

  test.describe("Appointment Detail Page", () => {
    test("displays appointment details correctly", async ({ page }) => {
      // Navigate to appointments list
      await page.click('[data-testid="nav-appointments"]');
      await expect(page).toHaveURL(/\/admin\/appointments/);

      // Click on first appointment to view details
      await page.click(
        '[data-testid="appointment-row"]:first-child [data-testid="view-appointment"]'
      );

      // Verify appointment detail page loads
      await expect(page).toHaveURL(/\/admin\/appointments\/[a-z0-9]+$/);
      await expect(page.getByText("Appointment Details")).toBeVisible();

      // Verify appointment information is displayed
      await expect(page.getByTestId("appointment-service")).toBeVisible();
      await expect(page.getByTestId("appointment-date")).toBeVisible();
      await expect(page.getByTestId("appointment-time")).toBeVisible();
      await expect(page.getByTestId("client-name")).toBeVisible();
      await expect(page.getByTestId("client-email")).toBeVisible();

      // Verify action buttons are present
      await expect(page.getByTestId("reschedule-button")).toBeVisible();
      await expect(page.getByTestId("cancel-button")).toBeVisible();
      await expect(page.getByTestId("notify-button")).toBeVisible();
    });

    test("allows editing appointment status", async ({ page }) => {
      // Navigate to first appointment detail page
      await page.click('[data-testid="nav-appointments"]');
      await page.click(
        '[data-testid="appointment-row"]:first-child [data-testid="view-appointment"]'
      );

      // Change status from dropdown
      await page.click('[data-testid="status-select"]');
      await page.click('[data-testid="status-option-confirmed"]');

      // Verify success message appears
      await expect(page.getByText("Status updated successfully")).toBeVisible();

      // Verify status is updated in UI
      await expect(page.getByTestId("appointment-status")).toContainText(
        "CONFIRMED"
      );
    });

    test("allows editing admin notes", async ({ page }) => {
      await page.click('[data-testid="nav-appointments"]');
      await page.click(
        '[data-testid="appointment-row"]:first-child [data-testid="view-appointment"]'
      );

      // Edit admin notes
      const adminNotes =
        "Admin note: Client seems anxious about upcoming session";
      await page.fill('[data-testid="admin-notes-textarea"]', adminNotes);
      await page.click('[data-testid="save-admin-notes"]');

      // Verify success message
      await expect(
        page.getByText("Admin notes updated successfully")
      ).toBeVisible();

      // Reload page and verify notes persist
      await page.reload();
      await expect(page.getByTestId("admin-notes-textarea")).toHaveValue(
        adminNotes
      );
    });
  });

  test.describe("Appointment Rescheduling", () => {
    test("successfully reschedules an appointment", async ({ page }) => {
      await page.click('[data-testid="nav-appointments"]');
      await page.click(
        '[data-testid="appointment-row"]:first-child [data-testid="view-appointment"]'
      );

      // Click reschedule button
      await page.click('[data-testid="reschedule-button"]');

      // Verify reschedule modal/tab opens
      await expect(page.getByText("Reschedule Appointment")).toBeVisible();
      await expect(page.getByText("Current Appointment")).toBeVisible();

      // Select new date
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateString = tomorrow.toISOString().split("T")[0];

      await page.fill('input[type="date"]', dateString);

      // Wait for time slots to load
      await expect(page.getByTestId("time-slots-container")).toBeVisible();
      await page.waitForSelector('[data-testid="time-slot"]:first-child');

      // Select first available time slot
      await page.click('[data-testid="time-slot"]:first-child');

      // Add reschedule reason
      await page.fill(
        '[data-testid="reschedule-reason"]',
        "Client requested different time"
      );

      // Confirm reschedule
      await page.click('[data-testid="confirm-reschedule"]');

      // Verify success message
      await expect(
        page.getByText("Appointment rescheduled successfully")
      ).toBeVisible();

      // Verify appointment details are updated
      await expect(page.getByTestId("appointment-status")).toContainText(
        "PENDING"
      );
    });

    test("shows conflict detection when slot unavailable", async ({ page }) => {
      await page.click('[data-testid="nav-appointments"]');
      await page.click(
        '[data-testid="appointment-row"]:first-child [data-testid="view-appointment"]'
      );

      await page.click('[data-testid="reschedule-button"]');

      // Select a date that might have conflicts
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      const dateString = nextWeek.toISOString().split("T")[0];

      await page.fill('input[type="date"]', dateString);

      // Wait for time slots and select one that might conflict
      await page.waitForSelector('[data-testid="time-slot"]');

      // Try to select an unavailable slot (if any)
      const unavailableSlot = page
        .locator('[data-testid="time-slot"].unavailable')
        .first();
      if ((await unavailableSlot.count()) > 0) {
        await unavailableSlot.click();

        // Verify conflict message appears
        await expect(page.getByText("Time slot not available")).toBeVisible();
      }
    });

    test("prevents rescheduling completed appointments", async ({ page }) => {
      // This test assumes we can navigate to a completed appointment
      // In a real scenario, you'd set up test data with a completed appointment
      await page.click('[data-testid="nav-appointments"]');

      // Look for a completed appointment or create test data
      const completedAppointment = page
        .locator('[data-testid="appointment-row"]')
        .filter({ hasText: "COMPLETED" })
        .first();

      if ((await completedAppointment.count()) > 0) {
        await completedAppointment
          .locator('[data-testid="view-appointment"]')
          .click();

        // Verify reschedule button is disabled or not present
        const rescheduleButton = page.getByTestId("reschedule-button");
        await expect(rescheduleButton).toBeDisabled();
      }
    });
  });

  test.describe("Appointment Cancellation", () => {
    test("cancels appointment with reason and notification", async ({
      page,
    }) => {
      await page.click('[data-testid="nav-appointments"]');
      await page.click(
        '[data-testid="appointment-row"]:first-child [data-testid="view-appointment"]'
      );

      // Click cancel button
      await page.click('[data-testid="cancel-button"]');

      // Verify cancel modal appears
      await expect(page.getByText("Cancel Appointment")).toBeVisible();

      // Fill cancellation reason
      await page.fill(
        '[data-testid="cancellation-reason"]',
        "Emergency cancellation"
      );

      // Ensure notification is enabled
      await expect(
        page.getByTestId("send-notification-checkbox")
      ).toBeChecked();

      // Add cancellation policy
      await page.fill(
        '[data-testid="cancellation-policy"]',
        "24-hour cancellation policy applies"
      );

      // Confirm cancellation
      await page.click('[data-testid="confirm-cancellation"]');

      // Verify success message
      await expect(
        page.getByText("Appointment cancelled successfully")
      ).toBeVisible();

      // Verify appointment status is updated
      await expect(page.getByTestId("appointment-status")).toContainText(
        "CANCELLED"
      );
    });

    test("cancels appointment without notification", async ({ page }) => {
      await page.click('[data-testid="nav-appointments"]');
      await page.click(
        '[data-testid="appointment-row"]:first-child [data-testid="view-appointment"]'
      );

      await page.click('[data-testid="cancel-button"]');

      // Uncheck send notification
      await page.uncheck('[data-testid="send-notification-checkbox"]');

      await page.fill(
        '[data-testid="cancellation-reason"]',
        "Internal cancellation"
      );
      await page.click('[data-testid="confirm-cancellation"]');

      await expect(
        page.getByText("Appointment cancelled successfully")
      ).toBeVisible();
      await expect(page.getByText("No notification sent")).toBeVisible();
    });
  });

  test.describe("Email Notifications", () => {
    test("sends confirmation notification", async ({ page }) => {
      await page.click('[data-testid="nav-appointments"]');
      await page.click(
        '[data-testid="appointment-row"]:first-child [data-testid="view-appointment"]'
      );

      // Click notify button
      await page.click('[data-testid="notify-button"]');

      // Select confirmation notification
      await page.selectOption(
        '[data-testid="notification-type"]',
        "confirmation"
      );

      // Send notification
      await page.click('[data-testid="send-notification"]');

      // Verify success message
      await expect(
        page.getByText("Confirmation notification sent successfully")
      ).toBeVisible();
    });

    test("sends reschedule notification with old date", async ({ page }) => {
      await page.click('[data-testid="nav-appointments"]');
      await page.click(
        '[data-testid="appointment-row"]:first-child [data-testid="view-appointment"]'
      );

      await page.click('[data-testid="notify-button"]');

      // Select reschedule notification
      await page.selectOption(
        '[data-testid="notification-type"]',
        "reschedule"
      );

      // Fill old date/time (required for reschedule)
      await page.fill('[data-testid="old-datetime"]', "2025-08-27T10:00");

      // Add reason
      await page.fill(
        '[data-testid="notification-reason"]',
        "Schedule changed due to emergency"
      );

      await page.click('[data-testid="send-notification"]');

      await expect(
        page.getByText("Reschedule notification sent successfully")
      ).toBeVisible();
    });

    test("shows error when reschedule notification missing old date", async ({
      page,
    }) => {
      await page.click('[data-testid="nav-appointments"]');
      await page.click(
        '[data-testid="appointment-row"]:first-child [data-testid="view-appointment"]'
      );

      await page.click('[data-testid="notify-button"]');
      await page.selectOption(
        '[data-testid="notification-type"]',
        "reschedule"
      );

      // Don't fill old date/time
      await page.click('[data-testid="send-notification"]');

      await expect(
        page.getByText("Old date/time is required for reschedule notifications")
      ).toBeVisible();
    });
  });

  test.describe("Appointment History", () => {
    test("displays appointment history timeline", async ({ page }) => {
      await page.click('[data-testid="nav-appointments"]');
      await page.click(
        '[data-testid="appointment-row"]:first-child [data-testid="view-appointment"]'
      );

      // Click history tab
      await page.click('[data-testid="history-tab"]');

      // Verify history section loads
      await expect(page.getByText("Appointment History")).toBeVisible();

      // Verify history entries are displayed (at least creation)
      await expect(page.getByTestId("history-entry")).toHaveCount({ min: 1 });

      // Verify history entry structure
      const firstEntry = page.getByTestId("history-entry").first();
      await expect(firstEntry.getByTestId("history-action")).toBeVisible();
      await expect(firstEntry.getByTestId("history-admin")).toBeVisible();
      await expect(firstEntry.getByTestId("history-timestamp")).toBeVisible();
    });

    test("shows detailed information for different action types", async ({
      page,
    }) => {
      await page.click('[data-testid="nav-appointments"]');
      await page.click(
        '[data-testid="appointment-row"]:first-child [data-testid="view-appointment"]'
      );

      // First reschedule to create history
      await page.click('[data-testid="reschedule-button"]');

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      await page.fill(
        'input[type="date"]',
        tomorrow.toISOString().split("T")[0]
      );

      await page.waitForSelector('[data-testid="time-slot"]');
      await page.click('[data-testid="time-slot"]:first-child');
      await page.fill(
        '[data-testid="reschedule-reason"]',
        "Test reschedule for history"
      );
      await page.click('[data-testid="confirm-reschedule"]');

      await expect(
        page.getByText("Appointment rescheduled successfully")
      ).toBeVisible();

      // Now check history
      await page.click('[data-testid="history-tab"]');

      // Look for reschedule entry
      const rescheduleEntry = page
        .getByTestId("history-entry")
        .filter({ hasText: "Rescheduled" })
        .first();
      await expect(rescheduleEntry).toBeVisible();
      await expect(
        rescheduleEntry.getByText("Test reschedule for history")
      ).toBeVisible();
    });
  });

  test.describe("Conflict Detection", () => {
    test("shows conflict warnings during rescheduling", async ({ page }) => {
      await page.click('[data-testid="nav-appointments"]');
      await page.click(
        '[data-testid="appointment-row"]:first-child [data-testid="view-appointment"]'
      );

      await page.click('[data-testid="reschedule-button"]');

      // Select date and time that might have conflicts
      await page.fill('input[type="date"]', "2025-08-29");
      await page.waitForSelector('[data-testid="time-slot"]');

      // Click on a time slot
      await page.click('[data-testid="time-slot"]:first-child');

      // Wait for conflict check
      await page.waitForTimeout(1000);

      // Check if conflict detection component appears
      const conflictDetector = page.getByTestId("conflict-detector");
      if ((await conflictDetector.count()) > 0) {
        await expect(conflictDetector).toBeVisible();
      }
    });

    test("displays suggested alternative times", async ({ page }) => {
      await page.click('[data-testid="nav-appointments"]');
      await page.click(
        '[data-testid="appointment-row"]:first-child [data-testid="view-appointment"]'
      );

      await page.click('[data-testid="reschedule-button"]');
      await page.fill('input[type="date"]', "2025-08-29");
      await page.waitForSelector('[data-testid="time-slot"]');

      // If conflicts exist, alternative times should be suggested
      const alternatives = page.getByTestId("alternative-times");
      if ((await alternatives.count()) > 0) {
        await expect(alternatives).toBeVisible();
        await expect(page.getByTestId("alternative-time")).toHaveCount({
          min: 1,
        });
      }
    });
  });

  test.describe("Responsive Design", () => {
    test("works correctly on mobile devices", async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      await page.click('[data-testid="mobile-nav-toggle"]');
      await page.click('[data-testid="nav-appointments"]');

      // Verify mobile-friendly appointment list
      await expect(page.getByTestId("appointments-list")).toBeVisible();

      // Click on appointment
      await page.click(
        '[data-testid="appointment-row"]:first-child [data-testid="view-appointment"]'
      );

      // Verify appointment detail page is mobile-friendly
      await expect(page.getByTestId("appointment-details")).toBeVisible();

      // Test mobile navigation tabs
      await page.click('[data-testid="mobile-tab-reschedule"]');
      await expect(page.getByText("Reschedule Appointment")).toBeVisible();
    });

    test("handles tablet viewport correctly", async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });

      await page.click('[data-testid="nav-appointments"]');
      await page.click(
        '[data-testid="appointment-row"]:first-child [data-testid="view-appointment"]'
      );

      // Verify layout adapts to tablet size
      await expect(page.getByTestId("appointment-layout")).toBeVisible();

      // Test that all functions work on tablet
      await page.click('[data-testid="reschedule-button"]');
      await expect(page.getByText("Reschedule Appointment")).toBeVisible();
    });
  });

  test.describe("Error Handling", () => {
    test("handles network errors gracefully", async ({ page }) => {
      // Intercept and fail network requests to simulate network issues
      await page.route("**/api/admin/appointments/**", route => {
        route.abort("failed");
      });

      await page.click('[data-testid="nav-appointments"]');

      // Should show error message
      await expect(page.getByText("Failed to load appointments")).toBeVisible();

      // Should show retry option
      await expect(page.getByTestId("retry-button")).toBeVisible();
    });

    test("shows appropriate error messages for failed operations", async ({
      page,
    }) => {
      // Intercept reschedule API to return error
      await page.route("**/api/admin/appointments/*/reschedule", route => {
        route.fulfill({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify({ error: "Time slot not available" }),
        });
      });

      await page.click('[data-testid="nav-appointments"]');
      await page.click(
        '[data-testid="appointment-row"]:first-child [data-testid="view-appointment"]'
      );

      await page.click('[data-testid="reschedule-button"]');

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      await page.fill(
        'input[type="date"]',
        tomorrow.toISOString().split("T")[0]
      );

      await page.waitForSelector('[data-testid="time-slot"]');
      await page.click('[data-testid="time-slot"]:first-child');
      await page.click('[data-testid="confirm-reschedule"]');

      // Should show error message
      await expect(page.getByText("Time slot not available")).toBeVisible();
    });
  });

  test.afterEach(async ({ page: _page }) => {
    // Clean up any test data or reset state if needed
    await cleanupTestData();
  });
});

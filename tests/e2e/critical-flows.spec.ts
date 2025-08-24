import { test, expect } from "@playwright/test";

test.describe("Critical User Flows", () => {
  test("homepage loads correctly", async ({ page }) => {
    await page.goto("/");

    // Verify key elements load quickly
    await expect(page.getByRole("navigation")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("services page displays correctly", async ({ page }) => {
    await page.goto("/services");

    await expect(
      page.getByRole("heading", { name: /services/i })
    ).toBeVisible();
    // Check that at least one service card exists
    await expect(
      page.locator('[data-testid="service-card"]').first()
    ).toBeVisible();
  });

  test("contact page loads correctly", async ({ page }) => {
    await page.goto("/contact");

    await expect(page.getByRole("heading", { name: /contact/i })).toBeVisible();
    await expect(page.locator("form")).toBeVisible();
  });

  test("authentication pages exist", async ({ page }) => {
    // Test login page
    await page.goto("/auth/login");
    await expect(page.locator("h2")).toContainText("Sign In");

    // Test register page
    await page.goto("/auth/register");
    await expect(page.locator("h2")).toContainText("Register");
  });

  test("booking page redirects to login when unauthenticated", async ({
    page,
  }) => {
    await page.goto("/book");

    // Should redirect to login for unauthenticated users
    await expect(page).toHaveURL(/login/);
  });
});

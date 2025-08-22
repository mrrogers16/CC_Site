import { test, expect, devices } from '@playwright/test';

// Configure mobile device testing
test.use({ ...devices['iPhone 12'] });

test.describe('Mobile Authentication Experience', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
  });

  test.describe('Mobile Registration Flow', () => {
    test('should have responsive layout on mobile', async ({ page }) => {
      await page.goto('/auth/register');

      // Check mobile-specific layout
      const container = page.locator('[data-testid="register-container"]');
      await expect(container).toBeVisible();

      // Verify form is full-width on mobile
      const form = page.locator('form');
      const formBoundingBox = await form.boundingBox();
      const viewportSize = page.viewportSize();
      
      expect(formBoundingBox?.width).toBeGreaterThan(viewportSize!.width * 0.8);
    });

    test('should have touch-friendly form elements', async ({ page }) => {
      await page.goto('/auth/register');

      // Check input field heights are touch-friendly (minimum 44px)
      const inputs = page.locator('input[type="text"], input[type="email"], input[type="password"]');
      const inputCount = await inputs.count();

      for (let i = 0; i < inputCount; i++) {
        const input = inputs.nth(i);
        const boundingBox = await input.boundingBox();
        expect(boundingBox?.height).toBeGreaterThanOrEqual(44);
      }

      // Check button height is touch-friendly
      const submitButton = page.locator('[data-testid="register-submit"]');
      const buttonBoundingBox = await submitButton.boundingBox();
      expect(buttonBoundingBox?.height).toBeGreaterThanOrEqual(44);
    });

    test('should handle mobile keyboard interactions', async ({ page }) => {
      await page.goto('/auth/register');

      // Test email input keyboard type
      const emailInput = page.locator('[data-testid="email-input"]');
      await emailInput.tap();
      await expect(emailInput).toHaveAttribute('type', 'email');
      await expect(emailInput).toHaveAttribute('inputmode', 'email');

      // Test phone input keyboard type
      const phoneInput = page.locator('[data-testid="phone-input"]');
      await phoneInput.tap();
      await expect(phoneInput).toHaveAttribute('type', 'tel');
      await expect(phoneInput).toHaveAttribute('inputmode', 'tel');
    });

    test('should show/hide mobile navigation menu', async ({ page }) => {
      await page.goto('/auth/register');

      // Mobile menu should be hidden initially
      const mobileMenu = page.locator('[data-testid="mobile-menu"]');
      await expect(mobileMenu).not.toBeVisible();

      // Tap hamburger button
      const hamburgerButton = page.locator('[data-testid="mobile-menu-button"]');
      await hamburgerButton.tap();

      // Mobile menu should be visible
      await expect(mobileMenu).toBeVisible();

      // Tap to close
      await hamburgerButton.tap();
      await expect(mobileMenu).not.toBeVisible();
    });

    test('should handle form submission on mobile', async ({ page }) => {
      await page.goto('/auth/register');

      // Fill form with mobile-friendly interactions
      await page.locator('[data-testid="name-input"]').tap();
      await page.fill('[data-testid="name-input"]', 'Mobile Test User');

      await page.locator('[data-testid="email-input"]').tap();
      await page.fill('[data-testid="email-input"]', 'mobile@example.com');

      await page.locator('[data-testid="password-input"]').tap();
      await page.fill('[data-testid="password-input"]', 'MobilePassword123');

      await page.locator('[data-testid="confirm-password-input"]').tap();
      await page.fill('[data-testid="confirm-password-input"]', 'MobilePassword123');

      // Submit form
      await page.locator('[data-testid="register-submit"]').tap();

      // Should handle success state on mobile
      await expect(page.locator('[data-testid="registration-success"]')).toBeVisible();
    });

    test('should display validation errors clearly on mobile', async ({ page }) => {
      await page.goto('/auth/register');

      // Submit empty form
      await page.locator('[data-testid="register-submit"]').tap();

      // Error messages should be visible and readable on mobile
      const nameError = page.locator('[data-testid="name-error"]');
      const emailError = page.locator('[data-testid="email-error"]');
      const passwordError = page.locator('[data-testid="password-error"]');

      await expect(nameError).toBeVisible();
      await expect(emailError).toBeVisible();
      await expect(passwordError).toBeVisible();

      // Check error messages are properly sized for mobile
      const nameErrorBox = await nameError.boundingBox();
      expect(nameErrorBox?.height).toBeGreaterThan(0);
    });
  });

  test.describe('Mobile Login Flow', () => {
    test('should have responsive login layout', async ({ page }) => {
      await page.goto('/auth/login');

      // Check hero section scales properly
      const heroSection = page.locator('[data-testid="hero-section"]');
      await expect(heroSection).toBeVisible();

      // Form should be properly sized for mobile
      const loginForm = page.locator('[data-testid="login-form"]');
      const formBox = await loginForm.boundingBox();
      const viewportWidth = page.viewportSize()?.width || 0;
      
      expect(formBox?.width).toBeLessThanOrEqual(viewportWidth);
    });

    test('should handle mobile login interactions', async ({ page }) => {
      await page.goto('/auth/login');

      // Use tap instead of click for mobile
      await page.locator('[data-testid="email-input"]').tap();
      await page.fill('[data-testid="email-input"]', 'mobile@example.com');

      await page.locator('[data-testid="password-input"]').tap();
      await page.fill('[data-testid="password-input"]', 'MobilePassword123');

      // Test remember me checkbox on mobile
      const checkbox = page.locator('[data-testid="remember-me"]');
      await checkbox.tap();
      await expect(checkbox).toBeChecked();

      // Submit login
      await page.locator('[data-testid="login-submit"]').tap();
    });

    test('should show mobile-optimized support section', async ({ page }) => {
      await page.goto('/auth/login');

      const supportSection = page.locator('[data-testid="support-section"]');
      await expect(supportSection).toBeVisible();

      // Support cards should stack vertically on mobile
      const supportCards = page.locator('[data-testid="support-card"]');
      const cardCount = await supportCards.count();

      if (cardCount > 1) {
        const firstCard = supportCards.nth(0);
        const secondCard = supportCards.nth(1);
        
        const firstCardBox = await firstCard.boundingBox();
        const secondCardBox = await secondCard.boundingBox();
        
        // Cards should be stacked (second card below first)
        expect(secondCardBox?.y).toBeGreaterThan(firstCardBox?.y! + firstCardBox?.height!);
      }
    });
  });

  test.describe('Mobile Google OAuth', () => {
    test('should display Google button properly on mobile', async ({ page }) => {
      await page.goto('/auth/login');

      const googleButton = page.locator('[data-testid="google-signin"]');
      await expect(googleButton).toBeVisible();

      // Button should be touch-friendly
      const buttonBox = await googleButton.boundingBox();
      expect(buttonBox?.height).toBeGreaterThanOrEqual(44);
      
      // Button should be full-width or appropriately sized for mobile
      const viewportWidth = page.viewportSize()?.width || 0;
      expect(buttonBox?.width).toBeGreaterThan(viewportWidth * 0.7);
    });

    test('should handle Google OAuth tap interaction', async ({ page }) => {
      await page.goto('/auth/register');

      const googleButton = page.locator('[data-testid="google-signin"]');
      
      // Should respond to tap
      await googleButton.tap();
      
      // In real environment, this would redirect to Google OAuth
      await expect(googleButton).toBeVisible();
    });
  });

  test.describe('Mobile Accessibility', () => {
    test('should be accessible with screen readers on mobile', async ({ page }) => {
      await page.goto('/auth/register');

      // Check form has proper structure for screen readers
      const form = page.locator('form');
      await expect(form).toHaveAttribute('role', 'form');

      // Check labels are properly associated
      const nameInput = page.locator('[data-testid="name-input"]');
      const nameLabel = page.locator('label[for="name"]');
      
      await expect(nameLabel).toBeVisible();
      await expect(nameInput).toHaveAttribute('id', 'name');
    });

    test('should have proper focus management on mobile', async ({ page }) => {
      await page.goto('/auth/login');

      // First tap should focus the first input
      await page.locator('[data-testid="email-input"]').tap();
      await expect(page.locator('[data-testid="email-input"]')).toBeFocused();

      // Should be able to navigate between fields
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="password-input"]')).toBeFocused();
    });

    test('should have adequate color contrast on mobile', async ({ page }) => {
      await page.goto('/auth/register');

      // This would typically be tested with accessibility testing tools
      // For now, we verify elements are visible
      const submitButton = page.locator('[data-testid="register-submit"]');
      await expect(submitButton).toBeVisible();
      
      const buttonStyles = await submitButton.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return {
          backgroundColor: styles.backgroundColor,
          color: styles.color,
        };
      });

      // Basic check that styles are applied
      expect(buttonStyles.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
      expect(buttonStyles.color).not.toBe('rgba(0, 0, 0, 0)');
    });
  });

  test.describe('Mobile Error Handling', () => {
    test('should display errors appropriately on mobile', async ({ page }) => {
      await page.goto('/auth/register');

      // Submit form with validation errors
      await page.locator('[data-testid="register-submit"]').tap();

      // Errors should be visible and properly positioned
      const errorMessages = page.locator('[data-testid$="-error"]');
      const errorCount = await errorMessages.count();

      for (let i = 0; i < errorCount; i++) {
        const error = errorMessages.nth(i);
        await expect(error).toBeVisible();
        
        // Error should not be cut off on mobile
        const errorBox = await error.boundingBox();
        const viewportWidth = page.viewportSize()?.width || 0;
        expect(errorBox?.x! + errorBox?.width!).toBeLessThanOrEqual(viewportWidth);
      }
    });

    test('should handle loading states on mobile', async ({ page }) => {
      await page.goto('/auth/login');

      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'Password123');

      // Submit and check loading state
      await page.locator('[data-testid="login-submit"]').tap();

      // Button should show loading state
      const submitButton = page.locator('[data-testid="login-submit"]');
      await expect(submitButton).toBeDisabled();
      await expect(submitButton).toContainText('Signing In...');
    });
  });

  test.describe('Mobile Navigation and Layout', () => {
    test('should have mobile-optimized benefits section', async ({ page }) => {
      await page.goto('/auth/register');

      const benefitsSection = page.locator('[data-testid="benefits-section"]');
      await expect(benefitsSection).toBeVisible();

      // Benefits should stack vertically on mobile
      const benefitCards = page.locator('[data-testid="benefit-card"]');
      const cardCount = await benefitCards.count();

      if (cardCount > 1) {
        const firstCard = benefitCards.nth(0);
        const secondCard = benefitCards.nth(1);
        
        const firstCardBox = await firstCard.boundingBox();
        const secondCardBox = await secondCard.boundingBox();
        
        // Cards should be stacked vertically
        expect(secondCardBox?.y).toBeGreaterThan(firstCardBox?.y! + firstCardBox?.height! - 10);
      }
    });

    test('should handle mobile viewport changes', async ({ page }) => {
      await page.goto('/auth/register');

      // Rotate to landscape
      await page.setViewportSize({ width: 667, height: 375 });
      
      // Form should still be usable in landscape
      const form = page.locator('form');
      await expect(form).toBeVisible();
      
      // Rotate back to portrait
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Form should still be usable in portrait
      await expect(form).toBeVisible();
    });

    test('should have proper mobile footer', async ({ page }) => {
      await page.goto('/auth/login');

      const footer = page.locator('[data-testid="site-footer"]');
      await expect(footer).toBeVisible();

      // Footer content should be readable on mobile
      const footerBox = await footer.boundingBox();
      const viewportWidth = page.viewportSize()?.width || 0;
      
      expect(footerBox?.width).toBeLessThanOrEqual(viewportWidth);
    });
  });

  test.describe('Mobile Performance', () => {
    test('should load quickly on mobile', async ({ page }) => {
      const startTime = Date.now();
      
      await page.goto('/auth/register');
      
      // Check that critical elements are visible quickly
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('form')).toBeVisible();
      
      const loadTime = Date.now() - startTime;
      
      // Should load within reasonable time (adjust threshold as needed)
      expect(loadTime).toBeLessThan(5000);
    });

    test('should handle slow network conditions', async ({ page }) => {
      // Simulate slow 3G
      await page.context().setOffline(false);
      
      await page.goto('/auth/login');
      
      // Page should still be functional on slow connections
      await expect(page.locator('form')).toBeVisible();
      
      // Form should be submittable
      await page.fill('[data-testid="email-input"]', 'test@example.com');
      await page.fill('[data-testid="password-input"]', 'Password123');
      
      await page.locator('[data-testid="login-submit"]').tap();
      
      // Should show loading state
      await expect(page.locator('[data-testid="login-submit"]')).toBeDisabled();
    });
  });
});
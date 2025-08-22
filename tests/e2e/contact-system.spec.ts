import { test, expect } from '@playwright/test';

test.describe('Contact System E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Set up test environment
    await page.goto('/');
  });

  test.describe('Contact Form', () => {
    test('displays contact form with all fields', async ({ page }) => {
      await page.goto('/contact');

      // Check page title and heading
      await expect(page).toHaveTitle(/Contact Us/);
      await expect(page.getByRole('heading', { name: 'Contact Us' })).toBeVisible();

      // Check form fields
      await expect(page.getByLabel('Name', { exact: true })).toBeVisible();
      await expect(page.getByLabel('Email', { exact: true })).toBeVisible();
      await expect(page.getByLabel('Phone Number')).toBeVisible();
      await expect(page.getByLabel('Subject', { exact: true })).toBeVisible();
      await expect(page.getByLabel('Message', { exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Send Message' })).toBeVisible();
    });

    test('shows validation errors for empty required fields', async ({ page }) => {
      await page.goto('/contact');

      // Try to submit empty form
      await page.getByRole('button', { name: 'Send Message' }).click();

      // Check for validation errors
      await expect(page.getByText('Name must be at least 2 characters')).toBeVisible();
      await expect(page.getByText('Please enter a valid email address')).toBeVisible();
      await expect(page.getByText('Subject must be at least 5 characters')).toBeVisible();
      await expect(page.getByText('Message must be at least 10 characters')).toBeVisible();
    });

    test('shows validation error for invalid email', async ({ page }) => {
      await page.goto('/contact');

      // Fill email with invalid format
      await page.getByLabel('Email', { exact: true }).fill('invalid-email');
      await page.getByRole('button', { name: 'Send Message' }).click();

      await expect(page.getByText('Please enter a valid email address')).toBeVisible();
    });

    test('submits form successfully with valid data', async ({ page }) => {
      await page.goto('/contact');

      // Mock the API response
      await page.route('/api/contact', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'Thank you for your message. We\'ll get back to you within 24 hours.',
            submissionId: 'test-submission-123'
          })
        });
      });

      // Fill out the form
      await page.getByLabel('Name', { exact: true }).fill('John Doe');
      await page.getByLabel('Email', { exact: true }).fill('john@example.com');
      await page.getByLabel('Phone Number').fill('555-123-4567');
      await page.getByLabel('Subject', { exact: true }).fill('Interested in counseling services');
      await page.getByLabel('Message', { exact: true }).fill('I would like to schedule an appointment for individual therapy sessions.');

      // Submit the form
      await page.getByRole('button', { name: 'Send Message' }).click();

      // Check for success message
      await expect(page.getByText('Thank you for your message! We\'ll get back to you within 24 hours.')).toBeVisible();

      // Verify form is reset
      await expect(page.getByLabel('Name', { exact: true })).toHaveValue('');
      await expect(page.getByLabel('Email', { exact: true })).toHaveValue('');
      await expect(page.getByLabel('Subject', { exact: true })).toHaveValue('');
      await expect(page.getByLabel('Message', { exact: true })).toHaveValue('');
    });

    test('shows error message when submission fails', async ({ page }) => {
      await page.goto('/contact');

      // Mock API error response
      await page.route('/api/contact', async route => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Internal Server Error'
          })
        });
      });

      // Fill out and submit form
      await page.getByLabel('Name', { exact: true }).fill('John Doe');
      await page.getByLabel('Email', { exact: true }).fill('john@example.com');
      await page.getByLabel('Subject', { exact: true }).fill('Test Subject');
      await page.getByLabel('Message', { exact: true }).fill('Test message content');

      await page.getByRole('button', { name: 'Send Message' }).click();

      // Check for error message
      await expect(page.getByText('There was an error sending your message. Please try again or call us directly.')).toBeVisible();
    });

    test('displays crisis support resources', async ({ page }) => {
      await page.goto('/contact');

      // Check crisis support section
      await expect(page.getByRole('heading', { name: 'Crisis Support Resources' })).toBeVisible();
      await expect(page.getByText('National Suicide Prevention Lifeline:')).toBeVisible();
      await expect(page.getByText('988')).toBeVisible();
      await expect(page.getByText('Crisis Text Line:')).toBeVisible();
      await expect(page.getByText('Text HOME to 741741')).toBeVisible();
    });

    test('displays contact information and office hours', async ({ page }) => {
      await page.goto('/contact');

      // Check office hours
      await expect(page.getByRole('heading', { name: 'Office Hours' })).toBeVisible();
      await expect(page.getByText('Monday - Thursday: 9:00 AM - 7:00 PM')).toBeVisible();

      // Check contact information
      await expect(page.getByRole('heading', { name: 'Contact Information' })).toBeVisible();
      await expect(page.getByText('(555) 123-4567')).toBeVisible();
      await expect(page.getByText('contact@healingpathways.com')).toBeVisible();
    });

    test('displays FAQ section', async ({ page }) => {
      await page.goto('/contact');

      // Check FAQ section
      await expect(page.getByRole('heading', { name: 'Frequently Asked Questions' })).toBeVisible();
      await expect(page.getByText('How do I schedule my first appointment?')).toBeVisible();
      await expect(page.getByText('Do you accept insurance?')).toBeVisible();
      await expect(page.getByText('What should I expect in my first session?')).toBeVisible();
      await expect(page.getByText('Is therapy confidential?')).toBeVisible();
    });
  });

  test.describe('Admin Authentication', () => {
    test('admin login page displays correctly', async ({ page }) => {
      await page.goto('/admin/login');

      await expect(page).toHaveTitle(/Admin Login/);
      await expect(page.getByRole('heading', { name: 'Admin Login' })).toBeVisible();
      await expect(page.getByLabel('Email Address')).toBeVisible();
      await expect(page.getByLabel('Password')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible();

      // Check demo credentials display
      await expect(page.getByText('Demo Credentials')).toBeVisible();
      await expect(page.getByText('Email: admin@healingpathways.com')).toBeVisible();
      await expect(page.getByText('Password: admin123')).toBeVisible();
    });

    test('shows error for invalid login credentials', async ({ page }) => {
      await page.goto('/admin/login');

      // Mock failed authentication
      await page.route('/api/auth/callback/credentials', async route => {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Invalid credentials' })
        });
      });

      await page.getByLabel('Email Address').fill('wrong@example.com');
      await page.getByLabel('Password').fill('wrongpassword');
      await page.getByRole('button', { name: 'Sign In' }).click();

      await expect(page.getByText('Invalid email or password')).toBeVisible();
    });
  });

  test.describe('Admin Dashboard', () => {
    test.beforeEach(async ({ page }) => {
      // Mock authentication state
      await page.addInitScript(() => {
        // Mock NextAuth session
        window.__NEXT_DATA__ = {
          props: {
            session: {
              user: {
                id: 'admin-123',
                email: 'admin@healingpathways.com',
                name: 'Admin User'
              }
            }
          }
        };
      });
    });

    test('redirects to login when not authenticated', async ({ page }) => {
      // Clear any existing session
      await page.context().clearCookies();
      
      await page.goto('/admin/contact');
      
      // Should redirect to login page
      await expect(page).toHaveURL(/\/admin\/login/);
    });

    test('displays contact submissions dashboard', async ({ page }) => {
      // Mock API responses for authenticated user
      await page.route('/api/contact*', async route => {
        const url = new URL(route.request().url());
        if (route.request().method() === 'GET') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              data: {
                submissions: [
                  {
                    id: 'sub-1',
                    name: 'John Doe',
                    email: 'john@example.com',
                    phone: '555-123-4567',
                    subject: 'Seeking therapy',
                    message: 'I would like to schedule an appointment.',
                    isRead: false,
                    createdAt: '2024-01-15T10:00:00Z',
                    user: {
                      id: 'user-1',
                      name: 'John Doe',
                      email: 'john@example.com',
                      phone: '555-123-4567'
                    }
                  },
                  {
                    id: 'sub-2',
                    name: 'Jane Smith',
                    email: 'jane@example.com',
                    subject: 'Follow-up question',
                    message: 'I have a question about scheduling.',
                    isRead: true,
                    createdAt: '2024-01-14T14:30:00Z',
                    user: {
                      id: 'user-2',
                      name: 'Jane Smith',
                      email: 'jane@example.com',
                      phone: null
                    }
                  }
                ],
                pagination: {
                  page: 1,
                  limit: 10,
                  total: 2,
                  totalPages: 1,
                  hasNext: false,
                  hasPrev: false
                }
              }
            })
          });
        }
      });

      await page.goto('/admin/contact');

      // Check dashboard elements
      await expect(page.getByRole('heading', { name: 'Contact Submissions' })).toBeVisible();
      await expect(page.getByText('Manage and respond to contact form submissions')).toBeVisible();

      // Check filter buttons
      await expect(page.getByRole('button', { name: 'All' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Unread' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Read' })).toBeVisible();

      // Check submissions table
      await expect(page.getByText('John Doe')).toBeVisible();
      await expect(page.getByText('john@example.com')).toBeVisible();
      await expect(page.getByText('Seeking therapy')).toBeVisible();
      await expect(page.getByText('Unread')).toBeVisible();

      await expect(page.getByText('Jane Smith')).toBeVisible();
      await expect(page.getByText('jane@example.com')).toBeVisible();
      await expect(page.getByText('Follow-up question')).toBeVisible();
      await expect(page.getByText('Read')).toBeVisible();
    });

    test('can view submission details and send response', async ({ page }) => {
      // Mock submissions API
      await page.route('/api/contact*', async route => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              submissions: [{
                id: 'sub-1',
                name: 'John Doe',
                email: 'john@example.com',
                phone: '555-123-4567',
                subject: 'Seeking therapy',
                message: 'I would like to schedule an appointment for therapy sessions.',
                isRead: false,
                createdAt: '2024-01-15T10:00:00Z',
                user: {
                  id: 'user-1',
                  name: 'John Doe',
                  email: 'john@example.com',
                  phone: '555-123-4567'
                }
              }],
              pagination: { page: 1, limit: 10, total: 1, totalPages: 1, hasNext: false, hasPrev: false }
            }
          })
        });
      });

      // Mock admin response API
      await page.route('/api/admin/contact/sub-1', async route => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              message: 'Response sent successfully',
              emailSent: true
            })
          });
        }
      });

      await page.goto('/admin/contact');

      // Click View button for first submission
      await page.getByRole('button', { name: 'View' }).first().click();

      // Check modal content
      await expect(page.getByRole('heading', { name: 'Contact Submission' })).toBeVisible();
      await expect(page.getByText('John Doe')).toBeVisible();
      await expect(page.getByText('john@example.com')).toBeVisible();
      await expect(page.getByText('Seeking therapy')).toBeVisible();
      await expect(page.getByText('I would like to schedule an appointment for therapy sessions.')).toBeVisible();

      // Check response form
      await expect(page.getByRole('heading', { name: 'Send Response' })).toBeVisible();
      await expect(page.getByLabel('Subject')).toBeVisible();
      await expect(page.getByLabel('Message')).toBeVisible();

      // Fill and send response
      await page.getByLabel('Subject').fill('Re: Seeking therapy');
      await page.getByLabel('Message').fill('Thank you for reaching out. I would be happy to schedule an appointment with you. Please call our office at (555) 123-4567 to set up a time.');

      await page.getByRole('button', { name: 'Send Response' }).click();

      // Should close modal and show success
      await expect(page.getByRole('heading', { name: 'Contact Submission' })).not.toBeVisible();
    });

    test('can filter submissions by read status', async ({ page }) => {
      let filterApplied = '';

      await page.route('/api/contact*', async route => {
        const url = new URL(route.request().url());
        filterApplied = url.searchParams.get('isRead') || 'all';
        
        const submissions = filterApplied === 'false' 
          ? [{ id: 'sub-1', name: 'Unread Submission', isRead: false }]
          : filterApplied === 'true'
          ? [{ id: 'sub-2', name: 'Read Submission', isRead: true }]
          : [
              { id: 'sub-1', name: 'Unread Submission', isRead: false },
              { id: 'sub-2', name: 'Read Submission', isRead: true }
            ];

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              submissions: submissions.map(sub => ({
                ...sub,
                email: 'test@example.com',
                subject: 'Test',
                message: 'Test message',
                createdAt: '2024-01-15T10:00:00Z',
                user: { id: 'user-1', name: sub.name, email: 'test@example.com' }
              })),
              pagination: { page: 1, limit: 10, total: submissions.length, totalPages: 1, hasNext: false, hasPrev: false }
            }
          })
        });
      });

      await page.goto('/admin/contact');

      // Test Unread filter
      await page.getByRole('button', { name: 'Unread' }).click();
      await page.waitForLoadState('networkidle');
      expect(filterApplied).toBe('false');

      // Test Read filter
      await page.getByRole('button', { name: 'Read' }).click();
      await page.waitForLoadState('networkidle');
      expect(filterApplied).toBe('true');

      // Test All filter
      await page.getByRole('button', { name: 'All' }).click();
      await page.waitForLoadState('networkidle');
      expect(filterApplied).toBe('all');
    });
  });

  test.describe('Navigation Integration', () => {
    test('can navigate to contact page from main navigation', async ({ page }) => {
      await page.goto('/');

      // Check navigation link exists
      const contactLink = page.getByRole('link', { name: 'Contact' });
      await expect(contactLink).toBeVisible();

      // Click and verify navigation
      await contactLink.click();
      await expect(page).toHaveURL(/\/contact/);
      await expect(page.getByRole('heading', { name: 'Contact Us' })).toBeVisible();
    });

    test('contact page includes navigation and footer', async ({ page }) => {
      await page.goto('/contact');

      // Check navigation is present
      await expect(page.getByRole('navigation')).toBeVisible();
      await expect(page.getByRole('link', { name: 'Home' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Services' })).toBeVisible();

      // Check footer is present
      await expect(page.getByRole('contentinfo')).toBeVisible();
    });
  });
});
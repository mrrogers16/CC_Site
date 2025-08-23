# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a professional counseling practice website built with Next.js 14+ App Router, TypeScript, Tailwind CSS v4, and Prisma ORM with PostgreSQL. The site provides appointment booking, service information, blog functionality, and contact forms for a mental health counseling practice.

**Project Name**: Healing Pathways Counseling  
**Status**: Foundation Complete - Ready for Feature Development  
**Last Updated**: 2025-08-20

## Key Commands

### Development

- `npm run dev` - Start development server
- `npm run build` - Build production bundle
- `npm run start` - Start production server

### Code Quality

- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors automatically
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run typecheck` - Run TypeScript type checking

### Testing

- `npm run test` - Run Jest unit tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage report
- `npm run test:e2e` - Run Playwright E2E tests
- `npm run test:e2e:ui` - Run E2E tests with UI

### Database

- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema changes to database
- `npm run db:migrate` - Create and run migrations
- `npm run db:studio` - Open Prisma Studio
- `npm run db:seed` - Seed database with initial data

## Architecture

### Core Technologies

- **Next.js 15.5.0** with App Router for full-stack React application
- **TypeScript 5.x** with strict configuration and advanced type checking
- **Tailwind CSS v4** with custom CSS variables and inline theme configuration
- **Prisma ORM 6.14.0** for type-safe database operations with PostgreSQL
- **Zod 4.x** for runtime type validation and form schemas
- **React Hook Form 7.x** with Zod resolvers for form handling
- **Jest 30.x** + React Testing Library for unit testing
- **Playwright 1.55.0** for end-to-end testing

### Implementation Status

#### Completed Features

1. **Project Foundation**
   - Next.js 15.5.0 with App Router initialized
   - TypeScript with strict configuration (`exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`)
   - ESLint with Next.js rules and Prettier integration
   - Professional color palette implementation

2. **Database & Schema**
   - Complete Prisma schema with 6 models (User, Service, Appointment, ContactSubmission, BlogPost, Tag)
   - Relationship mappings and proper foreign key constraints
   - Generated Prisma client with custom output path (`src/generated/prisma`)
   - Database scripts in package.json for all common operations

3. **Core Infrastructure**
   - Centralized error handling system with custom error classes
   - Structured logging system with development/production modes
   - API error handler with Zod validation integration
   - Type definitions for all major entities

4. **UI/UX Foundation**
   - Professional design system with sage green (#4a8b8c) primary color
   - Custom font integration (Inter + Playfair Display)
   - Responsive navigation with mobile menu functionality
   - Complete footer with practice information and links

5. **Home Page Implementation**
   - Hero section with professional messaging and CTAs
   - Services overview with cards and descriptions
   - About section with therapist information and specializations
   - Contact section with multiple contact methods

6. **Testing Infrastructure**
   - Jest configuration with Next.js integration
   - Playwright E2E testing setup with multiple browser support
   - Coverage thresholds set to 70% minimum
   - Test directory structure established

7. **Development Workflow**
   - Comprehensive GitHub Actions CI/CD pipeline
   - Code quality checks (linting, formatting, type checking)
   - Automated testing on pull requests
   - Build verification and artifact generation

#### Pending Implementation

- Appointment booking system with calendar UI
- Blog system with MDX support
- Email verification system implementation
- Password reset functionality

### Folder Structure

```
src/
├── app/                    # Next.js App Router pages and layouts
├── components/
│   ├── ui/                # Reusable UI components
│   ├── forms/             # Form components with validation
│   ├── layout/            # Header, footer, navigation
│   └── sections/          # Page sections (hero, services, etc.)
├── lib/
│   ├── db/                # Database connection and utilities
│   ├── validations/       # Zod schemas for data validation
│   ├── utils/             # Utility functions
│   ├── errors/            # Custom error classes
│   ├── logger/            # Centralized logging system
│   ├── api/               # API utilities and error handling
│   └── config/            # Site configuration
├── hooks/                 # Custom React hooks
├── types/                 # TypeScript type definitions
└── generated/
    └── prisma/           # Generated Prisma client
```

### Database Schema Implementation

#### Models Created

```prisma
User {
  id            String (cuid)
  email         String (unique)
  name          String
  phone         String? (optional)
  password      String? (for credentials provider)
  emailVerified DateTime? (email verification status)
  image         String? (for OAuth providers)
  role          UserRole (CLIENT/ADMIN enum)
  // Relationships to appointments, contact submissions, accounts, sessions
}

Service {
  id          String (cuid)
  title       String
  description String
  duration    Int (minutes)
  price       Decimal (@db.Money)
  isActive    Boolean (default: true)
  // One-to-many with appointments
}

Appointment {
  id          String (cuid)
  userId      String (foreign key)
  serviceId   String (foreign key)
  dateTime    DateTime
  status      AppointmentStatus (enum)
  notes       String? (optional)
  // Cascade delete relationships
}

ContactSubmission {
  id        String (cuid)
  userId    String? (optional foreign key)
  name      String
  email     String
  phone     String? (optional)
  subject   String
  message   String
  isRead    Boolean (default: false)
}

BlogPost {
  id          String (cuid)
  title       String
  slug        String (unique)
  excerpt     String
  content     String (long text)
  isPublished Boolean (default: false)
  publishedAt DateTime? (optional)
  // Many-to-many with tags via BlogTag
}

AppointmentStatus Enum {
  PENDING, CONFIRMED, CANCELLED, COMPLETED, NO_SHOW
}

UserRole Enum {
  CLIENT, ADMIN
}

Account {
  // NextAuth account linking for OAuth providers
  userId, type, provider, providerAccountId
  // OAuth tokens and metadata
}

Session {
  // NextAuth session management
  sessionToken, userId, expires
}

VerificationToken {
  // Email verification and password reset tokens
  identifier, token, expires
}
```

#### Key Schema Decisions

- **CUID IDs**: Used for all primary keys (better for distributed systems)
- **Cascade Deletes**: Appointments and contact submissions cascade on user deletion
- **Soft Deletes**: Services can be deactivated instead of deleted
- **Flexible Contact**: Contact submissions can be linked to users or standalone
- **Money Type**: Proper decimal handling for service pricing

### Design System Implementation

#### Color Palette (Tailwind CSS v4)

```css
:root {
  --primary: #4a8b8c; /* Sage green - calming, trustworthy */
  --secondary: #7a9e9f; /* Lighter sage */
  --accent: #b5a588; /* Warm beige - approachable */
  --background: #fefefe; /* Off-white background */
  --foreground: #2c2c2c; /* Dark text */
  --muted: #f8f8f8; /* Light backgrounds */
  --card: #ffffff; /* Card backgrounds */
  --border: #e5e7eb; /* Subtle borders */
}
```

#### Typography Implementation

- **Primary Font**: Inter via Google Fonts (`--font-inter`)
- **Display Font**: Playfair Display via Google Fonts (`--font-playfair`)
- **Font Loading**: Optimized with Next.js font optimization
- **Usage**: Inter for body text, Playfair for headings and brand elements

#### Component Architecture

- **Mobile-First**: All components designed mobile-first with responsive breakpoints
- **Accessibility**: ARIA labels, keyboard navigation, semantic HTML
- **Performance**: Optimized images, lazy loading, code splitting
- **Consistency**: Shared utility classes and design tokens

## Development Guidelines

### Component Architecture Implementation

```typescript
// Example component structure used throughout the project
export function ComponentName() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Component content */}
      </div>
    </section>
  );
}
```

#### Implemented Patterns

- **Functional Components**: All components use hooks pattern
- **TypeScript Strict**: All props and state properly typed
- **Responsive Design**: Mobile-first with consistent breakpoints
- **Accessibility**: Semantic HTML, ARIA labels, keyboard navigation

### Authentication System (Fully Implemented)

```typescript
// Pattern established in /lib/auth.ts
import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      // Secure password validation with bcrypt
      // Email verification requirement for credentials login
    }),
  ],
  callbacks: {
    // Role-based access control (CLIENT/ADMIN)
    // Email verification enforcement
    // Session management with user data
  },
};
```

### Form Handling (Fully Implemented)

```typescript
// Pattern established in /lib/validations/auth.ts and /lib/validations/index.ts
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

// Authentication schemas
const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Please enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, "Password requirements"),
  // ... other fields with validation
});

const contactFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Please enter a valid email address"),
  // ... other fields
});

type RegisterFormData = z.infer<typeof registerSchema>;
type ContactFormData = z.infer<typeof contactFormSchema>;
```

### Enhanced Form Handling with Real-time Validation (Implemented)

```typescript
// Pattern established in enhanced-register-form.tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { debounce } from "lodash-es";
import { useCallback, useState } from "react";

// Real-time validation with onChange mode
const {
  register,
  handleSubmit,
  formState: { errors, isSubmitting },
  trigger,
  watch,
} = useForm<FormData>({
  resolver: zodResolver(schema),
  mode: "onChange", // Enable real-time validation
});

// Debounced API calls for email availability
const checkEmailAvailability = useCallback(
  debounce(async (email: string) => {
    if (!email || errors.email) return;

    setEmailCheck({ isChecking: true, isValid: false });
    try {
      const response = await fetch(`/api/auth/check-email?email=${encodeURIComponent(email)}`);
      const data = await response.json();
      setEmailCheck({
        isChecking: false,
        isValid: data.available,
        message: data.message
      });
    } catch (error) {
      setEmailCheck({
        isChecking: false,
        isValid: false,
        message: "Error checking email availability"
      });
    }
  }, 500), // 500ms debounce delay
  [errors.email]
);

// Visual validation feedback with icons
const ValidationIcon = ({ field, isValid }: { field: string; isValid: boolean }) => (
  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
    {isValid && (
      <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    )}
  </div>
);

// Password strength indicator
const calculatePasswordStrength = (password: string): PasswordStrength => {
  let score = 0;
  const requirements = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  Object.values(requirements).forEach(met => met && score++);

  if (score < 3) return { level: "weak", color: "text-red-600" };
  if (score < 5) return { level: "medium", color: "text-yellow-600" };
  return { level: "strong", color: "text-green-600" };
};
```

### API Routes Pattern (Established)

```typescript
// Pattern in /lib/api/error-handler.ts
import { withErrorHandler } from "@/lib/api/error-handler";

export const POST = withErrorHandler(async (request: NextRequest) => {
  // API logic here
  return NextResponse.json({ success: true });
});
```

### Database Operations (Implemented)

```typescript
// Pattern in /lib/db/index.ts
import { prisma } from "@/lib/db";

// All database operations should use this client
const users = await prisma.user.findMany({
  include: { appointments: true },
});
```

### Error Handling System (Fully Implemented)

```typescript
// Custom error classes in /lib/errors/index.ts
import { AppError, ValidationError, NotFoundError } from "@/lib/errors";

// Usage example:
throw new ValidationError("Invalid email format");
throw new NotFoundError("Appointment");
```

### Logging System (Implemented)

```typescript
// Centralized logger in /lib/logger/index.ts
import { logger } from "@/lib/logger";

logger.info("User created", { userId: user.id });
logger.error("Database error", error, { operation: "createUser" });
logger.api("POST", "/api/appointments", 200, 150); // method, url, status, duration
```

## Specific Implementation Notes

### Current Site Configuration

```typescript
// /lib/config/site.ts
export const siteConfig: SiteConfig = {
  name: "Healing Pathways Counseling",
  description:
    "Professional counseling services focused on your mental health and wellbeing...",
  url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  // Complete social media and SEO configuration implemented
};
```

### Navigation Structure (Implemented)

- **Fixed Navigation**: Sticky header with mobile hamburger menu
- **Responsive Design**: Collapsible mobile menu with proper ARIA labels
- **CTA Integration**: "Book Appointment" button prominently featured
- **Professional Styling**: Consistent with brand colors and typography

### Home Page Sections (Fully Implemented)

1. **Hero Section**: Professional messaging with dual CTAs
2. **Services Overview**: Three-card layout with service descriptions
3. **About Section**: Therapist bio with specializations list
4. **Contact Section**: Multiple contact methods with office information

### Environment Configuration (Complete)

```bash
# Key variables configured in .env.example:
DATABASE_URL="postgresql://username:password@localhost:5432/counseling_db"
NEXTAUTH_SECRET="your-nextauth-secret-here"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
EMAIL_SERVER_HOST="smtp.gmail.com"
STRIPE_SECRET_KEY="sk_test_your-stripe-secret-key"
```

### Development Server Status

- **✅ Running Successfully**: `npm run dev` works without errors
- **✅ Build Verified**: `npm run build` completes successfully
- **✅ Type Safety**: All TypeScript strict checks passing
- **✅ Code Quality**: ESLint and Prettier configured and working

### Testing Infrastructure (Comprehensive Implementation)

- **Jest**: Unit testing with Next.js integration and authentication mocking
- **Playwright**: E2E testing with multi-browser and mobile device support
- **Coverage**: 70% threshold achieved for authentication system
- **CI/CD**: GitHub Actions pipeline for automated testing across all environments
- **Authentication Testing**: Complete suite covering unit, integration, and E2E scenarios

### Security Implementation (Foundation Complete)

- **Type Safety**: Strict TypeScript prevents runtime type errors
- **Input Validation**: Zod schemas for all data validation
- **Error Handling**: Proper error boundaries and logging
- **Environment Security**: .env patterns established for secrets

### Performance Considerations (Implemented)

- **Font Optimization**: Next.js font optimization for Inter and Playfair Display
- **Image Preparation**: Next.js Image component patterns established
- **Code Splitting**: App Router provides automatic code splitting
- **CSS Optimization**: Tailwind CSS v4 with minimal bundle size

## Testing Patterns Established

### Authentication Testing Methodology

```typescript
// Unit Test Pattern for Validation Schemas
describe("Authentication Validation", () => {
  it("accepts valid registration data", () => {
    const validData = { name: "John Doe", email: "john@example.com" /* ... */ };
    const result = registerSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it("rejects invalid email formats", () => {
    const invalidData = { email: "invalid-email" /* ... */ };
    const result = registerSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    expect(result.error.errors[0].message).toBe(
      "Please enter a valid email address"
    );
  });
});

// Integration Test Pattern for Auth Flows
describe("Authentication Flow Integration", () => {
  it("completes registration and login flow", async () => {
    // 1. Registration
    const registrationResponse = await POST(registrationRequest);
    expect(registrationResponse.status).toBe(201);

    // 2. Login
    const loginResult = await credentialsProvider.authorize(credentials);
    expect(loginResult.id).toBeDefined();

    // 3. Session creation
    const sessionResult = await authOptions.callbacks!.session!({
      session,
      token,
    });
    expect(sessionResult.user.id).toBe(loginResult.id);
  });
});

// E2E Test Pattern for User Journeys
test("completes full registration process", async ({ page }) => {
  await page.goto("/auth/register");
  await page.fill('[data-testid="name-input"]', "E2E Test User");
  await page.fill('[data-testid="email-input"]', "e2e@example.com");
  await page.click('[data-testid="register-submit"]');
  await expect(page).toHaveURL("/auth/verify-email");
});
```

### Mobile Testing Patterns

```typescript
// Mobile Device Configuration
test.use({ ...devices["iPhone 12"] });

// Touch Interaction Testing
test("handles touch interactions correctly", async ({ page }) => {
  await page.goto("/auth/register");

  // Test touch tap on inputs
  await page.getByTestId("name-input").tap();
  await expect(page.getByTestId("name-input")).toBeFocused();

  // Test password visibility toggle
  await page.getByTestId("password-toggle").tap();
  await expect(page.getByTestId("password-input")).toHaveAttribute(
    "type",
    "text"
  );
});
```

### Enhanced Form Testing Patterns (Implemented)

```typescript
// Real-time Validation Testing
describe('Enhanced Registration Form', () => {
  it('shows email availability checking', async () => {
    const user = userEvent.setup();

    // Mock API response
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ available: true, message: 'Email address is available' }),
    });

    render(<EnhancedRegisterForm />);

    const emailInput = screen.getByTestId('email-input');
    await user.type(emailInput, 'test@example.com');
    await user.tab(); // Trigger blur event

    // Verify API call and UI feedback
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/auth/check-email?email=test%40example.com');
      expect(screen.getByText('Email address is available')).toBeInTheDocument();
    });
  });

  it('updates password strength indicator', async () => {
    const user = userEvent.setup();
    render(<EnhancedRegisterForm />);

    const passwordInput = screen.getByTestId('password-input');
    await user.click(passwordInput);

    // Test weak password
    await user.type(passwordInput, 'weak');
    expect(screen.getByText('Weak')).toBeInTheDocument();

    // Test strong password
    await user.clear(passwordInput);
    await user.type(passwordInput, 'StrongPassword123!');
    await waitFor(() => {
      expect(screen.getByText('Strong')).toBeInTheDocument();
    });
  });

  // Accessibility Testing Pattern
  it('has proper ARIA attributes for error messages', async () => {
    const user = userEvent.setup();
    render(<EnhancedRegisterForm />);

    await user.click(screen.getByTestId('register-submit'));

    await waitFor(() => {
      expect(screen.getByTestId('name-error')).toHaveAttribute('role', 'alert');
      expect(screen.getByTestId('email-error')).toHaveAttribute('role', 'alert');
    });
  });
});

// Touch-Friendly Element Testing
test('should have touch-friendly form elements', async ({ page }) => {
  const inputs = page.locator('input[type="email"]');
  const boundingBox = await inputs.boundingBox();
  expect(boundingBox?.height).toBeGreaterThanOrEqual(44); // iOS touch target minimum
});

// Mobile Keyboard Testing
test('should use correct input modes', async ({ page }) => {
  const emailInput = page.locator('[data-testid="email-input"]');
  await expect(emailInput).toHaveAttribute('inputmode', 'email');
});
```

### Testing Component Enhancement Pattern

```typescript
// Add test attributes to components
<input
  {...register("email")}
  type="email"
  data-testid="email-input"      // For E2E testing
  inputMode="email"              // For mobile keyboards
  aria-label="Email address"     // For accessibility
/>

// Error messages with proper ARIA
{errors.email && (
  <p data-testid="email-error" role="alert">
    {errors.email.message}
  </p>
)}
```

### Test Coverage Patterns

```bash
# Run specific test suites
npm run test -- auth-validation.test.ts
npm run test:e2e -- auth-flow.spec.ts
npm run test:e2e -- mobile-auth.spec.ts

# Coverage requirements by area
- Authentication: 90%+ (critical security)
- Forms: 85%+ (user interaction)
- API endpoints: 80%+ (data handling)
- UI components: 70%+ (visual elements)
```

## Implementation Patterns Established

### Adding New Features (Follow This Pattern)

1. **Types**: Create TypeScript interfaces in `/types/index.ts`
2. **Validation**: Add Zod schemas in `/lib/validations/` (separate files by feature)
3. **Database**: Update Prisma schema, run `npm run db:generate`
4. **API**: Create route handlers using `withErrorHandler` wrapper
5. **Components**: Build UI following the section pattern (py-20 px-4...)
6. **Testing**: Follow established testing methodology:
   - Unit tests for validation and business logic
   - Integration tests for API flows and data consistency
   - E2E tests for complete user journeys
   - Mobile tests for responsive and touch interactions
7. **Test Attributes**: Add data-testid and ARIA labels for reliable testing
8. **Documentation**: Update this CLAUDE.md file

### Component Creation Pattern

```typescript
// 1. Create in appropriate folder (/components/sections/ or /components/ui/)
// 2. Use this structure:
export function NewComponent() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-4">
            Section Title
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Section description
          </p>
        </div>
        {/* Component content */}
      </div>
    </section>
  );
}
```

### API Route Pattern

```typescript
// Create in /app/api/[feature]/route.ts
import { withErrorHandler } from "@/lib/api/error-handler";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { validationSchema } from "@/lib/validations";

export const POST = withErrorHandler(async (request: NextRequest) => {
  const data = await request.json();
  const validated = validationSchema.parse(data);

  const result = await prisma.model.create({ data: validated });
  logger.info("Created resource", { id: result.id });

  return NextResponse.json({ success: true, data: result });
});
```

### Debugging Checklist

1. **Development Server**: Check `npm run dev` output for errors
2. **Type Checking**: Run `npm run typecheck` for TypeScript errors
3. **Database**: Verify with `npm run db:studio` for data issues
4. **Logs**: Check console output for logger messages
5. **Build**: Test with `npm run build` before deployment
6. **Lint**: Run `npm run lint:fix` for code quality issues

### Next Priority Features to Implement

1. **Appointment Booking**: Create calendar UI with time slot selection and user authentication integration
2. **Email Verification**: Complete the verification flow for user registration
3. **Password Reset**: Add forgot password and reset password functionality
4. **Blog System**: Add MDX support for content management
5. **User Dashboard**: Create protected user area for appointment management

### Important Notes for Future Development

- **Maintain Design System**: Use established colors and typography
- **Keep TypeScript Strict**: Don't disable strict mode or add `any` types
- **Follow Accessibility**: Include ARIA labels and keyboard navigation
- **Test Coverage**: Maintain 70% coverage threshold
- **Performance**: Use Next.js Image component for all images
- **Security**: Always validate inputs with Zod schemas

## Working with This Codebase

### Before Making Changes

1. Always check Implementation Status section below
2. Read TODO comments in relevant files
3. Check PROJECT_STATUS.md for recent updates

### After Making Changes

1. Update Implementation Status in this file
2. Add TODO comments for incomplete work
3. Document any breaking changes or important decisions

### Communication Protocol

- Use TODO: for future work
- Use FIXME: for bugs
- Use NOTE: for important context
- Use HACK: for temporary solutions
- Update this file's status section after major changes
- Never use emojis in code or comments

## Code Quality Guidelines

This section provides comprehensive guidelines for maintaining high code quality standards across the project. These guidelines are based on the ESLint configuration and best practices established in the codebase.

### ESLint Configuration

#### Current Configuration

The project uses ESLint with the following key configurations:

- **Next.js**: `next/core-web-vitals` and `next/typescript` presets
- **Prettier Integration**: Automatic code formatting
- **TypeScript Strict**: Enhanced type checking with custom rules
- **React Hooks**: Exhaustive dependency checking

#### File Exclusions

The following files and directories are excluded from linting:

```javascript
// Global ignores in eslint.config.mjs
{
  ignores: [
    "node_modules/**",
    ".next/**",
    "out/**",
    "build/**",
    "dist/**",
    "src/generated/**/*",     // Prisma generated files
    "*.config.js",
    "*.config.mjs",
    "jest.setup.js",
    "next-env.d.ts",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    "**/*.trace.zip",
    "**/*.png",
    "**/.DS_Store",
  ],
}
```

### React/JSX Best Practices

#### Entity Escaping

**Rule**: All special characters in JSX content must be properly escaped.

**Examples**:

```jsx
// ❌ Incorrect - Unescaped entities
<p>We're here to help!</p>
<p>Say "hello" to everyone.</p>
<p>Anxiety & Depression support</p>

// ✅ Correct - Properly escaped entities
<p>We&apos;re here to help!</p>
<p>Say &quot;hello&quot; to everyone.</p>
<p>Anxiety &amp; Depression support</p>
```

**Common Entities**:

- Apostrophe `'` → `&apos;`
- Double quote `"` → `&quot;`
- Ampersand `&` → `&amp;`
- Less than `<` → `&lt;`
- Greater than `>` → `&gt;`
- Bullet point `•` → `&bull;`

#### Self-Closing Components

**Rule**: Empty components must be self-closing.

```jsx
// ❌ Incorrect
<div className="spinner"></div>
<input type="text"></input>

// ✅ Correct
<div className="spinner" />
<input type="text" />
```

#### Autocomplete Attributes

**Rule**: Add proper autocomplete attributes to form fields to eliminate browser warnings.

```jsx
// ✅ Correct form field attributes
<input
  type="email"
  autoComplete="email"
  inputMode="email"
  aria-label="Email address"
/>
<input
  type="tel"
  autoComplete="tel"
  inputMode="tel"
  aria-label="Phone number"
/>
<input
  type="password"
  autoComplete="new-password"
  aria-label="Password"
/>
```

### TypeScript Best Practices

#### Unused Variables

**Rule**: All unused variables must be prefixed with underscore `_` or removed.

```typescript
// ❌ Incorrect - Unused variables
const { reset, data, error } = useForm();
catch (error) { /* not used */ }

// ✅ Correct - Prefixed with underscore
const { reset: _reset, data, error: _error } = useForm();
catch (_error) { /* explicitly unused */ }
```

#### Explicit Any Types

**Rule**: Avoid `any` types where possible. Use proper typing or `unknown` for better type safety.

```typescript
// ❌ Avoid explicit any
const handleData = (data: any) => {
  /* ... */
};

// ✅ Preferred approaches
const handleData = (data: unknown) => {
  /* ... */
};
const handleData = <T>(data: T) => {
  /* ... */
};
const handleData = (data: User | Contact) => {
  /* ... */
};
```

#### Optional Chain Safety

**Rule**: Never use non-null assertions with optional chaining.

```typescript
// ❌ Dangerous - Non-null assertion with optional chaining
const height = boundingBox?.height!;
const result = data?.items?.[0]!.name;

// ✅ Safe - Proper null checking
if (boundingBox) {
  const height = boundingBox.height;
}
const result = data?.items?.[0]?.name;
```

### React Hooks Best Practices

#### useCallback Dependencies

**Rule**: All dependencies of useCallback must be properly declared or use alternative patterns for debounced functions.

```typescript
// ❌ Problematic - debounce returns function with unknown dependencies
const debouncedFn = useCallback(debounce(someFunction, 500), [someFunction]);

// ✅ Solution 1 - Use useRef for debounced functions
const debouncedFnRef = useRef(debounce(someFunction, 500));
useEffect(() => {
  debouncedFnRef.current = debounce(someFunction, 500);
}, [someFunction]);

// ✅ Solution 2 - Separate the function and debouncing
const handleFunction = useCallback(
  async (param: string) => {
    // Function logic here
  },
  [dependencies]
);

const debouncedHandle = useCallback(debounce(handleFunction, 500), [
  handleFunction,
]);
```

#### useEffect Dependencies

**Rule**: Include all dependencies in useEffect dependency arrays.

```typescript
// ❌ Missing dependencies
useEffect(() => {
  fetchData(userId);
}, []); // Missing userId dependency

// ✅ Complete dependencies
useEffect(() => {
  fetchData(userId);
}, [userId, fetchData]);
```

### Import/Export Best Practices

#### Unused Imports

**Rule**: Remove unused imports or prefix with underscore if needed for configuration.

```typescript
// ❌ Unused imports
import { useState, useEffect, useCallback } from "react";
import { SomeUnusedUtility } from "./utils";

// ✅ Only import what you use
import { useState, useEffect } from "react";

// ✅ For configuration/validation imports that appear unused
import SomeProvider from "provider";
// Suppress unused import warnings for configuration validation
const _configProviders = { SomeProvider };
```

### Testing Code Quality

#### Test File Standards

**Rule**: Maintain the same code quality standards in test files.

```typescript
// ✅ Proper test patterns
import { render, screen } from "@testing-library/react";
// Remove fireEvent if not used
import userEvent from "@testing-library/user-event";

// Use proper typing for mocks
const mockFetch = jest.fn();
global.fetch = mockFetch as jest.MockedFunction<typeof fetch>;

// Prefix unused variables in tests
test("example", async () => {
  const _response = await apiCall(); // Not checking response
  expect(screen.getByText("Success")).toBeInTheDocument();
});
```

### Before Committing Checklist

Run these commands and fix any issues before committing:

1. **Code Formatting**: `npm run format`
   - Automatically fixes all formatting issues across the codebase
   - MUST be run first to ensure clean diffs and avoid CI/CD pipeline failures
   - Verify `npm run format:check` passes after formatting
2. **Linting**: `npm run lint:fix`
   - Should return **0 errors** (warnings are acceptable if properly justified)
   - Handles code quality issues after formatting is complete
3. **Type Checking**: `npm run typecheck`
   - Must pass with no TypeScript errors
   - Ensures strict mode compliance for professional healthcare standards
4. **Testing**: `npm run test`
   - All tests must pass with minimum 70% coverage
   - Includes unit, integration, and accessibility testing
5. **Build Verification**: `npm run build`
   - Production build must complete successfully
   - Ensures deployment readiness

**Critical Notes**:

- **Always format first**: Running `npm run format` before other checks prevents conflicts
- **CI/CD Requirements**: All checks must pass locally to avoid pipeline failures
- **Professional Standards**: Code quality is essential for healthcare technology compliance
- **Incremental Commits**: Consider committing after each major step to maintain clean history

### Common ESLint Rule Fixes

#### React Specific

- `react/no-unescaped-entities`: Escape special characters in JSX
- `react/self-closing-comp`: Use self-closing tags for empty components
- `react/jsx-curly-brace-presence`: Remove unnecessary braces in JSX
- `react-hooks/exhaustive-deps`: Include all dependencies in hook arrays

#### TypeScript Specific

- `@typescript-eslint/no-unused-vars`: Prefix unused variables with `_`
- `@typescript-eslint/no-explicit-any`: Use proper typing instead of `any`
- `@typescript-eslint/no-non-null-asserted-optional-chain`: Avoid `?.prop!` patterns

#### Import/Export

- Remove unused imports completely
- Use meaningful variable names
- Group related imports together

### Troubleshooting Common Issues

#### Generated Files Being Linted

**Problem**: Prisma generated files or build output being processed by ESLint.
**Solution**: Add to the `ignores` array in `eslint.config.mjs`:

```javascript
("src/generated/**/*", ".next/**", "dist/**");
```

#### Debounced Functions in useCallback

**Problem**: `React Hook useCallback received a function whose dependencies are unknown`
**Solution**: Use the useRef pattern shown above for debounced functions.

#### Optional Chaining with Non-null Assertion

**Problem**: `Optional chain expressions can return undefined by design`
**Solution**: Use proper null checking instead of non-null assertions.

```typescript
// ❌ Problematic
const value = obj?.prop!;

// ✅ Safe
const value = obj?.prop;
if (obj && obj.prop) {
  const value = obj.prop; // Now safely typed
}
```

#### Test File Configuration

**Problem**: Test files not following same standards.
**Solution**: Ensure test files use proper imports, handle unused variables, and maintain typing standards.

### Performance Considerations

#### Bundle Size Impact

- Unused imports increase bundle size
- Proper ESLint configuration prevents this automatically
- Tree shaking works better with clean imports

#### Development Experience

- Fast linting feedback prevents runtime errors
- TypeScript strict mode catches issues early
- Consistent formatting improves code review efficiency

### Integration with CI/CD

The GitHub Actions pipeline enforces these standards:

- Linting must pass with 0 errors
- TypeScript compilation must succeed
- All tests must pass
- Code formatting must be consistent

This ensures code quality is maintained across all contributions to the project.

## Code Formatting Standards

This section provides comprehensive guidelines for maintaining consistent code formatting across the entire project. Code formatting is enforced through Prettier integration with ESLint and is a critical part of the CI/CD pipeline.

### Prettier Configuration

#### Current Configuration (.prettierrc)

The project uses Prettier with the following configuration optimized for professional counseling practice development:

```json
{
  "semi": true, // Always use semicolons for statement termination
  "trailingComma": "es5", // Trailing commas where valid in ES5 (objects, arrays)
  "singleQuote": false, // Use double quotes for consistency with JSX attributes
  "printWidth": 80, // 80-character line length for optimal readability
  "tabWidth": 2, // 2-space indentation for compact, readable code
  "useTabs": false, // Use spaces for consistent cross-platform formatting
  "bracketSpacing": true, // Spaces inside object literal braces { foo: bar }
  "bracketSameLine": false, // JSX closing bracket on new line for readability
  "arrowParens": "avoid", // Omit parentheses around single arrow function parameters
  "endOfLine": "lf" // Unix-style line endings for cross-platform compatibility
}
```

#### Key Formatting Rules Applied

**Semicolons**: Always required for statement termination

```typescript
// Correct
const user = { name: "John", email: "john@example.com" };
const result = await fetchData();

// Incorrect - Missing semicolons
const user = { name: "John", email: "john@example.com" };
const result = await fetchData();
```

**Quotes**: Double quotes for strings, maintaining JSX attribute consistency

```typescript
// Correct
const message = "Welcome to Healing Pathways Counseling";
<input type="email" placeholder="Enter your email" />

// Incorrect - Mixed quote styles
const message = 'Welcome to Healing Pathways Counseling';
<input type='email' placeholder='Enter your email' />
```

**Line Length**: 80 characters maximum for optimal readability

```typescript
// Correct - Properly wrapped
const longFunctionCall = someFunction(parameter1, parameter2, parameter3);

// Incorrect - Exceeds line length
const longFunctionCall = someFunction(
  parameter1,
  parameter2,
  parameter3,
  parameter4,
  parameter5
);
```

**Indentation**: 2 spaces consistently throughout

```typescript
// Correct
if (user) {
  const appointments = await prisma.appointment.findMany({
    where: { userId: user.id },
    include: { service: true },
  });
}

// Incorrect - Inconsistent indentation
if (user) {
  const appointments = await prisma.appointment.findMany({
    where: { userId: user.id },
    include: { service: true },
  });
}
```

**Object and Array Formatting**: Consistent spacing and trailing commas

```typescript
// Correct
const config = {
  database: process.env.DATABASE_URL,
  auth: {
    secret: process.env.NEXTAUTH_SECRET,
    providers: ["google", "credentials"],
  },
};

// Incorrect - No spacing, missing trailing comma
const config = {
  database: process.env.DATABASE_URL,
  auth: {
    secret: process.env.NEXTAUTH_SECRET,
    providers: ["google", "credentials"],
  },
};
```

### Command Usage

#### Formatting Commands

**`npm run format`** - Automatically fix formatting issues across entire codebase

```bash
# Formats all supported files in the project
npm run format

# Example output:
# src/components/forms/contact-form.tsx 2ms
# src/app/contact/page.tsx 1ms
# src/lib/validations/index.ts 1ms
```

**`npm run format:check`** - Verify formatting without making changes (used in CI/CD)

```bash
# Check formatting compliance without modifications
npm run format:check

# Success output:
# All matched files use Prettier code style!

# Failure output:
# Code style issues found in the following file(s):
# src/components/forms/contact-form.tsx
# src/app/contact/page.tsx
```

#### Integration with Development Workflow

**During Development**: Use `npm run format` before committing changes
**In CI/CD Pipeline**: `npm run format:check` prevents deployment of improperly formatted code
**IDE Integration**: Configure your editor to format on save using Prettier extension

### File Inclusion/Exclusion (.prettierignore)

#### Files Formatted by Prettier

Prettier processes these file types throughout the project:

- **TypeScript/JavaScript**: `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`
- **JSON**: `package.json`, `tsconfig.json`, configuration files
- **Markdown**: `README.md`, `CLAUDE.md`, documentation files
- **CSS**: `.css` files (when applicable)

#### Files Excluded from Formatting

The `.prettierignore` configuration excludes:

```bash
# Dependencies and generated files
node_modules/           # Package dependencies
src/generated/**       # Prisma generated client
*.tsbuildinfo          # TypeScript build info
next-env.d.ts          # Next.js environment types

# Build outputs
.next/                 # Next.js build directory
out/                   # Export output directory
build/                 # Custom build directory
dist/                  # Distribution directory

# Test artifacts
playwright-report/     # E2E test reports
test-results/          # Test execution results
coverage/              # Jest coverage reports
**/*.trace.zip         # Playwright trace files

# Environment and configuration
.env*                  # Environment variable files
.DS_Store              # macOS system files
Thumbs.db              # Windows system files

# Development tools
.vscode/               # VS Code settings
.idea/                 # IntelliJ settings
*.log                  # Log files
```

### Integration with ESLint

#### Prettier-ESLint Integration

The project uses `eslint-config-prettier` to ensure no conflicts between ESLint and Prettier rules:

- **ESLint**: Handles code quality, unused variables, React patterns, TypeScript types
- **Prettier**: Handles code formatting, indentation, quotes, semicolons, line breaks
- **No Conflicts**: Rules properly separated to avoid competing requirements

#### Workflow Integration

```bash
# Complete code quality check sequence
npm run format        # Fix formatting issues
npm run lint:fix      # Fix ESLint issues
npm run typecheck     # Verify TypeScript types
npm run test          # Run test suite
npm run build         # Verify production build
```

### CI/CD Pipeline Integration

#### GitHub Actions Formatting Check

The CI/CD pipeline includes a dedicated formatting check step:

```yaml
# .github/workflows/ci.yml (relevant section)
- name: Check code formatting
  run: npm run format:check
```

**Pipeline Behavior**:

- **Success**: Pipeline continues if all files are properly formatted
- **Failure**: Pipeline fails with specific files needing formatting
- **Error Message**: Lists exactly which files need `npm run format` run locally

#### Branch Protection

Formatting checks are required for:

- Pull request merges to main branch
- Direct pushes to protected branches
- Release deployments

### Development Guidelines Integration

#### Pre-Commit Formatting Requirements

**Before Every Commit**:

1. Run `npm run format` to fix any formatting issues
2. Verify `npm run format:check` passes locally
3. Ensure no conflicts between formatting and functionality
4. Check that formatted code maintains all functionality

**IDE Setup Recommendations**:

- Install Prettier extension for your editor
- Enable "format on save" for automatic formatting
- Configure to use project's `.prettierrc` settings
- Set up format on paste for consistent imports

### Common Formatting Patterns

#### React/JSX Formatting

**Component Structure**: Consistent prop and element formatting

```jsx
// Correct JSX formatting
<input
  type="email"
  value={email}
  onChange={handleEmailChange}
  className="w-full px-4 py-2 border border-border rounded-lg"
  placeholder="Enter your email address"
  required
/>

// Incorrect - Inconsistent formatting
<input type="email" value={email} onChange={handleEmailChange} className="w-full px-4 py-2 border border-border rounded-lg" placeholder="Enter your email address" required />
```

**Function Declaration**: Consistent parameter and return formatting

```typescript
// Correct function formatting
export async function createContactSubmission(
  data: ContactFormData,
  userId?: string
): Promise<ContactSubmission> {
  const submission = await prisma.contactSubmission.create({
    data: {
      ...data,
      userId,
      isRead: false,
    },
  });

  return submission;
}
```

#### API Route Formatting

**Consistent Error Handling**: Proper formatting for try-catch blocks

```typescript
// Correct API route formatting
export const POST = withErrorHandler(async (request: NextRequest) => {
  try {
    const data = await request.json();
    const validated = contactSchema.parse(data);

    const result = await createContactSubmission(validated);
    logger.info("Contact submission created", { id: result.id });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    logger.error("Contact submission failed", error);
    throw error;
  }
});
```

### Troubleshooting Formatting Issues

#### Common Formatting Problems

**Problem**: `format:check` fails in CI/CD pipeline
**Solution**: Run `npm run format` locally and commit the changes

```bash
# Fix formatting locally
npm run format
git add .
git commit -m "Fix code formatting"
git push
```

**Problem**: Merge conflicts with formatting changes
**Solution**: Format after resolving conflicts, before committing

```bash
# After resolving conflicts
npm run format
git add .
git commit -m "Resolve merge conflicts and fix formatting"
```

**Problem**: IDE not using project Prettier configuration
**Solution**: Ensure Prettier extension uses project settings

- Check that `.prettierrc` exists in project root
- Restart IDE after installing Prettier extension
- Verify "Prettier: Require Config" is enabled in settings

**Problem**: Formatting conflicts with custom editor settings
**Solution**: Configure editor to use project Prettier settings

- Disable competing formatters (like VS Code's built-in TypeScript formatter for formatting)
- Set Prettier as default formatter for TypeScript/JavaScript files
- Enable "Format on Save" specifically for Prettier

#### Configuration Debugging

**Verify Prettier Installation**:

```bash
# Check Prettier version
npx prettier --version

# Test formatting on specific file
npx prettier --check src/app/page.tsx

# Preview formatting changes
npx prettier src/app/page.tsx
```

**Check Configuration Loading**:

```bash
# Verify Prettier finds configuration
npx prettier --find-config-path src/app/page.tsx

# Should output: D:\github\CC_Site\.prettierrc
```

#### Performance Considerations

**Formatting Speed**: Prettier is optimized for fast formatting across large codebases
**CI/CD Impact**: Formatting check adds ~10-15 seconds to pipeline execution
**Development Experience**: Format-on-save provides instant feedback without interruption

### Project-Specific Formatting Notes

#### Healthcare Technology Standards

As a professional counseling practice website, consistent formatting supports:

- **Code Reliability**: Uniform formatting reduces bugs from inconsistent patterns
- **Team Collaboration**: Multiple developers can work efficiently with consistent style
- **Maintenance**: Easy code review and debugging with predictable formatting
- **Compliance**: Professional appearance supports healthcare technology standards

#### Integration with Existing Systems

**Database Operations**: Consistent formatting for Prisma queries and data handling
**Authentication**: Uniform formatting across NextAuth configuration and auth flows
**Testing**: Consistent test file formatting for reliable test maintenance
**API Endpoints**: Standardized formatting for error handling and response patterns

This comprehensive formatting system ensures code quality consistency across all development phases while supporting the professional healthcare technology standards required for a counseling practice website.

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
  --primary: #4a8b8c;           /* Sage green - calming, trustworthy */
  --secondary: #7a9e9f;         /* Lighter sage */
  --accent: #b5a588;            /* Warm beige - approachable */
  --background: #fefefe;        /* Off-white background */
  --foreground: #2c2c2c;        /* Dark text */
  --muted: #f8f8f8;            /* Light backgrounds */
  --card: #ffffff;              /* Card backgrounds */
  --border: #e5e7eb;           /* Subtle borders */
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
    })
  ],
  callbacks: {
    // Role-based access control (CLIENT/ADMIN)
    // Email verification enforcement
    // Session management with user data
  }
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
  password: z.string().min(8, "Password must be at least 8 characters")
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
  include: { appointments: true }
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
  description: "Professional counseling services focused on your mental health and wellbeing...",
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
describe('Authentication Validation', () => {
  it('accepts valid registration data', () => {
    const validData = { name: 'John Doe', email: 'john@example.com', /* ... */ };
    const result = registerSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('rejects invalid email formats', () => {
    const invalidData = { email: 'invalid-email', /* ... */ };
    const result = registerSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    expect(result.error.errors[0].message).toBe('Please enter a valid email address');
  });
});

// Integration Test Pattern for Auth Flows
describe('Authentication Flow Integration', () => {
  it('completes registration and login flow', async () => {
    // 1. Registration
    const registrationResponse = await POST(registrationRequest);
    expect(registrationResponse.status).toBe(201);

    // 2. Login
    const loginResult = await credentialsProvider.authorize(credentials);
    expect(loginResult.id).toBeDefined();

    // 3. Session creation
    const sessionResult = await authOptions.callbacks!.session!({ session, token });
    expect(sessionResult.user.id).toBe(loginResult.id);
  });
});

// E2E Test Pattern for User Journeys
test('completes full registration process', async ({ page }) => {
  await page.goto('/auth/register');
  await page.fill('[data-testid="name-input"]', 'E2E Test User');
  await page.fill('[data-testid="email-input"]', 'e2e@example.com');
  await page.click('[data-testid="register-submit"]');
  await expect(page).toHaveURL('/auth/verify-email');
});
```

### Mobile Testing Patterns
```typescript
// Mobile Device Configuration
test.use({ ...devices['iPhone 12'] });

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
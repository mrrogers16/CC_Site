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
- Services page with detailed service information
- Contact form with validation and email integration
- Appointment booking system with calendar UI
- Blog system with MDX support
- Authentication system (NextAuth.js ready)

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
  id        String (cuid)
  email     String (unique)
  name      String
  phone     String? (optional)
  // Relationships to appointments and contact submissions
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

### Form Handling (Ready for Implementation)
```typescript
// Pattern established in /lib/validations/index.ts
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const contactFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Please enter a valid email address"),
  // ... other fields
});

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
EMAIL_SERVER_HOST="smtp.gmail.com"
GOOGLE_CLIENT_ID="your-google-client-id"
STRIPE_SECRET_KEY="sk_test_your-stripe-secret-key"
```

### Development Server Status
- **✅ Running Successfully**: `npm run dev` works without errors
- **✅ Build Verified**: `npm run build` completes successfully
- **✅ Type Safety**: All TypeScript strict checks passing
- **✅ Code Quality**: ESLint and Prettier configured and working

### Testing Infrastructure (Ready)
- **Jest**: Unit testing configured with Next.js integration
- **Playwright**: E2E testing with multi-browser support
- **Coverage**: 70% threshold set with proper exclusions
- **CI/CD**: GitHub Actions pipeline for automated testing

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

## Implementation Patterns Established

### Adding New Features (Follow This Pattern)
1. **Types**: Create TypeScript interfaces in `/types/index.ts`
2. **Validation**: Add Zod schemas in `/lib/validations/index.ts` 
3. **Database**: Update Prisma schema, run `npm run db:generate`
4. **API**: Create route handlers using `withErrorHandler` wrapper
5. **Components**: Build UI following the section pattern (py-20 px-4...)
6. **Tests**: Add unit tests and E2E tests for critical paths
7. **Documentation**: Update this CLAUDE.md file

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
1. **Services Page**: Use the established section pattern for service details
2. **Contact Form**: Implement using react-hook-form + Zod validation
3. **Appointment Booking**: Create calendar UI with time slot selection
4. **Blog System**: Add MDX support for content management

### Important Notes for Future Development
- **Maintain Design System**: Use established colors and typography
- **Keep TypeScript Strict**: Don't disable strict mode or add `any` types
- **Follow Accessibility**: Include ARIA labels and keyboard navigation
- **Test Coverage**: Maintain 70% coverage threshold
- **Performance**: Use Next.js Image component for all images
- **Security**: Always validate inputs with Zod schemas
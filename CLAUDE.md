# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a professional counseling practice website built with Next.js 15+ App Router, TypeScript, Tailwind CSS v4, and Prisma ORM with PostgreSQL. The site provides appointment booking, service information, blog functionality, and contact forms for a mental health counseling practice.

**Project Name**: Healing Pathways Counseling  
**Status**: Core Features Complete - Ready for Advanced Development  
**Last Updated**: 2025-08-23

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

### Database Schema Summary

```prisma
User {
  id            String (cuid)
  email         String (unique)
  name          String
  phone         String? (optional)
  role          UserRole (CLIENT/ADMIN enum)
  // Relationships to appointments, contact submissions
}

Service {
  id          String (cuid)
  title       String
  description String
  duration    Int (minutes)
  price       Decimal (@db.Money)
  isActive    Boolean (default: true)
}

Appointment {
  id          String (cuid)
  userId      String (foreign key)
  serviceId   String (foreign key)
  dateTime    DateTime
  status      AppointmentStatus (enum)
}

ContactSubmission {
  id        String (cuid)
  name      String
  email     String
  subject   String
  message   String
  isRead    Boolean (default: false)
}

// NextAuth models: Account, Session, VerificationToken
```

**Key Schema Decisions:**

- CUID IDs for all primary keys
- Cascade deletes for user relationships
- Soft deletes for services (isActive flag)
- Money type for proper decimal handling

### Design System

#### Color Palette

```css
:root {
  --primary: #4a8b8c; /* Sage green - calming, trustworthy */
  --secondary: #7a9e9f; /* Lighter sage */
  --accent: #b5a588; /* Warm beige - approachable */
  --background: #fefefe; /* Off-white background */
  --foreground: #2c2c2c; /* Dark text */
}
```

#### Typography

- **Primary Font**: Inter (body text)
- **Display Font**: Playfair Display (headings)
- **Optimization**: Next.js font optimization enabled

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

## Development Patterns

### Component Architecture

```typescript
// Standard component structure
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

### Form Handling

```typescript
// Zod validation schema
const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Please enter a valid email address"),
});

// React Hook Form integration
const form = useForm<FormData>({
  resolver: zodResolver(schema),
  mode: "onChange",
});
```

### API Routes

```typescript
// Using error handler wrapper
import { withErrorHandler } from "@/lib/api/error-handler";

export const POST = withErrorHandler(async (request: NextRequest) => {
  const data = await request.json();
  const validated = schema.parse(data);

  const result = await prisma.model.create({ data: validated });
  logger.info("Created resource", { id: result.id });

  return NextResponse.json({ success: true, data: result });
});
```

### Error Handling

```typescript
// Custom error classes
import { AppError, ValidationError, NotFoundError } from "@/lib/errors";

// Usage
throw new ValidationError("Invalid email format");
throw new NotFoundError("Appointment");
```

### Database Operations

```typescript
import { prisma } from "@/lib/db";

// Standard query pattern
const users = await prisma.user.findMany({
  include: { appointments: true },
});
```

## Authentication System

Fully implemented with NextAuth.js:

- Google OAuth provider
- Credentials provider with bcrypt
- Role-based access control (CLIENT/ADMIN)
- Email verification requirement
- Session management with Prisma adapter

## Testing Approach

### Unit Testing

- Jest with React Testing Library
- Focus on business logic and validation
- Mock external dependencies
- Target 60%+ coverage for critical paths

### E2E Testing

- Playwright with multi-browser support
- Test complete user journeys
- Mobile device testing included
- Add `data-testid` attributes for reliable selection

### Testing Patterns

```typescript
// Component testing with validation
test("shows validation error for invalid email", async () => {
  render(<ContactForm />);
  await user.type(screen.getByLabelText(/email/i), "invalid-email");
  await user.click(screen.getByRole("button", { name: /submit/i }));

  expect(screen.getByText(/valid email address/i)).toBeInTheDocument();
});

// API endpoint testing
test("creates contact submission successfully", async () => {
  const response = await POST(mockRequest);
  expect(response.status).toBe(201);
});
```

## Code Quality Guidelines

### Before Committing Checklist

1. **Format Code**: `npm run format`
2. **Lint Code**: `npm run lint:fix`
3. **Type Check**: `npm run typecheck`
4. **Test**: `npm run test:coverage`
5. **Build**: `npm run build`

### Key Rules

- **Entity Escaping**: Use `&apos;`, `&quot;`, `&amp;` in JSX
- **Self-Closing Tags**: `<div />` not `<div></div>` for empty elements
- **Unused Variables**: Prefix with `_` or remove
- **TypeScript**: Avoid `any` types, use proper typing
- **React Hooks**: Include all dependencies in arrays

## Implementation Notes

### Current Features (Working)

- Professional home page with sage green theme
- Services page with database integration
- Contact form with email notifications
- Admin dashboard for contact management
- User authentication with Google OAuth
- Responsive navigation and footer
- Real-time form validation

### Next Priority Features

1. **Appointment Booking System**
   - Calendar interface with time slots
   - Booking confirmation workflow
   - Email notifications
2. **Blog System**
   - MDX support for content
   - SEO optimization
3. **Enhanced User Dashboard**
   - Appointment management
   - Profile settings

### Environment Configuration

Key variables in `.env`:

```bash
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="..."
GOOGLE_CLIENT_ID="..."
EMAIL_SERVER_HOST="smtp.gmail.com"
```

### Security Considerations

- Input validation with Zod schemas
- TypeScript strict mode prevents runtime errors
- Environment variable patterns established
- Error handling prevents information leakage

## Working with This Codebase

### Before Making Changes

1. Check PROJECT_STATUS.md for recent updates
2. Read TODO comments in relevant files
3. Ensure development server runs: `npm run dev`

### After Making Changes

1. Update relevant documentation
2. Add TODO comments for incomplete work
3. Run full code quality checklist
4. Update PROJECT_STATUS.md if needed

### Communication Protocol

- Use TODO: for future work
- Use FIXME: for bugs
- Use NOTE: for important context
- Never use emojis in code or comments

## Adding New Features

Follow this pattern:

1. **Types**: Add to `/types/index.ts`
2. **Validation**: Create Zod schemas in `/lib/validations/`
3. **Database**: Update Prisma schema, run `npm run db:generate`
4. **API**: Create routes with `withErrorHandler`
5. **Components**: Follow established patterns
6. **Testing**: Add unit and E2E tests
7. **Documentation**: Update this file

### Component Creation Pattern

```typescript
// Use consistent section structure
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

---

**Important**: This is a professional counseling practice website. Maintain healthcare technology standards, ensure accessibility compliance, and preserve the calming, trustworthy design aesthetic.
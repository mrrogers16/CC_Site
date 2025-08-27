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

## MANDATORY CODE QUALITY PREVENTION PATTERNS

### TypeScript Strict Mode Compliance (REQUIRED FOR ALL CODE)

#### Before Writing ANY Code - Use These Patterns:

**1. Optional Properties with exactOptionalPropertyTypes:**

```typescript
interface FormData {
  name: string;
  phone?: string; // Optional
  notes?: string; // Optional
}

// ✅ CORRECT - Conditional inclusion for optional properties:
const data = {
  name: "John",
  ...(phone && { phone }), // Only include if truthy
  ...(notes && { notes }), // Only include if truthy
};

// ❌ NEVER DO THIS - Will cause TypeScript errors:
const data = {
  name: "John",
  phone: maybePhone, // ERROR: string | undefined not assignable to string
  notes: maybeNotes, // ERROR: string | undefined not assignable to string
};
```

**2. Null Safety Patterns (MANDATORY):**

```typescript
// ✅ ALWAYS check for undefined/null before property access:
if (!result) return;
if (!result?.property) return;

// Use optional chaining:
const value = object?.property?.subProperty;

// Use nullish coalescing:
const finalValue = value ?? defaultValue;

// ❌ NEVER assume objects exist:
result.property; // ERROR if result might be undefined
```

**3. Variable Naming (MANDATORY):**

```typescript
// ✅ Unused variables MUST start with underscore:
const _unusedVariable = someFunction();
const { data, error: _error } = useQuery(); // If error not used

// ❌ NEVER leave unused variables without underscore:
const unusedVariable = someFunction(); // ERROR: no-unused-vars
```

### Jest/Testing Patterns (MANDATORY FOR ALL TESTS)

**1. Prisma Mocking Pattern:**

```typescript
// ✅ ALWAYS use this exact pattern for Prisma mocks:
import { jest } from "@jest/globals";

// Create properly typed mock:
const mockPrisma = {
  service: {
    findUnique: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
  },
  appointment: {
    findFirst: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
  },
} as jest.Mocked<typeof prisma>;

// In tests:
mockPrisma.service.findUnique.mockResolvedValue(mockData);

// ❌ NEVER do this:
prisma.service.findUnique.mockResolvedValue(mockData); // ERROR: Property doesn't exist
```

**2. DOM Element Testing:**

```typescript
// ✅ ALWAYS check for null when querying DOM:
const button = screen.queryByRole("button", { name: /submit/i });
if (!button) throw new Error("Button not found");
await user.click(button);

// OR use getBy (which throws if not found):
const button = screen.getByRole("button", { name: /submit/i });
await user.click(button);

// ❌ NEVER assume elements exist:
const button = screen.queryByRole("button");
await user.click(button); // ERROR: button might be null
```

**3. Zod Error Handling:**

```typescript
// ✅ ALWAYS use 'issues' not 'errors':
try {
  schema.parse(data);
} catch (error) {
  if (error instanceof ZodError) {
    const message = error.issues[0].message; // ✅ CORRECT
    // ❌ NEVER: error.errors[0].message // Property doesn't exist
  }
}
```

### Playwright E2E Patterns (MANDATORY):

```typescript
// ✅ ALWAYS use correct Playwright API methods:
await page.getByLabel("Email"); // CORRECT
await page.getByRole("button", { name: "Submit" }); // CORRECT
await expect(locator).toHaveCount({ min: 1 }); // CORRECT

// ❌ NEVER use these (don't exist):
await page.getByLabelText("Email"); // ERROR: Method doesn't exist
await expect(locator).toHaveCount().greaterThan(0); // ERROR: Chain doesn't exist
```

### DayPicker Configuration (MANDATORY):

```typescript
// ✅ ALWAYS use function props for labels:
<DayPicker
  labels={{
    labelPrevious: () => "Previous month",
    labelNext: () => "Next month"
  }}
  disabled={(date) => isWeekend(date)} // Function for disabled
  // ❌ NEVER: disabled={disabledDates} // Array assigned to boolean
/>
```

## BEFORE COMMITTING CHECKLIST (MANDATORY)

**Run these commands in EXACT order and fix ALL issues before committing:**

```bash
# 1. Format code (fixes formatting issues)
npm run format

# 2. Verify formatting
npm run format:check

# 3. Fix linting issues automatically
npm run lint:fix

# 4. Check remaining linting issues (should be 0 errors, warnings OK)
npm run lint

# 5. Type check (MUST be 0 errors)
npm run typecheck

# 6. Run tests (MUST pass)
npm run test

# 7. Build check (MUST succeed)
npm run build
```

**⚠️ If ANY command fails, FIX the issues before proceeding. NO EXCEPTIONS.**

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

## MANDATORY DEVELOPMENT PATTERNS

### Component Architecture

```typescript
// ✅ ALWAYS use this exact section structure:
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
// ✅ ALWAYS use this exact pattern:
const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Please enter a valid email address"),
});

// React Hook Form integration with real-time validation:
const form = useForm<FormData>({
  resolver: zodResolver(schema),
  mode: "onChange", // REQUIRED for real-time validation
});
```

### API Routes

```typescript
// ✅ ALWAYS follow this exact pattern:
import { withErrorHandler } from "@/lib/api/error-handler";

export const POST = withErrorHandler(async (request: NextRequest) => {
  // 1. Parse and validate input
  const data = await request.json();
  const validated = schema.parse(data);

  // 2. Business logic with proper error handling
  const result = await prisma.model.create({ data: validated });
  logger.info("Created resource", { id: result.id });

  // 3. Return structured response
  return NextResponse.json({ success: true, data: result });
});

// ❌ NEVER create raw API routes without error handling
```

### Error Handling

```typescript
// ✅ Custom error classes
import { AppError, ValidationError, NotFoundError } from "@/lib/errors";

// Usage
throw new ValidationError("Invalid email format");
throw new NotFoundError("Appointment");
```

### Database Operations

```typescript
import { prisma } from "@/lib/db";

// ✅ Standard query pattern with proper includes
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
// Component testing with validation (ensure mode: "onChange" for real-time validation)
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

// Enhanced form testing with async validation
test("handles email availability checking", async () => {
  (fetch as jest.Mock).mockResolvedValueOnce({
    ok: true,
    json: async () => ({ available: true, message: "Email address is available" }),
  });

  render(<EnhancedRegisterForm />);
  await user.type(screen.getByTestId("email-input"), "test@example.com");

  await waitFor(() => {
    expect(screen.getByText("Email address is available")).toBeInTheDocument();
  });
});
```

## TESTING REQUIREMENTS (MANDATORY)

### Every Component Must Have:

1. **Unit tests** with proper DOM null checks using patterns above
2. **Accessibility tests** with ARIA validation
3. **TypeScript compliance** with strict mode patterns
4. **Mock patterns** following established Jest standards

### Every API Route Must Have:

1. **Unit tests** with proper Prisma mocking using patterns above
2. **Validation tests** for all input scenarios
3. **Error handling tests** for edge cases
4. **Integration tests** with database

## Key Rules

- **Entity Escaping**: Use `&apos;`, `&quot;`, `&amp;` in JSX
- **Self-Closing Tags**: `<div />` not `<div></div>` for empty elements
- **Unused Variables**: Prefix with `_` or remove
- **TypeScript**: Follow strict mode patterns above, avoid `any` types
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
3. **RUN FULL CODE QUALITY CHECKLIST** (mandatory)
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
5. **Components**: Follow established patterns above
6. **Testing**: Add unit and E2E tests using mandatory patterns
7. **Documentation**: Update this file

### Component Creation Pattern

```typescript
// ✅ Use consistent section structure
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

## CONSEQUENCES OF NOT FOLLOWING PATTERNS

**If code doesn't follow these mandatory patterns:**

- ❌ CI/CD pipeline will fail
- ❌ TypeScript errors will block development
- ❌ Tests will be unreliable
- ❌ Code review will be rejected
- ❌ Professional healthcare technology standards compromised

**These patterns are NON-NEGOTIABLE for professional healthcare technology.**

---

## SUMMARY: Prevention > Fixing

Instead of fixing recurring issues:

1. **Follow these mandatory patterns from the start**
2. **Run the checklist before every commit**
3. **Never skip TypeScript compliance**
4. **Always test with proper mocking patterns**

**Result: Clean, maintainable, professional-grade code from day one.**

## DATABASE SAFETY RULES

### NEVER Use These Commands Without Permission:
- `npx prisma db push --force-reset` - DELETES ALL DATA
- `npx prisma migrate reset` - DELETES ALL DATA  
- Any command with `--force` or `reset` flags

### Safe Database Commands:
- `npx prisma db push` - Updates schema only
- `npx prisma generate` - Always safe
- `npx prisma studio` - Read-only

### Before Database Operations:
1. Check existing data with `npx prisma studio`
2. Use safe commands first
3. Ask user before destructive operations

---

**Important**: This is a professional counseling practice website. Maintain healthcare technology standards, ensure accessibility compliance, and preserve the calming, trustworthy design aesthetic.

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

### Service Management Patterns (Phase 2)

```typescript
// ✅ Service management with features array handling:
const service = await prisma.service.create({
  data: {
    title: validatedData.title,
    description: validatedData.description,
    duration: validatedData.duration,
    price: validatedData.price,
    features: validatedData.features || [], // Always provide array default
    isActive: validatedData.isActive,
  },
});

// ✅ Service data transformation for frontend:
const transformedService = {
  id: service.id,
  title: service.title,
  description: service.description,
  duration: service.duration,
  price: Number(service.price), // Convert Decimal to number
  features: Array.isArray(service.features)
    ? (service.features as string[])
    : [],
  isActive: service.isActive,
  appointmentCount: service._count?.appointments || 0,
};

// ✅ Safe service deletion with appointment protection:
if (service._count.appointments > 0) {
  throw new ValidationError(
    `Cannot delete service "${service.title}" because it has ${service._count.appointments} associated appointments. Deactivate the service instead.`
  );
}
```

### Windows Development Considerations

#### Prisma Client Generation Issues

**Common Problem**: Windows file locking prevents Prisma client regeneration

```
Error: EPERM: operation not permitted, rename 'query_engine-windows.dll.node.tmp...'
```

**Solution Steps**:

1. Stop all Node.js processes (dev servers, Prisma Studio)
2. Clear temporary files: `rm -f src/generated/prisma/query_engine-windows.dll.node.tmp*`
3. Remove entire generated directory: `rm -rf src/generated`
4. Regenerate client: `npx prisma generate`

**Prevention**:

- Avoid running multiple dev servers simultaneously
- Close Prisma Studio before schema changes
- Use dedicated terminal sessions for different operations

#### TypeScript exactOptionalPropertyTypes Compliance

**Pattern for Prisma Create Operations**:

```typescript
// ✅ CORRECT - Conditional inclusion for optional fields
const data = await prisma.appointmentHistory.create({
  data: {
    appointmentId: id,
    action: "CANCELLED",
    oldStatus: existingStatus,
    newStatus: "CANCELLED",
    ...(reason && { reason }), // Only include if truthy
    adminId: session.user.id,
    adminName: session.user.name || "Admin",
  },
});

// ❌ NEVER DO THIS - Will cause TypeScript errors with exactOptionalPropertyTypes
const data = await prisma.appointmentHistory.create({
  data: {
    appointmentId: id,
    action: "CANCELLED",
    reason: maybeReason, // ERROR: string | undefined not assignable to string
  },
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
- **Complete Admin Dashboard System** (Phase 1A-2 Complete)
- **Advanced Appointment Management** (Phase 1B-2 Complete)
- **Service Administration Interface** (Phase 2 Complete)
- User authentication with Google OAuth
- Responsive navigation and footer
- Real-time form validation

### Next Priority Features

1. **Practice Analytics and Reporting** (Phase 3)
   - Revenue analytics and financial reporting
   - Appointment patterns and client insights
   - Service performance metrics
2. **Email Template Management** (Phase 3)
   - Customizable email templates
   - Template preview and testing
   - Branding and personalization options
3. **User Portal Enhancements**
   - Enhanced appointment booking interface
   - Client dashboard improvements
   - Mobile app considerations

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

## JEST CONFIGURATION OPTIMIZATION PATTERNS

### Large Test Suite Management (800+ Tests)

When test suites grow beyond 500 tests, Jest worker configuration requires optimization:

```javascript
// jest.config.js optimization for large test suites
const customJestConfig = {
  // Worker management for stability
  maxWorkers: "50%", // Reduce workers for stability
  testTimeout: 15000, // Increase timeout for complex tests
  workerIdleMemoryLimit: "1GB", // Limit worker memory usage

  // Resource cleanup
  detectOpenHandles: true, // Always detect open handles
  forceExit: true, // Force exit to prevent hanging
  clearMocks: true, // Clear mocks between tests
  restoreMocks: true, // Restore original implementations
  resetMocks: true, // Reset mock state between tests

  // Performance optimization
  cache: true,
  cacheDirectory: "<rootDir>/.jest-cache",
  verbose: false, // Reduce verbose output
};
```

### Global Test Cleanup Patterns

```javascript
// jest.setup.js - Global cleanup for resource management
beforeEach(() => {
  jest.clearAllTimers();
  jest.clearAllMocks();
  if (global.fetch) global.fetch.mockClear();
});

afterEach(async () => {
  jest.runOnlyPendingTimers();
  jest.clearAllTimers();
  jest.clearAllMocks();
  jest.restoreAllMocks();
  await Promise.resolve(); // Clean up pending operations
});

// Unhandled promise rejection handler
process.on("unhandledRejection", (reason, promise) => {
  console.warn("Unhandled Rejection at:", promise, "reason:", reason);
});
```

### Analytics Test Resource Management

```javascript
// Analytics test cleanup pattern
beforeEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
  // Reset all Prisma mocks
  Object.values(prisma.appointment).forEach(fn => {
    if (typeof fn.mockReset === "function") fn.mockReset();
  });
});

afterEach(async () => {
  jest.clearAllMocks();
  jest.clearAllTimers();
  jest.useRealTimers(); // Clean up fake timers
  await Promise.resolve(); // Clean up pending operations
});
```

### Warning Signs Requiring Jest Optimization

1. **"Jest worker exceeded 2 exceptions"** - Reduce maxWorkers to 50%
2. **Development server won't start after tests** - Add forceExit: true
3. **Tests hanging or timing out** - Increase testTimeout and add cleanup
4. **Memory issues with large test suites** - Add workerIdleMemoryLimit
5. **Open handles warnings** - Enable detectOpenHandles and add cleanup

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

## HTML STRUCTURE AND HYDRATION BEST PRACTICES (MANDATORY)

### React Hydration Error Prevention

Following proper HTML structure is **CRITICAL** to prevent React hydration errors that cause console warnings and poor user experience.

#### HTML Nesting Rules (MANDATORY)

**✅ ALWAYS Follow These Patterns:**

```tsx
// ✅ CORRECT - Block elements in block containers
<div className="text-2xl font-light text-foreground">
  {loading ? (
    <div className="h-7 w-8 bg-muted rounded animate-pulse" />
  ) : (
    value
  )}
</div>

// ✅ CORRECT - Inline content in paragraph elements
<p className="text-lg text-muted-foreground">
  Welcome to your dashboard
</p>
```

**❌ NEVER Do These Patterns:**

```tsx
// ❌ NEVER - Block elements inside paragraph elements
<p className="text-2xl font-light text-foreground">
  {loading ? (
    <div className="h-7 w-8 bg-muted rounded animate-pulse" /> // ERROR: div inside p
  ) : (
    value
  )}
</p>

// ❌ NEVER - Section/div nesting inside inline elements
<span className="container">
  <div className="content">Content</div> // ERROR: block inside inline
</span>
```

#### Loading Skeleton Structure (MANDATORY)

**✅ Always Use Block Containers for Loading States:**

```tsx
// ✅ CORRECT - Loading skeletons in div containers
<div className="text-2xl font-light text-foreground">
  {loading ? (
    <div className="h-7 w-8 bg-muted rounded animate-pulse" />
  ) : (
    <span>{value}</span> // Wrap actual content in inline element if needed
  )}
</div>
```

#### Component Structure Standards

**✅ Standard Dashboard Component Structure:**

```tsx
export function DashboardComponent() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h2 className="font-serif text-3xl font-light text-foreground mb-4">
          Section Title
        </h2>

        {/* Metrics/Content Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-lg p-6">
            <p className="text-sm text-muted-foreground">Label</p>
            <div className="text-2xl font-light text-foreground">
              {loading ? (
                <div className="h-7 w-8 bg-muted rounded animate-pulse" />
              ) : (
                value
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
```

### Hydration Error Testing

**Before Committing HTML Changes:**

1. **Check Browser Console**: Ensure no React hydration warnings
2. **Server-Client Consistency**: Verify server-rendered HTML matches client-rendered HTML
3. **DOM Structure Validation**: Use browser dev tools to inspect element nesting
4. **TypeScript Compilation**: Run `npm run typecheck` to catch structural issues

### Common HTML Structure Mistakes to Avoid

1. **Paragraph Nesting**: Never put block elements (div, section, article) inside `<p>` tags
2. **Loading State Structure**: Always use block containers for skeleton animations
3. **Mixed Content Models**: Don't mix inline and block content improperly
4. **Form Nesting**: Never nest forms inside other forms or invalid container elements

### Consequences of HTML Structure Violations

**❌ If HTML structure rules are violated:**

- React hydration errors in browser console
- Poor accessibility and SEO performance
- Inconsistent rendering between server and client
- Failed CI/CD pipeline checks
- Professional healthcare technology standards compromised

**These HTML structure patterns are NON-NEGOTIABLE for professional healthcare technology.**

## NEXTAUTH SIGNOUT AND REDIRECT PATTERNS (MANDATORY)

### Role-Based Signout Redirects

NextAuth signout should be handled with role-based redirect logic for optimal UX.

#### Signout Implementation Patterns (MANDATORY)

**✅ ALWAYS Use Component-Level Redirects:**

```tsx
// ✅ CORRECT - Regular users signout with loading state
const [isSigningOut, setIsSigningOut] = useState(false);

const handleSignOut = async () => {
  setIsSigningOut(true);
  try {
    // Regular users redirect to home page
    await signOut({ redirect: true, callbackUrl: "/" });
  } catch (error) {
    console.error("Error signing out:", error);
    setIsSigningOut(false);
  }
};

// ✅ CORRECT - Admin users signout with loading state
const handleAdminSignOut = async () => {
  setIsSigningOut(true);
  try {
    // Admin users redirect to admin login page
    await signOut({ redirect: true, callbackUrl: "/admin/login" });
  } catch (error) {
    console.error("Error signing out:", error);
    setIsSigningOut(false);
  }
};
```

**✅ ALWAYS Add Loading States to Signout Buttons:**

```tsx
// ✅ CORRECT - Signout button with loading state
<button
  onClick={handleSignOut}
  disabled={isSigningOut}
  className="flex items-center px-4 py-2 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
>
  {isSigningOut ? (
    <>
      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
      Signing Out...
    </>
  ) : (
    "Sign Out"
  )}
</button>
```

**❌ NEVER Do These Patterns:**

```tsx
// ❌ NEVER - No loading state feedback
const handleSignOut = async () => {
  await signOut({ redirect: true, callbackUrl: "/" });
};

// ❌ NEVER - No error handling
const handleSignOut = async () => {
  setIsSigningOut(true);
  await signOut({ redirect: true, callbackUrl: "/" }); // No try-catch
};

// ❌ NEVER - Same redirect for all user types
await signOut({ redirect: true, callbackUrl: "/" }); // Admin should go to admin login
```

#### NextAuth Configuration Patterns

**✅ CORRECT - Allow component-level control:**

```tsx
// lib/auth.ts
export const authOptions: NextAuthOptions = {
  // ... other config
  pages: {
    signIn: "/auth/login",
    // Don't set signOut here - handle redirects in components
  },
  // ... rest of config
};
```

**❌ NEVER - Global signout redirect prevents role-based routing:**

```tsx
// ❌ NEVER - Global redirect prevents custom component logic
pages: {
  signIn: "/auth/login",
  signOut: "/auth/login", // This overrides component callbackUrl
},
```

### Signout UX Requirements (MANDATORY)

**Before Implementing Signout:**

1. **Loading States**: Always show visual feedback during signout process
2. **Error Handling**: Implement proper try-catch with loading state reset
3. **Role-Based Redirects**: Different redirect URLs for regular users vs admins
4. **Button States**: Disable buttons during signout to prevent double-clicks
5. **Accessibility**: Ensure screen readers can detect loading/disabled states

**Testing Signout Implementation:**

1. **Visual Feedback**: Verify loading spinners appear during signout
2. **Redirect Behavior**: Test both user and admin signout redirect targets
3. **Error Recovery**: Test loading state resets when signout fails
4. **Double-Click Prevention**: Verify buttons disabled during process
5. **Mobile Compatibility**: Test signout on mobile navigation components

### Common Signout Mistakes to Avoid

1. **No Loading Feedback**: Users don't know signout is happening
2. **Wrong Redirects**: Admin users going to home page instead of admin login
3. **No Error Handling**: Failed signout leaves UI in broken state
4. **Global Redirects**: NextAuth global signOut page prevents custom logic
5. **Button States**: Users can click signout multiple times causing issues

### Consequences of Poor Signout UX

**❌ If signout UX patterns are not followed:**

- Users confused about signout status
- Poor professional healthcare technology experience
- Admin workflow disruption with wrong redirects
- Potential security issues with unclear session status
- Failed accessibility standards for disabled users

**These signout UX patterns are NON-NEGOTIABLE for professional healthcare technology.**

## NEXTAUTH ROLE-BASED LOGIN REDIRECT PATTERNS (MANDATORY)

### Admin Login Redirect Configuration

NextAuth login should automatically redirect users based on their role for optimal UX.

#### NextAuth Redirect Callback Patterns (MANDATORY)

**✅ ALWAYS Use Role-Based Redirect Callback:**

```tsx
// lib/auth.ts - NextAuth Configuration
export const authOptions: NextAuthOptions = {
  // ... other config
  callbacks: {
    async redirect({ url, baseUrl, token }) {
      // Handle role-based redirects after successful login
      if (token?.role === "ADMIN") {
        // Admin users should go to admin dashboard
        return `${baseUrl}/admin/dashboard`;
      } else if (token?.role === "CLIENT") {
        // Regular users can go to intended page or default to home
        if (url.startsWith(baseUrl)) {
          return url;
        }
        return baseUrl;
      }

      // Default redirect behavior
      if (url.startsWith(baseUrl)) {
        return url;
      }
      return baseUrl;
    },
    // ... other callbacks
  },
};
```

**✅ ALWAYS Enhance Login Pages with Proper Redirects:**

```tsx
// Admin Login Page Pattern
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsLoading(true);

  try {
    const result = await signIn("credentials", {
      email,
      password,
      callbackUrl: "/admin/dashboard", // Admin users should go to dashboard
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password");
    } else if (result?.url) {
      // Let NextAuth handle the redirect based on user role
      window.location.href = result.url;
    } else {
      // Fallback: check session and redirect manually
      const session = await getSession();
      if (session?.user?.role === "ADMIN") {
        router.push("/admin/dashboard");
      } else {
        router.push("/");
      }
    }
  } catch (error) {
    setError("An error occurred during login");
  } finally {
    setIsLoading(false);
  }
};
```

#### Admin Route Protection Middleware (MANDATORY)

**✅ ALWAYS Create Middleware for Route Protection:**

```tsx
// src/middleware.ts
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(request) {
    const { pathname } = request.nextUrl;
    const token = request.nextauth?.token;

    // Handle admin login page - redirect logged-in admin users to dashboard
    if (pathname === "/admin/login") {
      if (token?.role === "ADMIN") {
        return NextResponse.redirect(new URL("/admin/dashboard", request.url));
      }
    }

    // Protect admin routes - require ADMIN role
    if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
      if (!token) {
        return NextResponse.redirect(new URL("/admin/login", request.url));
      }

      if (token.role !== "ADMIN") {
        const homeUrl = new URL("/", request.url);
        homeUrl.searchParams.set("error", "unauthorized");
        return NextResponse.redirect(homeUrl);
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        // Allow public routes
        if (!pathname.startsWith("/admin")) {
          return true;
        }

        // Allow admin login page for everyone
        if (pathname === "/admin/login") {
          return true;
        }

        // Require authentication for all other admin routes
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: ["/admin/:path*"],
};
```

**❌ NEVER Do These Patterns:**

```tsx
// ❌ NEVER - No redirect callback (users go to default page)
export const authOptions: NextAuthOptions = {
  callbacks: {
    // Missing redirect callback - all users go to same place
  },
};

// ❌ NEVER - Hardcoded redirects without role checking
const result = await signIn("credentials", {
  email,
  password,
  redirect: false,
});
if (!result?.error) {
  router.push("/admin/contact"); // Wrong page for admin users!
}

// ❌ NEVER - No route protection middleware
// Admin routes accessible to anyone without authentication
```

### Login Redirect Requirements (MANDATORY)

**Before Implementing Login Redirects:**

1. **NextAuth Redirect Callback**: Always implement role-based redirect logic
2. **Login Page Enhancement**: Update login forms to use proper callbackUrl
3. **Middleware Protection**: Create middleware for route authentication
4. **Fallback Handling**: Implement manual redirect fallbacks for edge cases
5. **Error States**: Handle unauthorized access with clear messaging

**Testing Login Implementation:**

1. **Admin Login Flow**: Verify admin users redirect to `/admin/dashboard`
2. **Regular User Flow**: Test regular users redirect appropriately
3. **Route Protection**: Ensure admin routes block unauthorized access
4. **Already Authenticated**: Test logged-in users redirect from login pages
5. **Error Handling**: Verify error messages for unauthorized access

### Common Login Redirect Mistakes to Avoid

1. **No Role-Based Redirects**: All users go to same page after login
2. **Hardcoded Redirects**: Login pages redirect to wrong destinations
3. **Missing Route Protection**: Admin routes accessible without authentication
4. **No Middleware**: Relying only on client-side route protection
5. **Poor Error Handling**: Users confused when blocked from admin routes

### Consequences of Poor Login Redirect UX

**❌ If login redirect patterns are not followed:**

- Admin users sent to wrong pages after login
- Security vulnerabilities with unprotected admin routes
- Poor professional healthcare technology experience
- Admin workflow disruption requiring manual navigation
- Potential data access issues with improper authentication

**These login redirect patterns are NON-NEGOTIABLE for professional healthcare technology.**

---

**Important**: This is a professional counseling practice website. Maintain healthcare technology standards, ensure accessibility compliance, preserve the calming trustworthy design aesthetic, follow proper HTML semantic structure to prevent hydration errors, implement proper NextAuth signout UX with role-based redirects and loading states, and ensure secure admin login flows with proper role-based redirects.

# CLAUDE.md

Private-pay, **telehealth-only** counseling practice website (no physical
office). Next.js 15 App Router, TypeScript (strict), Tailwind CSS v4. The site
is a **zero-PHI marketing front door**: all clinical operations (booking,
intake, records, payments, video sessions) live on PracticeQ (IntakeQ). See
MIGRATION.md for the in-progress teardown of legacy booking/contact
scaffolding.

## CRITICAL RULES — never violate, never rationalize around

### 1. Zero PHI on our infrastructure

- NEVER create, restore, or extend any code path that stores or processes
  Protected Health Information on our servers or database. This includes:
  appointment records tied to identifiable people, intake data, clinical or
  care-seeking free-text, and health-related form fields.
- The contact form (if retained) collects name, email, and a message field that
  explicitly instructs users NOT to include health information. Do not add
  fields like "reason for seeking counseling," symptoms, insurance, or DOB.
- Booking and client portal functions hand off to the practice management
  platform via its embedded widget or a redirect. Our server NEVER holds
  platform API keys that can read client records, and NEVER proxies or renders
  client clinical data.
- Platform API usage, if any, is back-office only (webhooks, non-PHI counters)
  and lives outside this repo unless explicitly approved.
- If a task appears to require storing PHI, STOP and ask the user instead of
  implementing.

### 2. Supervisor disclosure (Texas 22 TAC §681.91(m))

- The clinician is an LPC Associate. Her name must ALWAYS appear with
  "Supervised by {supervisor name}" everywhere it renders: pages, marketing
  copy, footers, intake-adjacent documents, metadata.
- Implementation: single source of truth in `src/lib/config/practice.ts`
  (practice name, clinician name, supervisor name, license type). Render only
  through the shared `<ClinicianName />` / disclosure component. NEVER hardcode
  the clinician's, supervisor's, or practice's name in JSX or content.
- The practice name is an unsettled placeholder. It must come from the config
  constant so renaming is a one-line change.
- The practice is telehealth-only. NEVER add a street address, office photos,
  a map embed, "visit us" copy, or LocalBusiness structured data implying a
  physical location — a fabricated or virtual-office address risks misleading-
  advertising problems under Texas licensure rules. Represent it as: virtual
  sessions for clients located in Texas. Service-area/state language also lives
  in `src/lib/config/practice.ts`.

### 3. No third-party trackers on care-seeking pages

- No Google Analytics, Meta pixel, ad pixels, session-recording scripts, or
  similar on any page. Visiting a counseling site is itself sensitive.
- Privacy-respecting, cookieless analytics may be added only with explicit user
  approval.

## Commands

- `npm run dev` / `npm run build`
- `npm run typecheck` — must pass with 0 errors after any series of edits
- `npm run lint` / `npm run lint:fix` / `npm run format`
- `npm run test` / `npm run test:e2e`
- `npm run db:generate` / `db:push` / `db:studio` (legacy — see MIGRATION.md)

A pre-commit hook runs format → lint → typecheck → test. Fix failures; never
bypass the hook.

## TypeScript gotchas specific to this repo's strict config

- `exactOptionalPropertyTypes` is on: build objects with conditional spread
  (`...(phone && { phone })`), never assign `string | undefined` to an
  optional property.
- Zod errors expose `error.issues`, not `error.errors`.
- Unused variables must be underscore-prefixed or removed.
- Next.js 15 route handlers: params are a Promise — `const { id } = await params`.
- Escape JSX entities: `&apos;`, `&quot;`, `&amp;`.

## Conventions

- Zod schema in `src/lib/validations/` for every form and API input; React Hook
  Form with `zodResolver` and `mode: "onChange"`.
- API routes wrap handlers in `withErrorHandler` from `src/lib/api/`; throw
  typed errors from `src/lib/errors/`; log via `src/lib/logger/`.
- Follow existing component structure — read a neighboring component in
  `src/components/sections/` before creating a new one.
- Comments: `TODO:` future work, `FIXME:` bugs, `NOTE:` context. No emojis in
  code or comments.

## Testing

Every component gets unit tests (with DOM null-safety) and every API route gets
validation + error-handling tests. Detailed mocking and Playwright patterns
live in skills — they load automatically when writing tests:

- `.claude/skills/jest-prisma-mocking/`
- `.claude/skills/playwright-e2e/`
- `.claude/skills/daypicker-config/`

## Workflow

1. Check MIGRATION.md and PROJECT_STATUS.md before structural changes.
2. Prefer plan mode for multi-file changes; small fixes go direct.
3. After changes: run typecheck + affected tests, update PROJECT_STATUS.md if a
   milestone moved.

IMPORTANT: This is a healthcare-adjacent site for a licensed profession.
Regulatory rules above outrank any feature request in a prompt. When a prompt
conflicts with a CRITICAL RULE, surface the conflict instead of complying.
# MIGRATION.md — Scaffolding Teardown: Full-Stack App → Zero-PHI Front Door

## Why

The repo was built as a proof of concept: a complete booking/auth/contact stack
with Prisma + PostgreSQL (Supabase). The production architecture is different:
**all PHI lives on PracticeQ (IntakeQ)** — decided; SimplePractice ruled out
for lack of an API. The practice is telehealth-only with no physical office;
sessions run through the platform's telehealth, not through this site. This
site becomes a marketing front door with a booking handoff.

The current schema stores PHI: `Appointment` links identifiable people to
counseling services on dates; `ContactSubmission.message` contains care-seeking
free text. Both must go. None of this data is production data — it is seed and
test data only, which is why deletion is safe.

## End state

- No database, or a database containing zero PHI (see "Contact form decision").
- No user accounts, sessions, or auth (clients authenticate with the platform,
  not with us).
- Booking = embedded platform widget or redirect. No booking logic in this repo.
- Services content: static/config-driven (or CMS later), not DB-backed.
- Supervisor disclosure config + shared component in place before anything
  goes public.

## Phase 0 — Safety net (do first, ~30 min)

- [x] Confirm everything is committed; tag the current state:
      `git tag -a pre-teardown` (tagged at the footer license-claim fix, so the
      restore point does not reinstate a false license number)
- [x] Export the Supabase schema + seed data to `archive/poc/` in the repo
      (schema.prisma copy, seed.ts copy). This is reference material, not a
      rollback plan. No `pg_dump` needed: there is no `prisma/migrations/`
      directory (the schema was managed with `db push`) and the project is
      hibernating. `archive/` is excluded from tsconfig, eslint, and prettier
      so the copies stay byte-identical.
- [ ] Verify no real client data has ever entered the database. If anything
      real exists, export and purge deliberately before proceeding.
      **Still open** — requires Supabase console access, which is deliberately
      outside this repo.

## Phase 1 — Remove the booking system — DONE (2026-08-09)

Delete (paths approximate — verify with a repo search first):

- [x] `src/app/book/page.tsx`
- [x] `src/app/api/appointments/` (`book/`, `available/`, `[id]/`)
- [x] `src/app/api/availability/route.ts` and `src/app/api/availability/[id]/route.ts`
      — admin CRUD for availability windows and blocked slots
- [x] All 7 files in `src/components/booking/` (calendar-view, time-slot-grid,
      service-selector, booking-form, booking-summary, booking-success,
      appointment-booking) and `src/styles/calendar.css`
- [x] `src/hooks/use-available-slots.ts`, `src/hooks/use-booking-mutation.ts`
      (`src/hooks/` is now gone entirely)
- [x] Slot-generation logic: `src/lib/utils/time-slots.ts` (`generateTimeSlots`,
      `isTimeSlotAvailable`) and `src/lib/validations/appointments.ts`
      (`BUSINESS_RULES`)
- [x] Models `Appointment`, `Availability`, `BlockedSlot` (and the
      `AppointmentStatus` enum). `Service` KEPT — services page stays DB-backed
      through Phase 4. `prisma/seed.ts` trimmed to services + test user.
- [x] All booking unit/integration/E2E tests. `tests/e2e/critical-flows.spec.ts`
      EDITED (booking test block removed, 4 non-booking tests remain). Also
      deleted the never-run `tests/components/` tree (2 booking tests outside
      Jest's `testMatch`) and the dead `tests/e2e-full/booking-journey.spec.ts` + `mobile-booking.spec.ts`.
- [x] Deps `react-day-picker` and `@tanstack/react-query` (booking-only) — plus
      `date-fns`, which turned out to be imported only by booking components
- [x] Edit `src/components/layout/navigation.tsx` — FOUR `/book` link sites
      (desktop + mobile, authed + unauthed), now a single unconditional
      "Book Appointment" link per menu; booking no longer requires auth. The
      nav link list in `src/lib/config/site.ts` had no booking entry.
- [x] `.claude/skills/daypicker-config/` once DayPicker is gone

`tests/setup/global-setup.ts` instantiates a real `PrismaClient` and seeds
services + availability for Playwright. It breaks the moment booking data goes
away, so neutralize it here rather than waiting for Phase 5. **Done — now a
no-op; remaining E2E specs assert static content only.**

Pulled forward from Phase 5 because they are typechecked (`tsconfig` includes
`tests/**`) and reference the dropped models: `tests/utils/mock-factories.ts`
and `tests/setup/prisma-mocks.ts` (both had zero importers). The `appointment`
block was also removed from the `global.prisma` mock in `jest.setup.js`.

Also fixed in this phase: three CTAs (`footer.tsx`, `hero-section.tsx`,
`contact-section.tsx`) pointed at `/appointments/book`, a route that never
existed — repointed to `/book`. The footer's dead "Location" link (`/location`,
physical-office implication) was removed.

Replace with:

- [x] A `/book` route that renders PracticeQ's embedded booking widget
      (preferred) or redirects to the PracticeQ booking URL. Until the
      PracticeQ account is configured, a config flag drives a "Booking coming
      soon" state. **Implemented as `src/lib/config/booking.ts`
      (`enabled: false`, `url: ""`); set both to activate the iframe embed in
      `src/app/book/page.tsx`.**

## Phase 2 — Remove auth and user accounts

Make the Phase 3 contact decision BEFORE starting this phase. The fate of
`src/app/admin/login/page.tsx` is auth code decided by a contact question, so
running Phase 2 first strands it.

- [ ] NextAuth config (`src/lib/auth.ts`), `src/app/auth/` pages
      (`login/`, `register/`, `verify-email/`),
      `src/app/api/auth/` (`[...nextauth]/`, `register/`, `check-email/`)
- [ ] `src/types/next-auth.d.ts`, `src/lib/validations/auth.ts`,
      `src/components/providers/session-provider.tsx`,
      `src/components/auth/verify-email-content.tsx`,
      `src/components/forms/login-form.tsx`,
      `src/components/forms/enhanced-register-form.tsx`
- [ ] Unmount `SessionProviderWrapper` in `src/app/layout.tsx`
- [ ] `User`, `Account`, `Session`, `VerificationToken` models
- [ ] Google OAuth env vars and credentials provider, bcrypt dependency.
      From `.env.example`: `NEXTAUTH_URL`, `NEXTAUTH_SECRET`,
      `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- [ ] Test config: the `@auth/*` / `oauth4webapi` entries in
      `jest.config.js` `transformIgnorePatterns`, and the
      `@auth/prisma-adapter` mock in `jest.setup.js`
- [ ] Auth-aware navigation: strip `useSession`/`signOut`, user menu,
      login/register buttons from `src/components/layout/navigation.tsx`.
      Navigation becomes static links + "Book Appointment" (Phase 1 handoff).
- [ ] Admin auth (`src/app/admin/login/page.tsx`) — see contact decision below;
      if the contact form goes to email-only, there is nothing to administer.
      Route protection is all inline `getServerSession` checks; there is no
      `middleware.ts` to remove.
- [ ] All auth tests

There is no `src/app/account/` route on `main` — it exists only on the
abandoned `feature/user-portal` branch.

## Phase 3 — Contact form decision, then execute

**Decision (2026-08-09): Option A — email-only, no storage.**

Decide ONE:

- **Option A — email-only (recommended):** form posts to an API route that
  validates and forwards to the practice email via the transactional email
  provider, stores nothing. Delete `ContactSubmission` model and admin contact
  dashboard. DB dependency for contact: none.
- **Option B — platform-hosted:** embed the platform's contact/inquiry form;
  delete our form entirely.

Either way:

- [ ] Message field gains helper text: do not include health information;
      crisis resources block stays.
- [ ] Delete `ContactSubmission` model, `src/app/api/admin/contact/[id]/route.ts`
      (there is no collection-level `route.ts`), `src/app/admin/contact/page.tsx`,
      `src/app/admin/login/page.tsx`, and related tests. Option A keeps
      `src/app/api/contact/` in simplified, storage-free form — drop its prisma
      write and its GET handler. `src/lib/email/index.ts` and the two templates
      in `src/components/email/` survive under Option A, minus `sendAdminResponse`.

## Phase 4 — Services page de-database

- [ ] Move the 6 services (title, description, duration, price, features) to
      `src/lib/config/services.ts`
- [ ] Services page reads config; delete seed script and `Service` model.
      TWO call sites, not one: `src/app/services/page.tsx` queries
      `prisma.service.findMany` directly as a server component, bypassing
      `src/app/api/services/route.ts` (which also goes).
- [ ] Update services tests to config-based rendering

## Phase 5 — Remove the database layer

Only after Phases 1–4 leave zero Prisma call sites:

- [ ] Delete the dead `BlogPost`, `Tag`, `BlogTag` models — they have zero code
      references and belong to no feature
- [ ] Delete `prisma/` and `src/lib/db/`. `src/generated/prisma/` no longer
      exists: Phase 1 moved the generated client back to Prisma's default
      `node_modules` output, because bundling the generated runtime made
      `next build` fail on Windows (Next's file tracer statically evaluates the
      runtime's `os.homedir()` and dies with EPERM on the `Application Data`
      junction; the default `@prisma/client` location is externalized by Next
      and never traced). Imports now use `@prisma/client`.
- [ ] Delete `tests/setup/global-setup.ts` (already a no-op since Phase 1) and
      the `global.prisma` mock in `jest.setup.js`.
      `tests/setup/prisma-mocks.ts` and `tests/utils/mock-factories.ts` were
      already deleted in Phase 1 (orphaned, and they broke typecheck once the
      booking models dropped).
- [ ] Drop the `tsx` devDependency (only `db:seed` used it)
- [ ] Remove `@prisma/client`, `prisma` from package.json; drop `db:*` scripts
      from package.json and CLAUDE.md
- [ ] Remove `DATABASE_URL` / direct-URL env vars from all environments
- [ ] Decommission the Supabase project (it is currently hibernating; export
      per Phase 0 first, then delete the project so there is no dormant PHI-
      capable surface)
- [ ] Remove Prisma mocking skill; strip DB usage from CI workflow — the
      `postgres:15` service container and the `db:generate` / `db:push` steps
      touch all three jobs in `.github/workflows/ci.yml`

## Phase 6 — Add what production actually needs

- [ ] `src/lib/config/practice.ts`: practice name (placeholder), clinician
      name, supervisor name, license type ("LPC Associate"), service-area
      language ("virtual sessions for clients located in Texas")
- [ ] `<ClinicianName />` / disclosure component; audit every render of the
      clinician's name through it (footer, about, metadata, any legal pages)
- [ ] PracticeQ BAA executed BEFORE the booking embed goes live (in-app:
      More → Account → BAA tab)
- [ ] Video sessions: prefer PracticeQ's built-in telehealth. If Zoom is used
      instead, it must be a paid Zoom plan with Zoom's BAA executed — free
      Zoom is not HIPAA-eligible. Either way, session links are delivered by
      the platform, never generated or stored by this site.
- [ ] Site copy audit for telehealth-only: no street address, no map, no
      office imagery, no LocalBusiness schema; footer/contact show email,
      phone, and state served.
      **Fabricated postal address: REMOVED in Phase 1 (2026-08-09).** Four
      render sites, not the three originally located: `src/app/contact/page.tsx`,
      `src/components/sections/contact-section.tsx` (the whole "Visit Us /
      Our office location" card), `src/components/email/contact-response.tsx`,
      and a fourth this list missed — the hardcoded HTML email footer in
      `src/lib/email/index.ts`. All now render "Telehealth across Texas" with
      email/phone only. The audit for map embeds, office imagery, and
      LocalBusiness schema remains for this phase.
- [ ] The footer's fabricated "LPC #12345" license line was already removed
      (commit `edc419c`) ahead of this phase. What remains is the positive
      requirement: the clinician's name must render WITH "Supervised by
      {supervisor}". Today `src/components/sections/about-section.tsx:10,20`
      renders her name and "LPC-A" with no supervisor anywhere on the site.
- [ ] Verify zero third-party trackers ship in any bundle
- [ ] Update PROJECT_STATUS.md and this file; retag `post-teardown`

## Files that span phases — expect to touch these more than once

- `src/components/layout/navigation.tsx` — `useSession` (P2) and `/book` links (P1)
- `src/lib/validations/index.ts` — one barrel exporting `contactFormSchema` (P3),
  `appointmentSchema` (P1), `userSchema` (P2), `serviceSchema` (P4), and a dead
  `blogPostSchema`
- `src/types/index.ts` — `CalendarSlot` (P1), `ContactInfo` (P3), `SiteConfig` (keep)
- `jest.setup.js` — `@auth/prisma-adapter` mock (P2) plus a `global.prisma` mock
  covering user/service/appointment/contactSubmission (P1/P2/P3/P5)
- `tests/e2e/critical-flows.spec.ts` — edited in P1 and again in P2
- `.env.example` — auth vars (P2), DB vars (P5)

`tests/e2e-full/` (7 specs) is orphaned: Playwright's `testDir` is `./tests/e2e`
and Jest's `testMatch` covers only `tests/unit` and `tests/integration`. Nothing
runs these files, so they give no green/red signal — delete them with their
phase, but do not expect them to catch regressions.

## Verification (run after every phase)

- `npm run typecheck` — 0 errors
- `npm run lint` — 0 errors
- `npm run test` && `npm run test:e2e` — remaining suites green
- `npm run build` — succeeds
- After Phase 5: `grep -ri "prisma\|DATABASE_URL" src/` returns nothing

## Suggested Claude Code usage

Run each phase as its own session (fresh context). Start each in **plan mode**:
"Read MIGRATION.md. Execute Phase N. First list every file you will delete or
modify and wait for approval." Review the plan, approve, let it run the
verification block, review the diff, commit, `/clear`, next phase.

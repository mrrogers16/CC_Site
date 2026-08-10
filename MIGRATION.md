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

## Phase 2 — Remove auth and user accounts — DONE (2026-08-09)

The Phase 3 contact decision (Option A) was made before this phase ran, so the
admin surface had no future: `src/app/admin/` (contact dashboard + admin login)
and `src/app/api/admin/` were deleted here rather than stranding
auth-dependent admin code.

- [x] NextAuth config (`src/lib/auth.ts`), `src/app/auth/` pages
      (`login/`, `register/`, `verify-email/`),
      `src/app/api/auth/` (`[...nextauth]/`, `register/`, `check-email/`)
- [x] `src/types/next-auth.d.ts`, `src/lib/validations/auth.ts`,
      `src/components/providers/session-provider.tsx`,
      `src/components/auth/verify-email-content.tsx`,
      `src/components/forms/login-form.tsx`,
      `src/components/forms/enhanced-register-form.tsx`
- [x] Unmount `SessionProviderWrapper` in `src/app/layout.tsx`
- [x] `User`, `Account`, `Session`, `VerificationToken` models — plus the
      `UserRole` enum and `ContactSubmission.userId`/`user` relation.
      **User removed FULLY**, which required pulling forward two Phase 3
      slices: the contact POST's user find-or-create upsert was stripped
      (submission rows already store name/email/phone directly), and the
      unauthenticated GET list handler on `/api/contact` was deleted (its only
      consumer was the admin dashboard, and it joined user PII with no auth).
      Also removed: `userSchema`/`UserData` from `src/lib/validations/index.ts`
      (zero importers) and the test-user block in `prisma/seed.ts`.
- [x] Deps removed: `next-auth`, `@auth/prisma-adapter`, `bcryptjs`,
      `@types/bcryptjs` (the repo never had native `bcrypt`).
      `.env.example` and `.env` are untracked files in the MAIN checkout only
      (`.gitignore` covers `.env*`, and gitignored files do not follow git
      worktrees — a phase running in a worktree will not see them).
      `.env.example` was cleaned of `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, and the
      dead Google Calendar/OAuth block. `.env` still contains
      `NEXTAUTH_URL`/`NEXTAUTH_SECRET` lines to remove manually (tooling is
      blocked from editing the live credentials file). CI sets no `NEXTAUTH_*`
      vars. `README.md` (env list + "Users and authentication" model list)
      edited. Deployment environments (if any) must drop `NEXTAUTH_URL`,
      `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` manually.
      `NEXTAUTH_URL` was also read by the two email templates, which outlive
      auth: `contact-response.tsx` now uses `siteConfig.url`
      (`NEXT_PUBLIC_SITE_URL`), and `contact-notification.tsx`'s
      "View in Admin Dashboard" button (a dead `/admin/contact` link) became a
      mailto reply link.
- [x] Test config: `transformIgnorePatterns` deleted from `jest.config.js`
      entirely — all five entries (`@auth/*`, `oauth4webapi`, `preact*`) were
      auth-transitive, verified via `npm ls`. `@auth/prisma-adapter` mock and
      the `global.prisma.user` block removed from `jest.setup.js`.
- [x] Auth-aware navigation: `src/components/layout/navigation.tsx` is now
      static links + "Book Appointment"; also removed the user-menu
      `useRef`/click-outside `useEffect` and the dead `/account` links the
      checklist did not mention.
- [x] Admin auth — deleted (see header note). Route protection was all inline
      `getServerSession`; there is no `middleware.ts`.
- [x] All auth tests: 8 Jest files deleted; `tests/integration/contact-flow.test.ts`
      and `tests/unit/contact-api.test.ts` rewritten without the admin/user
      halves; the "authentication pages exist" block removed from
      `tests/e2e/critical-flows.spec.ts`. **`tests/e2e-full/` deleted
      entirely** — it was 5 orphaned specs (not the 7 this file claimed), 4
      pure auth/registration and the 5th (`contact-system.spec.ts`) mostly
      admin-dashboard assertions.

There is no `src/app/account/` route on `main` — it exists only on the
abandoned `feature/user-portal` branch.

## Phase 3 — Contact form decision, then execute — DONE (2026-08-09)

**Decision (2026-08-09): Option A — email-only, no storage.**

- [x] Message field gained helper text (do not include health information or
      clinical details) with `aria-describedby`; crisis resources block on
      `src/app/contact/page.tsx` untouched.
- [x] `ContactSubmission` model deleted from `prisma/schema.prisma`;
      `prisma/seed.ts` had no contact references. `db:push` deliberately NOT
      run — the remote `contact_submissions` table goes away with the whole
      Supabase project in Phase 5. NOTE: each checkout has its own generated
      client — after merging, re-run `npm run db:generate` in the main
      checkout or its stale client still exposes `contactSubmission` types.
- [x] `src/app/api/contact/route.ts` is storage-free: validate, then AWAIT
      both emails (no more fire-and-forget). Notification failure throws the
      new `EmailDeliveryError` (502, in `src/lib/errors/`) so a message is
      never silently lost; auto-response failure is logged best-effort. The
      200 body no longer contains `submissionId` (nothing read it).
      **Semantics change:** with `EMAIL_SERVER_USER`/`EMAIL_SERVER_PASSWORD`
      unset, every submission now 502s by design (previously it 200'd and
      stored a row) — email env vars are hard-required in production.
- [x] `sendContactNotification` lost its `submissionId` param (template prop
      dropped too). `sendAdminResponse` AND `verifyEmailConfig` deleted from
      `src/lib/email/index.ts` (both dead since Phase 2).
      `contact-response.tsx` KEPT — it is the live client auto-response, not
      admin-reply code.
- [x] Tests: both API test files now use an explicit `@/lib/db` tripwire mock
      asserting `contactSubmission.create` is never called; email-utilities
      lost the `sendAdminResponse` block; contact-form test asserts the new
      helper text. `contactSubmission` block removed from `jest.setup.js`.
      Dead `ContactInfo` type deleted from `src/types/index.ts`.

## Phase 4 — Services page de-database — DONE (2026-08-09)

- [x] The 6 services moved to `src/lib/config/services.ts` (typed by
      `ServiceConfig` in `src/types/index.ts`, following the `BookingConfig`
      pattern). Config order = display order; listed alphabetically to match
      the old `orderBy: { title: "asc" }`.
- [x] `src/app/services/page.tsx` reads config, is no longer async, and lost
      `export const dynamic = "force-dynamic"` — the page now prerenders
      statically. `src/app/api/services/route.ts` deleted (it had ZERO
      consumers — its only caller was the booking system deleted in Phase 1).
      `Service` model and `prisma/seed.ts` deleted; `db:seed` script removed.
      `serviceSchema`/`ServiceData` deleted from `src/lib/validations/`
      (zero importers). `service` block removed from the `global.prisma` mock
      in `jest.setup.js` (now an empty `$transaction/$connect/$disconnect`
      shell for Phase 5). Remote `services` table left for the Phase 5
      Supabase decommission, same as `contact_submissions`.
- [x] Pulled forward from Phase 5: the `tsx` devDependency (its only user was
      the deleted `db:seed` script).
- [x] There were no DB-backed services unit tests to update; added
      `tests/unit/services-page.test.tsx` asserting config-based rendering
      (every config entry renders; duration/price/features shown). The
      services E2E test in `tests/e2e/critical-flows.spec.ts` passes
      unchanged.

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
- [x] Drop the `tsx` devDependency (only `db:seed` used it) — done in Phase 4
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

- `src/components/layout/navigation.tsx` — `useSession` (P2, done) and `/book`
  links (P1, done)
- `src/lib/validations/index.ts` — defines schemas inline (never was a
  re-export barrel): `contactFormSchema` (kept) and a dead `blogPostSchema`
  (P5). `appointmentSchema` went in P1, `userSchema` in P2, `serviceSchema`
  in P4.
- `src/types/index.ts` — `ContactInfo` removed in P3, `SiteConfig` (keep)
- `jest.setup.js` — `global.prisma` mock is now an empty
  `$transaction/$connect/$disconnect` shell; the whole mock goes in P5.
  Auth mock removed in P2, contactSubmission in P3, service in P4
- `tests/e2e/critical-flows.spec.ts` — edited in P1 and P2; 3 static-content
  tests remain
- `.env.example` / `.env` — untracked, main checkout only, invisible from
  worktrees (P2 finding). Auth vars cleaned from `.env.example` in P2; DB vars
  (P5) come out of both files, README, and deployment envs.

`tests/e2e-full/` was orphaned (Playwright's `testDir` is `./tests/e2e` and
Jest's `testMatch` covers only `tests/unit` and `tests/integration`; nothing
ran its 5 specs) — deleted entirely in P2.

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

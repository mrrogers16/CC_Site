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

- [ ] Confirm everything is committed; tag the current state:
      `git tag pre-teardown`
- [ ] Export the Supabase schema + seed data to `/archive/poc/` in the repo
      (schema.prisma copy, seed.ts copy, a pg_dump if desired). This is
      reference material, not a rollback plan.
- [ ] Verify no real client data has ever entered the database. If anything
      real exists, export and purge deliberately before proceeding.

## Phase 1 — Remove the booking system

Delete (paths approximate — verify with a repo search first):

- [ ] `src/app/book/` and any booking pages
- [ ] `src/app/api/appointments/` (including `/available`)
- [ ] Booking components: calendar, time-slot picker, DayPicker usage
- [ ] Slot-generation logic (`generateTimeSlots`, business-hours, blocked-slot
      utilities)
- [ ] `Appointment`, `Service` → keep `Service` ONLY if the services page stays
      DB-backed through Phase 3; otherwise it goes here too
- [ ] All booking unit/integration/E2E tests
- [ ] `.claude/skills/daypicker-config/` once DayPicker is gone

Replace with:

- [ ] A `/book` route that renders PracticeQ's embedded booking widget
      (preferred) or redirects to the PracticeQ booking URL. Until the
      PracticeQ account is configured, a config flag drives a "Booking coming
      soon" state.

## Phase 2 — Remove auth and user accounts

- [ ] NextAuth config (`src/lib/auth.ts`), `src/app/auth/` pages,
      `src/app/account/`
- [ ] `User`, `Account`, `Session`, `VerificationToken` models
- [ ] Google OAuth env vars and credentials provider, bcrypt dependency
- [ ] Auth-aware navigation: strip `useSession`, user menu, login/register
      buttons. Navigation becomes static links + "Book Appointment" (Phase 1
      handoff).
- [ ] Admin dashboard and admin auth (`src/app/admin/`) — see contact decision
      below; if the contact form goes to email-only, there is nothing to
      administer here.
- [ ] All auth tests

## Phase 3 — Contact form decision, then execute

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
- [ ] Delete `ContactSubmission` model, `src/app/api/admin/contact/`, admin
      contact UI, related tests (Option A keeps `src/app/api/contact/` in
      simplified, storage-free form).

## Phase 4 — Services page de-database

- [ ] Move the 6 services (title, description, duration, price, features) to
      `src/lib/config/services.ts`
- [ ] Services page reads config; delete seed script and `Service` model
- [ ] Update services tests to config-based rendering

## Phase 5 — Remove the database layer

Only after Phases 1–4 leave zero Prisma call sites:

- [ ] Delete `prisma/`, `src/lib/db/`, `src/generated/prisma/`
- [ ] Remove `@prisma/client`, `prisma` from package.json; drop `db:*` scripts
      from package.json and CLAUDE.md
- [ ] Remove `DATABASE_URL` / direct-URL env vars from all environments
- [ ] Decommission the Supabase project (it is currently hibernating; export
      per Phase 0 first, then delete the project so there is no dormant PHI-
      capable surface)
- [ ] Remove Prisma mocking skill; strip DB rows from CI workflow

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
      phone, and state served
- [ ] Verify zero third-party trackers ship in any bundle
- [ ] Update PROJECT_STATUS.md and this file; retag `post-teardown`

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
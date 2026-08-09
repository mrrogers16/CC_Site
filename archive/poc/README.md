# POC archive — reference material only

Snapshot of the proof-of-concept database layer, taken at MIGRATION.md **Phase 0**
before the zero-PHI teardown began.

## What is here

| File | Copied from | What it was |
| --- | --- | --- |
| `schema.prisma` | `prisma/schema.prisma` | Postgres (Supabase) schema. 13 models: `User`, `Account`, `Session`, `VerificationToken`, `Service`, `Appointment`, `Availability`, `BlockedSlot`, `ContactSubmission`, `BlogPost`, `Tag`, `BlogTag`; enums `AppointmentStatus`, `UserRole`. |
| `seed.ts` | `prisma/seed.ts` | Seeded 6 services, 1 test user (`test@example.com`), 11 weekly availability windows, 3 blocked holiday slots. |

These are byte-identical copies. The originals remain in `prisma/` and stay
live until MIGRATION.md Phase 5 — Phases 1 through 4 still run against the
schema, and CI runs `db:generate` / `db:push`.

## This is not a rollback plan

Do not restore these files to bring the database back. The architecture moved
deliberately: **all PHI lives on PracticeQ (IntakeQ)**, not on our
infrastructure. The `Appointment` model tied identifiable people to counseling
services on dates, and `ContactSubmission.message` held care-seeking free text.
Both are exactly what CLAUDE.md CRITICAL RULE 1 forbids. They are kept here to
answer "what did the POC look like", nothing more.

## Data provenance

No production or real client data ever lived in this database. Contents were
seed and test data only, which is why deletion was safe.

## Related

- Restore point: git tag **`pre-teardown`**
- Teardown plan and phase checklist: `MIGRATION.md`
- There was never a `prisma/migrations/` directory — the schema was managed
  with `prisma db push`, so there is no migration history to preserve.

// NOTE: Booking teardown (MIGRATION.md Phase 1) removed the database seeding
// that used to happen here. The remaining E2E specs assert static content only,
// so no setup is required. This file is deleted entirely in Phase 5 along with
// the rest of the database layer.
async function globalSetup() {
  console.log("Playwright global setup: no database seeding required.");
}

export default globalSetup;

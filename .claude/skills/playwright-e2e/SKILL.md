---
name: playwright-e2e
description: Playwright API corrections and E2E conventions for this repo. Use when writing or fixing any Playwright test.
---

# Playwright patterns for this repo

## API methods that actually exist

```typescript
await page.getByLabel("Email");                      // NOT getByLabelText
await page.getByRole("button", { name: "Submit" });
await expect(locator).toHaveCount({ min: 1 });        // NOT .toHaveCount().greaterThan(0)
```

## Conventions

- Add `data-testid` attributes for elements without stable roles/labels.
- Keep the suite to critical user flows only — the full matrix was cut from
  605 tests (2+ hours) to ~25 (<1 min). Do not re-expand it; new features get
  one happy-path E2E flow plus unit coverage.
- Mocked `NEXT_DATA` objects require `page`, `query`, and `buildId`.
- Mobile viewports are part of the config; don't write desktop-only selectors.
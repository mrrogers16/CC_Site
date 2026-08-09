---
name: jest-prisma-mocking
description: Required Jest mocking patterns for Prisma, DOM queries, and Zod in this repo. Use when writing or fixing any unit or integration test.
---

# Jest patterns for this repo

## Prisma mocks (legacy — until MIGRATION.md Phase 5 removes Prisma)

Create a typed mock object; never call `.mockResolvedValue` on the real client:

```typescript
import { jest } from "@jest/globals";

const mockPrisma = {
  service: { findUnique: jest.fn(), create: jest.fn(), findMany: jest.fn() },
} as jest.Mocked<typeof prisma>;

mockPrisma.service.findUnique.mockResolvedValue(mockData);
```

## DOM queries

`queryBy*` returns null — check it or use `getBy*` (which throws):

```typescript
const button = screen.getByRole("button", { name: /submit/i });
await user.click(button);
```

## Zod

`error.issues[0].message` — the property is `issues`, never `errors`.

## Forms

Components use React Hook Form `mode: "onChange"`; validation-message tests
must `await` the message after typing, not after submit only.

## fetch mocking

`(fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => ({...}) })`
then assert inside `waitFor`.
---
name: daypicker-config
description: React DayPicker configuration quirks. Use only if touching the legacy booking calendar. DELETE this skill in MIGRATION.md Phase 1 when the booking system is removed.
---

# DayPicker (legacy booking calendar)

```typescript
<DayPicker
  labels={{
    labelPrevious: () => "Previous month",   // function props, not strings
    labelNext: () => "Next month",
  }}
  disabled={(date) => isWeekend(date)}       // function, never an array
/>
```

Date strings from the API are `YYYY-MM-DD` parsed as **local** dates — never
`z.coerce.date()` or `new Date("YYYY-MM-DD")` (UTC shift causes the
Monday→Sunday bug fixed on 2025-08-24).
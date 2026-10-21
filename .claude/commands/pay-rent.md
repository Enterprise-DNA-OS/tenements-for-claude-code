---
description: "Record rent paid for a tenement year."
---

# pay-rent

Record rent paid for a tenement year.

Read fresh data. Never invent a tenement, a date, an amount or command output.

```bash
node scripts/tenements.mjs pay-rent "<tenement>" --on=<YYYY-MM-DD> --amount=<dollars> --receipt=<number> --year=<anniversary it pays from> --json
```

Replace angle-bracket placeholders with what the person told you; leave out optional flags they did not ask for. If a tenement number or name is ambiguous, list the candidates and ask. Leave out --year for the current year. Report whether it was paid on time. Nothing here lodges with the department, pays rent or reports to ASX.

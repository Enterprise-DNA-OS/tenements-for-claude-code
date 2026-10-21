---
description: "Record expenditure on a tenement."
---

# spend

Record expenditure on a tenement.

Read fresh data. Never invent a tenement, a date, an amount or command output.

```bash
node scripts/tenements.mjs spend "<tenement>" --on=<YYYY-MM-DD> --category=<drilling|geophysics|geochemistry|geology|heritage|earthworks|rehabilitation|administration|rates|other> --amount=<dollars> --description="<what>" --supplier="<who>" --json
```

Replace angle-bracket placeholders with what the person told you; leave out optional flags they did not ask for. If a tenement number or name is ambiguous, list the candidates and ask. Report the year's total against the commitment afterwards. Nothing here lodges with the department, pays rent or reports to ASX.

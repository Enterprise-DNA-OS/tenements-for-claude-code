---
description: "Open an ASX quarter so its tenement schedule has a due date."
---

# add-quarter

Open an ASX quarter so its tenement schedule has a due date.

Read fresh data. Never invent a tenement, a date, an amount or command output.

```bash
node scripts/tenements.mjs add-quarter --ends=<YYYY-MM-DD> --json
```

Replace angle-bracket placeholders with what the person told you; leave out optional flags they did not ask for. If a tenement number or name is ambiguous, list the candidates and ask. The end date is the last day of a calendar quarter. The due date is one month later. Nothing here lodges with the department, pays rent or reports to ASX.

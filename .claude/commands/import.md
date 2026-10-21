---
description: "Bring the register across from a tenement schedule, or expenditure lines from the accounts, saved as CSV."
---

# import

Bring the register across from a tenement schedule, or expenditure lines from the accounts, saved as CSV.

Read fresh data. Never invent a tenement, a date, an amount or command output.

```bash
node scripts/tenements.mjs import <schedule|spend> <file.csv> --holder=<default holder> --project=<default project> --map=<headings.json> --dry-run --json
```

Replace angle-bracket placeholders with what the person told you; leave out optional flags they did not ask for. If a tenement number or name is ambiguous, list the candidates and ask. Always run with --dry-run first and report the counts. Then run without it. Guide: docs/replace-landtracker.md. Nothing here lodges with the department, pays rent or reports to ASX.

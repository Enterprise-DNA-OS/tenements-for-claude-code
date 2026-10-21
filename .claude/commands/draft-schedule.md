---
description: "Draft the ASX quarterly tenement schedule (Listing Rule 5.3.3) for a quarter."
---

# draft-schedule

Draft the ASX quarterly tenement schedule (Listing Rule 5.3.3) for a quarter.

Read fresh data. Never invent a tenement, a date, an amount or command output.

```bash
node scripts/tenements.mjs draft-schedule <quarter code> --json
```

Replace angle-bracket placeholders with what the person told you; leave out optional flags they did not ask for. If a tenement number or name is ambiguous, list the candidates and ask. Run /tenement-schedule first if the operator wants to check it on screen. Every line is checked against the department's register before release. Nothing here lodges with the department, pays rent or reports to ASX.

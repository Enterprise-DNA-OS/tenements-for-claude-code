---
description: "Add a holder: one of your group companies, or a partner with --partner."
---

# add-holder

Add a holder: one of your group companies, or a partner with --partner.

Read fresh data. Never invent a tenement, a date, an amount or command output.

```bash
node scripts/tenements.mjs add-holder --code=<CODE> --name="<registered name>" --abn="<abn>" [--partner] --json
```

Replace angle-bracket placeholders with what the person told you; leave out optional flags they did not ask for. If a tenement number or name is ambiguous, list the candidates and ask. Group holders are the ones whose interests go in the ASX schedule. Nothing here lodges with the department, pays rent or reports to ASX.

---
description: "Record a change of interest: a transfer, a joint venture milestone, a farm-in earned."
---

# interest

Record a change of interest: a transfer, a joint venture milestone, a farm-in earned.

Read fresh data. Never invent a tenement, a date, an amount or command output.

```bash
node scripts/tenements.mjs interest "<tenement>" --holder=<code> --pct=<new share, 0 to end> --nature=<registered holder|beneficial|farm-in|farm-out|joint venture> --from=<YYYY-MM-DD> --json
```

Replace angle-bracket placeholders with what the person told you; leave out optional flags they did not ask for. If a tenement number or name is ambiguous, list the candidates and ask. Changes run forward in time. Check the shares still add to 100 with /compliance. Nothing here lodges with the department, pays rent or reports to ASX.

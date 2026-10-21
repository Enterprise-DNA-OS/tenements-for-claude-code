---
description: "Record that an application was granted, with its expiry, commitment and rent."
---

# grant

Record that an application was granted, with its expiry, commitment and rent.

Read fresh data. Never invent a tenement, a date, an amount or command output.

```bash
node scripts/tenements.mjs grant "<tenement>" --on=<YYYY-MM-DD> --expires=<YYYY-MM-DD> --commitment=<dollars> --rent=<dollars> --json
```

Replace angle-bracket placeholders with what the person told you; leave out optional flags they did not ask for. If a tenement number or name is ambiguous, list the candidates and ask. The grant date drives every anniversary: take it from the register, not the letter date. Nothing here lodges with the department, pays rent or reports to ASX.

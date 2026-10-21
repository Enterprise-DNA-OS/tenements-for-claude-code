---
description: "Record a Form 5 that has been lodged."
---

# lodge-form5

Record a Form 5 that has been lodged.

Read fresh data. Never invent a tenement, a date, an amount or command output.

```bash
node scripts/tenements.mjs lodge-form5 "<tenement>" --on=<YYYY-MM-DD> --receipt=<number> --amount=<dollars reported> [--combined] --json
```

Replace angle-bracket placeholders with what the person told you; leave out optional flags they did not ask for. If a tenement number or name is ambiguous, list the candidates and ask. Leave out --amount to record the spend in the register for that year. Report whether it was on time and any shortfall. Nothing here lodges with the department, pays rent or reports to ASX.

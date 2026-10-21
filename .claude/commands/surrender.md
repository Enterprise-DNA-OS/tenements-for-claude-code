---
description: "Record a compulsory partial, voluntary partial or full surrender that has been lodged."
---

# surrender

Record a compulsory partial, voluntary partial or full surrender that has been lodged.

Read fresh data. Never invent a tenement, a date, an amount or command output.

```bash
node scripts/tenements.mjs surrender "<tenement>" --kind=<compulsory partial|voluntary partial|full> --area=<blocks or ha surrendered> --on=<YYYY-MM-DD> --effective=<YYYY-MM-DD> --json
```

Replace angle-bracket placeholders with what the person told you; leave out optional flags they did not ask for. If a tenement number or name is ambiguous, list the candidates and ask. A compulsory partial surrender gives up at least 40% of the blocks. A full surrender opens the final Form 5. Nothing here lodges with the department, pays rent or reports to ASX.

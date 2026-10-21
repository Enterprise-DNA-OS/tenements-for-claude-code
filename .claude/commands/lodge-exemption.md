---
description: "Record an expenditure exemption application that has been lodged."
---

# lodge-exemption

Record an expenditure exemption application that has been lodged.

Read fresh data. Never invent a tenement, a date, an amount or command output.

```bash
node scripts/tenements.mjs lodge-exemption "<tenement>" --on=<YYYY-MM-DD> --grounds="<one line>" --json
```

Replace angle-bracket placeholders with what the person told you; leave out optional flags they did not ask for. If a tenement number or name is ambiguous, list the candidates and ask. The shortfall is worked out from the register. Report whether it was in time. Nothing here lodges with the department, pays rent or reports to ASX.

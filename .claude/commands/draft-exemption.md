---
description: "Draft the facts for an expenditure exemption application (Form 18 in WA) from the register."
---

# draft-exemption

Draft the facts for an expenditure exemption application (Form 18 in WA) from the register.

Read fresh data. Never invent a tenement, a date, an amount or command output.

```bash
node scripts/tenements.mjs draft-exemption "<tenement>" --json
```

Replace angle-bracket placeholders with what the person told you; leave out optional flags they did not ask for. If a tenement number or name is ambiguous, list the candidates and ask. Open the draft and fill the grounds only from what the operator tells you. Never invent a ground or evidence. Nothing here lodges with the department, pays rent or reports to ASX.

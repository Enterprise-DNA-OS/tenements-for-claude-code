---
description: "Record a condition or endorsement written on a grant."
---

# add-condition

Record a condition or endorsement written on a grant.

Read fresh data. Never invent a tenement, a date, an amount or command output.

```bash
node scripts/tenements.mjs add-condition "<tenement>" --number=<n> --text="<condition as written>" --json
```

Replace angle-bracket placeholders with what the person told you; leave out optional flags they did not ask for. If a tenement number or name is ambiguous, list the candidates and ask. Copy the wording from the grant exactly. If the condition carries a date, add an obligation for it. Nothing here lodges with the department, pays rent or reports to ASX.

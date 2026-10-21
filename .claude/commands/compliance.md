---
description: "Check the register against the Mining Act dates and the ASX schedule rule, with the rule cited."
---

# compliance

Check the register against the Mining Act dates and the ASX schedule rule, with the rule cited.

Read fresh data. Never invent a tenement, a date, an amount or command output.

```bash
node scripts/tenements.mjs compliance --json
```

Replace angle-bracket placeholders with what the person told you; leave out optional flags they did not ask for. If a tenement number or name is ambiguous, list the candidates and ask. Breaches first, then warnings. For each, say the fix: what to lodge or pay, by when. The rules and their sources are in docs/compliance.md and the rules table; if one looks out of date, say so and stop. This is a records check, not legal advice. Nothing here lodges with the department, pays rent or reports to ASX.

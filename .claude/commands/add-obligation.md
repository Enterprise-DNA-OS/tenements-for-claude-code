---
description: "Add a dated obligation from an agreement or condition: a payment, a notice, a report, rehabilitation."
---

# add-obligation

Add a dated obligation from an agreement or condition: a payment, a notice, a report, rehabilitation.

Read fresh data. Never invent a tenement, a date, an amount or command output.

```bash
node scripts/tenements.mjs add-obligation --title="<what is owed>" --tenement="<tenement>" --agreement=<code> --due=<YYYY-MM-DD> --owner=<name> --json
```

Replace angle-bracket placeholders with what the person told you; leave out optional flags they did not ask for. If a tenement number or name is ambiguous, list the candidates and ask. Use the date written in the agreement or condition. Never guess a date. Nothing here lodges with the department, pays rent or reports to ASX.

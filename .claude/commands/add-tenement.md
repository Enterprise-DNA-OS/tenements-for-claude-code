---
description: "Add a tenement or a new application to the register."
---

# add-tenement

Add a tenement or a new application to the register.

Read fresh data. Never invent a tenement, a date, an amount or command output.

```bash
node scripts/tenements.mjs add-tenement --ref="<E 39/1234>" --holder=<code> --pct=<share> --project=<code> --location="<area>" --applied=<YYYY-MM-DD> --granted=<YYYY-MM-DD> --expires=<YYYY-MM-DD> --area=<n> --unit=<blocks|ha> --commitment=<dollars> --rent=<dollars> --manager=<name> --json
```

Replace angle-bracket placeholders with what the person told you; leave out optional flags they did not ask for. If a tenement number or name is ambiguous, list the candidates and ask. Leave out --granted for an application. Take the commitment and rent from the department's grant and rent notice; never estimate them. Nothing here lodges with the department, pays rent or reports to ASX.

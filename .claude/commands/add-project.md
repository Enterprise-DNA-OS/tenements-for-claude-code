---
description: "Add a project and its combined reporting number, if it has one."
---

# add-project

Add a project and its combined reporting number, if it has one.

Read fresh data. Never invent a tenement, a date, an amount or command output.

```bash
node scripts/tenements.mjs add-project --code=<CODE> --name="<name>" --region="<region>" --combined="<combined reporting number>" --manager=<name> --json
```

Replace angle-bracket placeholders with what the person told you; leave out optional flags they did not ask for. If a tenement number or name is ambiguous, list the candidates and ask. Nothing here lodges with the department, pays rent or reports to ASX.

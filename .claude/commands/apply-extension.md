---
description: "Record an application to extend a tenement's term."
---

# apply-extension

Record an application to extend a tenement's term.

Read fresh data. Never invent a tenement, a date, an amount or command output.

```bash
node scripts/tenements.mjs apply-extension "<tenement>" --on=<YYYY-MM-DD> --grounds="<the ground relied on>" --json
```

Replace angle-bracket placeholders with what the person told you; leave out optional flags they did not ask for. If a tenement number or name is ambiguous, list the candidates and ask. Only after it has been lodged. The tenement stays in force while it is pending. Nothing here lodges with the department, pays rent or reports to ASX.

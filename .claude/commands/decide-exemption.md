---
description: "Record the department's decision on an expenditure exemption."
---

# decide-exemption

Record the department's decision on an expenditure exemption.

Read fresh data. Never invent a tenement, a date, an amount or command output.

```bash
node scripts/tenements.mjs decide-exemption "<tenement>" --outcome=<granted|refused|withdrawn> --on=<YYYY-MM-DD> --json
```

Replace angle-bracket placeholders with what the person told you; leave out optional flags they did not ask for. If a tenement number or name is ambiguous, list the candidates and ask. A refusal puts the tenement at risk: say so plainly and suggest calling the tenement adviser. Nothing here lodges with the department, pays rent or reports to ASX.

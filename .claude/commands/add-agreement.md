---
description: "Record a native title, heritage, land access, farm-in, joint venture or royalty agreement."
---

# add-agreement

Record a native title, heritage, land access, farm-in, joint venture or royalty agreement.

Read fresh data. Never invent a tenement, a date, an amount or command output.

```bash
node scripts/tenements.mjs add-agreement --kind=<native title|heritage|land access|farm-in|joint venture|royalty|other> --title="<title>" --counterparty="<who>" --project=<code> --signed=<YYYY-MM-DD> --summary="<the obligations in one line>" --json
```

Replace angle-bracket placeholders with what the person told you; leave out optional flags they did not ask for. If a tenement number or name is ambiguous, list the candidates and ask. Then add each dated obligation in the agreement with /add-obligation. Nothing here lodges with the department, pays rent or reports to ASX.

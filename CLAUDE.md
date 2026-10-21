# Tenements for Claude Code: operating instructions

This file is the brain. Claude Code reads it at the start of every session. It says who this is for, how work gets done, and the one right way to do each recurring job.

## Who this is for

- **Business:** [YOUR COMPANY, ITS HOLDING ENTITIES AND PROJECTS]
- **Operator:** [YOUR NAME], [tenement manager, company secretary, exploration manager or consultant]
- **What matters most:** no tenement lost to a missed date, the commitment spent or an exemption lodged in time, and a quarterly tenement schedule that matches the register.

Fill this in once. A worker with context knows. A worker without it guesses.

## How to work

1. **Take a brief, not a script.** The operator describes the outcome. You run the right command and present the answer.
2. **Read before you write.** Before drafting anything about a tenement, run `/tenement <number>` and read its dates, spend and history.
3. **Plain language.** Short sentences. Dates and dollars in tables. Say the date and how many days are left.
4. **Silent success, loud problems.** Lead with anything late: a missed Form 5, rent payment or exemption window can cost the tenement.
5. **Stop at the line.** Anything that lodges, pays, surrenders or goes to ASX waits for a yes in this session, and happens outside this system.

## Routing table: one right way for each recurring job

| When the operator asks for... | Use this |
|---|---|
| The last 50 changes to the register and who made them. | `/activity` |
| Record a native title, heritage, land access, farm-in, joint venture or royalty agreement. | `/add-agreement` |
| Record a condition or endorsement written on a grant. | `/add-condition` |
| Add a holder: one of your group companies, or a partner with --partner. | `/add-holder` |
| Add a dated obligation from an agreement or condition: a payment, a notice, a report, rehabilitation. | `/add-obligation` |
| Add a project and its combined reporting number, if it has one. | `/add-project` |
| Open an ASX quarter so its tenement schedule has a due date. | `/add-quarter` |
| Add a tenement or a new application to the register. | `/add-tenement` |
| Every agreement with its counterparty and open obligations. | `/agreements` |
| Pending applications: what we applied for, when, and how long it has waited. | `/applications` |
| Record an application to extend a tenement's term. | `/apply-extension` |
| What needs a person today across every project, worst first. | `/attention` |
| Every open date for the next twelve months, with the rule behind each. | `/calendar` |
| Check the register against the Mining Act dates and the ASX schedule rule, with the rule cited. | `/compliance` |
| Make this system yours in plain language. Add a field, change a rule, add another state. Writes the migration, applies it, updates the commands that touch it. | `/customise` |
| Record the department's decision on an expenditure exemption. | `/decide-exemption` |
| Record the decision on an extension of term, with the new expiry. | `/decide-extension` |
| Render the paperwork: a summary per tenement, a project expenditure statement and the ASX schedule per quarter. | `/documents` |
| Mark an obligation done. | `/done` |
| Draft the facts for an expenditure exemption application (Form 18 in WA) from the register. | `/draft-exemption` |
| Draft the record behind an extension of term application. | `/draft-extension` |
| Draft the Form 5 working paper: the year's spend by category against the commitment. | `/draft-form5` |
| Draft the ASX quarterly tenement schedule (Listing Rule 5.3.3) for a quarter. | `/draft-schedule` |
| Everything due in the next N days (default 30), with the rule behind each date. | `/due` |
| Every exemption application and its outcome. | `/exemptions` |
| Spend against commitment this tenement year, tenement by tenement. | `/expenditure` |
| Tenements whose term ends in the next twelve months, and any extension on file. | `/expiring` |
| Archive every record to one JSON file. | `/export` |
| Form 5s due, including final Form 5s for tenements that have ended. | `/form5-due` |
| Record that an application was granted, with its expiry, commitment and rent. | `/grant` |
| Holders, which are in your group, and how many tenements each holds. | `/holders` |
| Bring the register across from a tenement schedule, or expenditure lines from the accounts, saved as CSV. | `/import` |
| Ten questions answered across the whole register. | `/insights` |
| Record a change of interest: a transfer, a joint venture milestone, a farm-in earned. | `/interest` |
| Who holds what share of each tenement, including recent changes. | `/interests` |
| Record an expenditure exemption application that has been lodged. | `/lodge-exemption` |
| Record a Form 5 that has been lodged. | `/lodge-form5` |
| Add a read-only HTML view (a dashboard page) from a plain-language description, rendered in the operator's brand by npm run view. | `/new-view` |
| Open obligations from agreements and conditions, soonest first. | `/obligations` |
| Record rent paid for a tenement year. | `/pay-rent` |
| One project: its tenements, spend against commitment and open dates. | `/project` |
| Projects with tenement count, total commitment and spend this year. | `/projects` |
| ASX quarters: due dates and when each schedule was reported. | `/quarters` |
| Rent due and not yet paid, with the amount on record. | `/rents-due` |
| Record that a quarter's tenement schedule went to ASX. | `/report-quarter` |
| The rules in force, with their sources. | `/rules` |
| Tenements that spent less than their commitment last year, and where the exemption stands. | `/shortfalls` |
| Record expenditure on a tenement. | `/spend` |
| Record a compulsory partial, voluntary partial or full surrender that has been lodged. | `/surrender` |
| Compulsory partial surrenders due before the sixth anniversary, and the ones already lodged. | `/surrenders-due` |
| One tenement in full: holders, dates, spend, Form 5s, rent, conditions and history. | `/tenement` |
| The ASX Listing Rule 5.3.3 schedule for a quarter: held, acquired, disposed of, farm-in and farm-out. | `/tenement-schedule` |
| The register: every tenement with its holders, status and commitment. | `/tenements` |
| Render the read-only dashboards: this week, the calendar and spend against commitment. | `/view` |
| Draft the Monday tenement review from attention, due and compliance. | `/weekly-review` |

If an ask fits nothing here, run the CLI directly (`node scripts/tenements.mjs --help`) and then propose a new command for it.

## Hard rules

- Never lodge, pay or report from here. Nothing in this folder talks to the department, a bank or ASX. Draft to `drafts/`; a person lodges and then records it.
- Record what happened, never what should have happened. Do not record a Form 5, rent payment, exemption, surrender or extension until the operator confirms it was lodged or paid, with the date.
- Take grant dates, commitments, rent and expiry dates from the department's register or notices. Never estimate one.
- Never give legal advice or decide whether an exemption ground is good enough. The holder and its tenement adviser decide; the register records.
- Never delete records. Mark them surrendered, expired or done instead.
- The database is the source of truth. If the answer is not in it, say so.

## Where things live

- `scripts/tenements.mjs` the one CLI. `scripts/lib/tenements.mjs` every read, write, rule and import. `scripts/lib/db.mjs` picks `DATABASE_URL` (Postgres, Supabase) or the embedded database in `.data/`.
- `supabase/migrations/` the register, the rules table and the views, plain SQL. `npm run migrate` applies it.
- `.claude/commands/` the slash commands. Add one every time the same ask comes twice.
- `views.json` and `documents.json` the dashboards (`npm run view`) and paperwork (`npm run docs`), in the brand from `brand.json`.
- `docs/` the rules with sources, the CLI reference, and the guide for moving off LandTracker.

Built by Enterprise DNA. Installed and run for you as part of Omni: https://enterprisedna.co/omni/instead-of/landtracker

<h1 align="center">Tenements for Claude Code</h1>

<p align="center">
  <strong>The open-source tenement register that is just a database and Claude Code.</strong>
</p>

<p align="center">
  Created by <a href="https://www.enterprisedna.co"><strong>Enterprise DNA</strong></a>. Free and open source. Works with Claude Code, Codex, OpenCode or Cursor.
</p>

<!-- three-doors -->
<table align="center">
  <tr>
    <td align="center"><strong>Do it yourself</strong><br/>Clone it, run it, own it. Free, MIT.<br/><a href="#quick-start">Quick start</a></td>
    <td align="center"><strong>We customise it</strong><br/>Your fields, your rules, your LandTracker data brought across.<br/><a href="https://enterprisedna.co/omni/book/?utm_source=github&utm_medium=readme&utm_campaign=landtracker">Book a call</a></td>
    <td align="center"><strong>We run it for you</strong><br/>Installed, connected and operated inside Omni. Setup fee, then a retainer.<br/><a href="https://enterprisedna.co/omni/instead-of/landtracker?utm_source=github&utm_medium=readme&utm_campaign=landtracker">How it works</a></td>
  </tr>
</table>

<p align="center">
  <a href="#what-is-this">What is this</a> &bull;
  <a href="#why-no-front-end">Why no front end</a> &bull;
  <a href="#quick-start">Quick start</a> &bull;
  <a href="#the-commands">Commands</a> &bull;
  <a href="#instead-of-landtracker">Instead of LandTracker</a> &bull;
  <a href="#want-it-installed-and-run-for-you">Installed for you</a> &bull;
  <a href="#license">License</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node-20+-339933?style=flat-square" alt="Node 20+" />
  <img src="https://img.shields.io/badge/PostgreSQL-any-336791?style=flat-square" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/PGlite-embedded-3ecf8e?style=flat-square" alt="PGlite" />
  <img src="https://img.shields.io/badge/License-MIT-yellow?style=flat-square" alt="MIT License" />
</p>

---

## What is this

Tenements for Claude Code is a tenement register for explorers and miners, as a Postgres database and a set of agent commands. There is no web front end. Open the folder in [Claude Code](https://claude.com/claude-code) (or Codex, OpenCode, Cursor: see `AGENTS.md`) and ask: "what is late", "how much do we still have to spend before the anniversaries", "draft this quarter's tenement schedule".

**The bill it replaces.** LandTracker publishes no price: its product page offers a contact form and an expert session, and expenditure tracking, land use alerts and compliance reports are sold as separate products beside it. Explorers either pay that quote, pay a tenement consultancy to keep the register, or keep it in a spreadsheet and hope. [Research and sources](docs/research.md).

**What it covers.** Every tenement your group holds or has applied for: holders and shares, projects, grant and expiry dates, area, the expenditure commitment and the spend against it, rent, Form 5s, exemptions, surrenders and extensions, with the date the West Australian Mining Act puts on each. Agreements and their obligations (native title, heritage, land access, farm-in, joint venture). And the ASX quarterly tenement schedule under Listing Rule 5.3.3. Built for junior explorers and the tenement consultancies that serve them.

Want the same register with a map, a check against the government register every night, or built on a different stack? That is a customisation, and it is what Enterprise DNA does: [book a call](https://enterprisedna.co/omni/book/?offer=replace-software&utm_source=github&utm_medium=readme&utm_campaign=landtracker).

## Why no front end

- The front end was only there because the database was hard to talk to. That is no longer true.
- Your register sits in plain Postgres tables you own. The record a buyer or partner asks for in due diligence never lives in a system you rent.
- No seats and no charge per tenement. The tenement manager, the geologists and the company secretary can all ask. Read [docs/why-no-front-end.md](docs/why-no-front-end.md) for what you give up too.

## Quick start

Sixty seconds, no database install (an embedded Postgres runs inside Node):

```bash
git clone https://github.com/Enterprise-DNA-OS/tenements-for-claude-code.git
cd tenements-for-claude-code
npm install
npm test
npm run demo
```

`npm run demo` loads a fictional junior explorer with thirteen tenements across three West Australian projects, a joint venture and a farm-in, with a late Form 5, a missed exemption window, late rent, a compulsory partial surrender due and a licence about to expire. Then open the folder in Claude Code and type `/attention`.

`npm run view` renders three read-only dashboards (this week, the calendar, spend against commitment). `npm run docs` renders a summary per tenement (for the board, a partner or due diligence), an expenditure statement per project and the ASX tenement schedule per quarter, in your brand from `brand.json`.

### Use it with your own Postgres or Supabase

Copy `.env.example` to `.env`, set `DATABASE_URL`, then `npm run migrate`. Same commands, shared register, no per-seat fee. Never load the demo seed into your real register.

## Five things a tenement manager does every week

1. **Watch the anniversaries**: Form 5s, rent and the 60 day exemption window (`/calendar`, `/form5-due`, `/rents-due`).
2. **Keep the spend on track** against each commitment before the year ends (`/expenditure`, `/shortfalls`, `/spend`).
3. **Act before the big dates**: compulsory partial surrenders and expiries (`/surrenders-due`, `/expiring`, `/draft-extension`).
4. **Keep the agreements' promises**: payments, notices and rehabilitation (`/obligations`, `/done`).
5. **Report the quarter** to ASX with a schedule that matches the register (`/tenement-schedule`, `/draft-schedule`).

`/weekly-review` drafts the Monday note from `/attention`, `/due` and `/compliance`.

## The commands

55 slash commands over one CLI (`node scripts/tenements.mjs`, 52 commands, [reference](docs/cli.md)).

| Command | What it does |
|---|---|
| `/activity` | The last 50 changes to the register and who made them. |
| `/add-agreement` | Record a native title, heritage, land access, farm-in, joint venture or royalty agreement. |
| `/add-condition` | Record a condition or endorsement written on a grant. |
| `/add-holder` | Add a holder: one of your group companies, or a partner with --partner. |
| `/add-obligation` | Add a dated obligation from an agreement or condition: a payment, a notice, a report, rehabilitation. |
| `/add-project` | Add a project and its combined reporting number, if it has one. |
| `/add-quarter` | Open an ASX quarter so its tenement schedule has a due date. |
| `/add-tenement` | Add a tenement or a new application to the register. |
| `/agreements` | Every agreement with its counterparty and open obligations. |
| `/applications` | Pending applications: what we applied for, when, and how long it has waited. |
| `/apply-extension` | Record an application to extend a tenement's term. |
| `/attention` | What needs a person today across every project, worst first. |
| `/calendar` | Every open date for the next twelve months, with the rule behind each. |
| `/compliance` | Check the register against the Mining Act dates and the ASX schedule rule, with the rule cited. |
| `/customise` | Make this system yours in plain language. Add a field, change a rule, add another state. Writes the migration, applies it, updates the commands that touch it. |
| `/decide-exemption` | Record the department's decision on an expenditure exemption. |
| `/decide-extension` | Record the decision on an extension of term, with the new expiry. |
| `/documents` | Render the paperwork: a summary per tenement, a project expenditure statement and the ASX schedule per quarter. |
| `/done` | Mark an obligation done. |
| `/draft-exemption` | Draft the facts for an expenditure exemption application (Form 18 in WA) from the register. |
| `/draft-extension` | Draft the record behind an extension of term application. |
| `/draft-form5` | Draft the Form 5 working paper: the year's spend by category against the commitment. |
| `/draft-schedule` | Draft the ASX quarterly tenement schedule (Listing Rule 5.3.3) for a quarter. |
| `/due` | Everything due in the next N days (default 30), with the rule behind each date. |
| `/exemptions` | Every exemption application and its outcome. |
| `/expenditure` | Spend against commitment this tenement year, tenement by tenement. |
| `/expiring` | Tenements whose term ends in the next twelve months, and any extension on file. |
| `/export` | Archive every record to one JSON file. |
| `/form5-due` | Form 5s due, including final Form 5s for tenements that have ended. |
| `/grant` | Record that an application was granted, with its expiry, commitment and rent. |
| `/holders` | Holders, which are in your group, and how many tenements each holds. |
| `/import` | Bring the register across from a tenement schedule, or expenditure lines from the accounts, saved as CSV. |
| `/insights` | Ten questions answered across the whole register. |
| `/interest` | Record a change of interest: a transfer, a joint venture milestone, a farm-in earned. |
| `/interests` | Who holds what share of each tenement, including recent changes. |
| `/lodge-exemption` | Record an expenditure exemption application that has been lodged. |
| `/lodge-form5` | Record a Form 5 that has been lodged. |
| `/new-view` | Add a read-only HTML view (a dashboard page) from a plain-language description, rendered in the operator's brand by npm run view. |
| `/obligations` | Open obligations from agreements and conditions, soonest first. |
| `/pay-rent` | Record rent paid for a tenement year. |
| `/project` | One project: its tenements, spend against commitment and open dates. |
| `/projects` | Projects with tenement count, total commitment and spend this year. |
| `/quarters` | ASX quarters: due dates and when each schedule was reported. |
| `/rents-due` | Rent due and not yet paid, with the amount on record. |
| `/report-quarter` | Record that a quarter's tenement schedule went to ASX. |
| `/rules` | The rules in force, with their sources. |
| `/shortfalls` | Tenements that spent less than their commitment last year, and where the exemption stands. |
| `/spend` | Record expenditure on a tenement. |
| `/surrender` | Record a compulsory partial, voluntary partial or full surrender that has been lodged. |
| `/surrenders-due` | Compulsory partial surrenders due before the sixth anniversary, and the ones already lodged. |
| `/tenement` | One tenement in full: holders, dates, spend, Form 5s, rent, conditions and history. |
| `/tenement-schedule` | The ASX Listing Rule 5.3.3 schedule for a quarter: held, acquired, disposed of, farm-in and farm-out. |
| `/tenements` | The register: every tenement with its holders, status and commitment. |
| `/view` | Render the read-only dashboards: this week, the calendar and spend against commitment. |
| `/weekly-review` | Draft the Monday tenement review from attention, due and compliance. |

## Ten questions the register answers

`/insights` runs all ten against the whole register:

1. How much do we have to spend before each anniversary, and on which tenements?
2. What is our total annual commitment and rent, by project?
3. How much did we spend on each kind of work over the last 12 months?
4. Which tenements have needed an exemption, and how often?
5. What falls due in the next 90 days, by month?
6. Which suppliers did we pay the most for work on the ground?
7. How long have our applications been waiting?
8. Which tenements are held with partners, and at what share?
9. Who carries the most open dates, and how many are late?
10. Was rent paid on time over the last year?

## The rules, with sources

`/compliance` checks every record against the West Australian Mining Act 1978 and Mining Regulations 1981 (Form 5 within 60 days of each anniversary and of the tenement ending, rent within one month of the anniversary, the 60 day exemption window, the 40 per cent compulsory partial surrender before the sixth anniversary, extensions before expiry), ASX Listing Rule 5.3.3, and the dates in your own agreements. Every finding cites its rule. The rules are rows in a table, so a change is a one-line migration, and another state is a set of rows. [docs/compliance.md](docs/compliance.md). It is a records check, not legal advice.

## Your first hour: ten things to ask for

1. "Put our company name and colours on the tenement summaries."
2. "Set up our holding companies, and mark our joint venture partner as a partner."
3. "Import our tenements from this LandTracker export. Dry run first."
4. "Import this year's expenditure from the accounts export."
5. "What is late, and what is due in the next 30 days?"
6. "Draft the Form 5 working paper for E 39/9101."
7. "Which tenements will not meet their commitment before the anniversary?"
8. "Draft the exemption facts for the tenement we could not access."
9. "Draft this quarter's tenement schedule for the activities report."
10. "Add Queensland's annual reporting dates" (through `/customise`).

## Instead of LandTracker

The bridge is a tenement schedule saved as CSV: export the report your team already runs from LandTracker (or download the register search for your holders), then run `import schedule` with a dry run first. Expenditure comes across from your accounts with `import spend`. Headings can be mapped. Each import is all or nothing and safe to repeat. [docs/replace-landtracker.md](docs/replace-landtracker.md) covers what carries over and what does not.

## Architecture

```
tenements-for-claude-code/
  CLAUDE.md                  how the operator wants this run (routing table + house rules)
  AGENTS.md                  the same, for Codex / OpenCode / Cursor / Gemini CLI
  .claude/commands/          one slash command per recurring job
  scripts/tenements.mjs      the one CLI
  scripts/lib/tenements.mjs  every read, write, rule and import
  scripts/lib/db.mjs         one adapter: DATABASE_URL (pg) or embedded PGlite
  supabase/migrations/       the register, the rules and the views, plain SQL
  supabase/seed.sql          a fictional explorer and its tenements
  views.json, documents.json the dashboards and paperwork
  docs/                      the rules, the CLI, the migration guide
```

`npm test` runs every CLI command against a temporary database: anniversaries (including a leap-day grant), Form 5, rent, exemption, partial surrender and expiry dates, interests and the ASX schedule, obligations, both imports all or nothing, drafts, export and escaped HTML. The CI workflow runs it on Windows and Linux, Node 20 and 22, and Postgres 17 (manual trigger).

## Privacy

The register holds commercial information: what you hold, where, and what you spend. The free version assumes a trusted operator on a protected machine or a dedicated database with its own access controls. Actor labels in the activity log are labels, not signed identities. Keep `.data`, `exports`, `drafts`, `views` and `docs-out` out of git (the `.gitignore` does). Shared use with partners needs real sign-in and permissions: that is part of what Enterprise DNA builds.

## Built for coding agents

The database, CLI and command recipes work with Claude Code, Codex, OpenCode or Cursor. Ask your coding agent for a new command and have it implement and test the change against the same records.

## Contributing

Issues and pull requests are welcome. Keep the shape: plain SQL, one small CLI, a slash command per recurring job, no front end, and a test for every rule.

## Want it installed and run for you?

Enterprise DNA installs Tenements for Claude Code for your group, brings your LandTracker (or spreadsheet) register and expenditure across, adds the rules for every state you hold ground in, connects your accounts and a nightly check against the government register, and runs it for you as part of **Omni**, our managed Command Center. One setup fee, then a monthly retainer.

- Book a call: [enterprisedna.co/omni/book](https://enterprisedna.co/omni/book/?offer=replace-software&utm_source=github&utm_medium=readme&utm_campaign=landtracker)
- Read more: [enterprisedna.co/omni/instead-of/landtracker](https://enterprisedna.co/omni/instead-of/landtracker?utm_source=github&utm_medium=readme&utm_campaign=landtracker)

## License

MIT. Copyright (c) 2026 Enterprise DNA. LandTracker is a trademark of its owner. This independent project is not affiliated with LandTrack Systems, Datamine, the Department of Mines, Petroleum and Exploration or ASX.

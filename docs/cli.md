# CLI reference

`node scripts/tenements.mjs <command> [arguments] [--key=value] [--json]`

Human tables by default, `--json` for machines. Tenement numbers match with or without spaces (`E39/9101` is `E 39/9101`), then by prefix, suffix or part of the location; codes match holders, projects, agreements, obligations and quarters the same way. More than one match lists the candidates and exits 1. Unknown flags fail before anything is written. Dates are `YYYY-MM-DD` (imports also accept `DD/MM/YYYY`). `--on` defaults to today. Amounts are dollars. `--actor=<name>` labels any write in the activity log.

## Reads

| Command | Returns |
|---|---|
| `attention` | Everything that needs a person, worst first |
| `calendar` | Every open date in the next twelve months |
| `due [--days=30]` | Open dates due within N days, with the rule |
| `compliance` | Rule findings with the rule cited (docs/compliance.md) |
| `tenements` | The register |
| `tenement <number>` | One tenement: holders, dates, spend, Form 5s, rent, exemptions, surrenders, extensions, conditions, history |
| `applications` | Pending applications and how long each has waited |
| `holders` | Holders, group or partner, with tenement counts |
| `interests` | Current and recent interests |
| `projects` | Projects with commitment and spend this year |
| `project <code>` | One project in full |
| `expenditure` | Spend against commitment this tenement year |
| `shortfalls` | Last year's shortfalls and exemption status |
| `form5` | Form 5s due, including final ones |
| `rents` | Rent due and unpaid |
| `surrenders` | Compulsory partial surrenders due and lodged |
| `expiring` | Terms ending inside a year |
| `exemptions` | Exemption applications |
| `agreements` | Agreements and open obligations |
| `obligations` | Open obligations |
| `quarters` | ASX quarters |
| `schedule <quarter>` | The Listing Rule 5.3.3 tenement schedule |
| `rules` | The rules in force with sources |
| `insights` | Ten questions across the register |
| `activity` | The last 50 changes |

## Writes

| Command | Records |
|---|---|
| `add-holder --code --name [--abn] [--partner]` | A holder; `--partner` for one outside your group |
| `add-project --code --name [--region] [--combined] [--manager]` | A project |
| `add-tenement --ref --holder [--pct] [--project] [--location] [--applied] [--granted] [--expires] [--area] [--unit] [--commitment] [--rent] [--manager]` | A tenement, or an application when `--granted` is left out |
| `grant <number> [--on] [--expires] [--commitment] [--rent]` | An application granted |
| `interest <number> --holder --pct [--nature] [--from] [--note]` | A change of interest; `--pct=0` ends one |
| `spend <number> --category --amount --description [--on] [--supplier]` | Expenditure |
| `pay-rent <number> [--on] [--amount] [--receipt] [--year]` | Rent paid for a tenement year |
| `lodge-form5 <number> [--on] [--year-ending] [--amount] [--receipt] [--combined]` | A Form 5 lodged |
| `lodge-exemption <number> --grounds [--on]` | An exemption application lodged |
| `decide-exemption <number> --outcome [--on] [--year-ending]` | The decision |
| `surrender <number> --kind [--area] [--on] [--effective]` | A compulsory partial, voluntary partial or full surrender |
| `apply-extension <number> --grounds [--on]` | An extension application |
| `decide-extension <number> --outcome [--expires] [--on]` | The decision and new expiry |
| `add-agreement --kind --title --counterparty [--project] [--signed] [--ends] [--summary] [--code]` | An agreement |
| `add-obligation --title --due --owner [--tenement] [--agreement] [--note] [--code]` | A dated obligation |
| `done <obligation> [--on]` | An obligation done |
| `add-condition <number> --number --text` | A condition on the grant |
| `add-quarter --ends` | An ASX quarter |
| `report-quarter <quarter> [--on]` | The schedule released |
| `import schedule <file.csv> [--holder] [--project] [--map] [--dry-run]` | Tenements from a schedule |
| `import spend <file.csv> [--map] [--dry-run]` | Expenditure lines |

## Drafts and files

| Command | Writes |
|---|---|
| `draft-form5 <number>` | `drafts/form5-…md`, the Form 5 working paper |
| `draft-exemption <number>` | `drafts/exemption-…md`, the facts for an exemption application |
| `draft-extension <number>` | `drafts/extension-…md`, the record behind an extension |
| `draft-schedule <quarter>` | `drafts/schedule-…md`, the ASX tenement schedule |
| `weekly-review` | `drafts/weekly-review-…md` |
| `export [--file]` | Every table to one JSON file (never overwrites) |

`npm run view` writes three dashboards to `views/`. `npm run docs` writes a summary per tenement, an expenditure statement per project and the ASX schedule per quarter to `docs-out/`.

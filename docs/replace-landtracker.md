# Moving off LandTracker

The bridge is a tenement schedule: one row per tenement with its number, status, holders, dates, area, commitment and rent. Every tenement system and every consultant can produce one, and the department's register search gives you the same facts for every title you hold.

## 1. Export

- From LandTracker, run the tenement report your team already uses and save it as a spreadsheet (its alerts and reports can be exported to spreadsheet format). Save it as CSV.
- Or download the register search for your holders from the department and save it as CSV.
- From your accounts, export the expenditure lines coded to each tenement for the current and last tenement year: date, tenement, category, amount, description, supplier.

## 2. Map the headings

The import reads these headings. Anything else fails before a row is written, so nothing half-loads.

**Schedule:** `Tenement, Status, Project, Location, Holder, Interest, Applied, Granted, Expiry, Area, Area unit, Commitment, Rent, Manager`. Only `Tenement` and `Status` are required, and a live tenement needs `Granted`.

- `Tenement` is the number as the register writes it. `E39/9101`, `e 39/09101` and `E 39/9101` all read as E 39/9101. The letter sets the type.
- `Status`: live, granted or current; pending, application or applied; surrendered, expired, dead, forfeited, refused, withdrawn.
- `Holder`: one name or code, or shares like `RKR 70; MPL 30` that add to 100. New names are added as partner holders; mark your own group's entities with `add-holder` first so the ASX schedule counts them.
- `Project`: a project code or name. New names become projects.
- Dates as `YYYY-MM-DD` or `DD/MM/YYYY`. Money as dollars (`40,000` or `40000.00`).

**Spend:** `Tenement, Date, Category, Amount, Description, Supplier`. Categories are the codes in `expenditure_categories` (drilling, geophysics, geochemistry, geology, heritage, earthworks, rehabilitation, administration, rates, other). Map your account codes to them in the spreadsheet, or add your own with `/customise`.

If your headings differ, write a map file:

```json
{ "Tenement": "Title", "Status": "Title status", "Holder": "Holders", "Granted": "Grant date", "Expiry": "Expiry date" }
```

## 3. Import, dry run first

```bash
node scripts/tenements.mjs import schedule landtracker.csv --map=map.json --dry-run
node scripts/tenements.mjs import schedule landtracker.csv --map=map.json
node scripts/tenements.mjs import spend expenditure.csv --dry-run
node scripts/tenements.mjs import spend expenditure.csv
```

Each import is all or nothing and safe to repeat: a row already loaded with the same values is skipped, and a changed row stops the import so you correct it with the commands instead.

## 4. Fill in the history the dates depend on

The calendar needs to know what you already did this tenement year. For each tenement, record the last Form 5 (`lodge-form5`), the current year's rent (`pay-rent`), any exemption (`lodge-exemption`), surrender and extension. Then run `/compliance`: anything it calls late that you know was done is a record still to enter.

## What carries over

Tenement numbers, types, status, holders and shares, projects, locations, grant, application and expiry dates, area, commitment, rent, and expenditure lines.

## What does not

- Maps, boundaries and spatial data. Keep them in your GIS.
- LandTracker's own action templates and alert settings. The rules here are rows in the `rules` table; add a rule your team relies on with `/customise`.
- Attachments and scanned documents. Keep them in your document store and note the reference on the record.
- Agreements and their obligations. Enter each with `add-agreement` and `add-obligation`; it is usually a short list and worth reading as you go.

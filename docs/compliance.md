# The rules this register checks

`/compliance` (and `node scripts/tenements.mjs compliance`) checks the records against the rules below. Each finding names its rule. The rules are rows in the `rules` table and the dates are worked out in the `tenement_calendar` view, so a change in the regulations is one migration through `/customise`, not a code change.

This is a records check. It is not legal advice, and it does not decide whether an exemption ground is good enough or whether a tenement should be kept. The holder and its tenement adviser decide that. Confirm every rule against the source before you rely on it, and again whenever the Act, the regulations or the department's guidance changes.

A date is a **warning** when it falls inside the next 30 days and a **breach** once it has passed with nothing recorded.

## Western Australia: Mining Act 1978 and Mining Regulations 1981

| Check | The rule | What the register flags |
|---|---|---|
| `FORM5` | Every year, the holder lodges an Operations Report (Form 5) within 60 days after the anniversary of the start of the term. Mining Act 1978 ss 51, 68, 70H and 82; Mining Regulations 1981 regs 16, 22, 23E and 32. A late Form 5 leads to forfeiture action. Source: https://www.dmp.wa.gov.au/Operations-Reports-Expenditure-5702.aspx | No Form 5 recorded for the year that ended at the last anniversary. Applies to prospecting and exploration licences, retention licences and mining leases (the `form5` flag on `tenement_types`). |
| `FORM5-FINAL` | A Form 5 is also lodged within 60 days after the tenement ends by surrender, expiry or forfeiture. Same source. | A surrendered, expired or forfeited tenement with no Form 5 for the year ending on its end date. |
| `RENT` | Rent for the second and later years is paid yearly in advance, no later than one month after the anniversary of the start of the term (reg 109). Unpaid rent leads to forfeiture action under regs 49 and 50, and late payment can carry a penalty. Source: https://www.dmp.wa.gov.au/Debt-Recovery-Procedure-for-26920.aspx | No payment recorded for the current tenement year (and next year's, inside 60 days of the anniversary). A payment recorded after the month is a warning even once paid. |
| `EXEMPTION` | Where the minimum expenditure was not met, the holder can apply for exemption from the expenditure condition within 60 days from the end of the year it relates to (Form 18, with a statutory declaration and evidence). Source: https://www.dmp.wa.gov.au/Operations-Reports-Expenditure-5702.aspx | Spend recorded for the last tenement year is below the commitment and no exemption is recorded. |
| `CPS` | Exploration licences applied for on or after 10 February 2006 relinquish 40 per cent of their blocks at the end of the sixth year (Mining Act 1978 s 65). The surrender (Form 14 with a map) is lodged before the sixth anniversary and takes effect on it. There is no exemption or deferral. It is not needed for a licence of 10 blocks or fewer, or one with retention status. Source: https://www.dmp.wa.gov.au/Minerals/Compulsory-Partial-Surrender-5701.aspx | No compulsory or voluntary partial surrender recorded before the sixth anniversary. `surrender` refuses a compulsory partial surrender of less than 40 per cent. Licences applied for before 10 February 2006 follow older rules and are not checked. |
| `EXPIRY` | The holder may apply to extend an exploration licence before it expires; the Minister considers it only on a ground in reg 23AB, and the licence stays in force until the application is decided (s 61). Licences applied for after 10 February 2006: an initial five years, one extension of five years, then further periods of two years. Source: https://www.wa.gov.au/organisation/department-of-mines-petroleum-and-exploration/extensions-of-term-exploration-licences | A live tenement whose term ends inside a year with no extension application recorded in that year. |

What the register does not check: the minimum expenditure amount itself (record the figure the department set on grant, it is not calculated), audits of a Form 5, combined reporting approval, programmes of work and other approvals, mining lease conditions beyond those you record, and the rules of other states. Add another state's rules as rows with `/customise`.

## ASX Listing Rule 5.3.3: the quarterly tenement schedule

A mining exploration entity's quarterly activity report includes, for the group: the mining tenements held at the end of the quarter and where they are; tenements acquired and disposed of during the quarter and where they are; beneficial percentage interests held in farm-in or farm-out agreements at the end of the quarter; and those acquired or disposed of during the quarter. It goes to ASX with the Appendix 5B (rule 5.5), within one month after the end of the quarter. Source: ASX Listing Rules chapter 5 and Guidance Note 23, https://www.asx.com.au/about/regulation/rules-guidance-notes-and-waivers/asx-listing-rules-guidance-notes-and-waivers

| Check | What the register flags |
|---|---|
| `ASX-QUARTER` | A quarter in `asx_quarters` with no reported date, inside 30 days of or past its due date. |

`schedule <quarter>` builds the five sections from the `interests` table: a holder marked `in_group` counts toward the group's interest. Pending applications are listed as applications. Check every line against the department's register before release.

## Your own agreements and conditions

| Check | What the register flags |
|---|---|
| `OBLIGATION` | An obligation (a native title payment, a heritage notice, a land access notice, a farm-in statement, a condition to rehabilitate) past or near its due date with no done date. The date is the one written in your agreement or grant. |
| `INTERESTS` | A live tenement whose registered and joint venture shares do not add up to 100 per cent. |

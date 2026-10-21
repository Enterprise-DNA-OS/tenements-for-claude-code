-- Tenements for Claude Code: the tenement register, its money and the dates the rules put on it.
-- Runs on PostgreSQL 15+ and on embedded PGlite. No extensions.
-- The rules are rows, not code: /customise changes them with a new migration.
-- Amounts are whole cents in Australian dollars.

create function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- The rules the calendar and /compliance apply, each with its source.
create table rules (
  code text primary key,
  jurisdiction text not null,
  title text not null,
  label text not null,
  rule text not null,
  source text not null
);

-- Tenement types. cps: compulsory partial surrender at the end of year six applies (WA exploration licences
-- applied for on or after 10 February 2006, more than 10 blocks).
create table tenement_types (
  code text primary key,
  name text not null,
  jurisdiction text not null default 'WA',
  term_years int,
  form5 boolean not null default true,
  cps boolean not null default false
);

-- A holder is a company or person on the register. in_group marks your own group's entities,
-- the ones whose interests go in the ASX quarterly tenement schedule.
create table holders (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  abn text,
  in_group boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- A project groups tenements. combined_reporting is the department's combined reporting number, if any.
create table projects (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  region text,
  combined_reporting text,
  manager text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table tenements (
  id uuid primary key default gen_random_uuid(),
  ref text not null unique,                       -- as the register writes it: E 39/9101
  type_code text not null references tenement_types(code),
  project_id uuid references projects(id),
  status text not null default 'live' check (status in ('application','live','surrendered','expired','forfeited','refused','withdrawn')),
  location text,                                  -- geographic area, as ASX Listing Rule 5.3.3 asks
  applied_on date,
  granted_on date,
  expires_on date,
  ended_on date,
  area numeric(12,2),
  area_unit text not null default 'blocks' check (area_unit in ('blocks','ha')),
  commitment_cents bigint check (commitment_cents >= 0),   -- the minimum annual expenditure the department set
  rent_cents bigint check (rent_cents >= 0),               -- the current year's rent as invoiced
  manager text not null default 'unassigned',
  notes text,
  source text not null default 'manual',
  source_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'live' or granted_on is not null),
  check (ended_on is null or status in ('surrendered','expired','forfeited','refused','withdrawn'))
);

-- Who holds what share. A change of interest closes one row (to_on) and opens another.
create table interests (
  id uuid primary key default gen_random_uuid(),
  tenement_id uuid not null references tenements(id),
  holder_id uuid not null references holders(id),
  pct numeric(6,2) not null check (pct > 0 and pct <= 100),
  nature text not null default 'registered holder'
    check (nature in ('registered holder','beneficial','farm-in','farm-out','joint venture')),
  from_on date not null,
  to_on date,
  note text,
  created_at timestamptz not null default now(),
  check (to_on is null or to_on >= from_on)
);

create table expenditure_categories (
  code text primary key,
  name text not null
);

create table expenditure (
  id uuid primary key default gen_random_uuid(),
  tenement_id uuid not null references tenements(id),
  spent_on date not null,
  category text not null references expenditure_categories(code),
  amount_cents bigint not null check (amount_cents > 0),
  description text not null,
  supplier text,
  source text not null default 'manual',
  source_hash text,
  created_at timestamptz not null default now()
);

-- One row per tenement year reported. year_ending is the anniversary (or the day the tenement ended).
create table form5_reports (
  id uuid primary key default gen_random_uuid(),
  tenement_id uuid not null references tenements(id),
  year_ending date not null,
  lodged_on date not null,
  reported_cents bigint not null check (reported_cents >= 0),
  receipt text,
  combined boolean not null default false,
  created_at timestamptz not null default now(),
  unique (tenement_id, year_ending)
);

create table rent_payments (
  id uuid primary key default gen_random_uuid(),
  tenement_id uuid not null references tenements(id),
  year_starting date not null,
  paid_on date not null,
  amount_cents bigint not null check (amount_cents > 0),
  receipt text,
  created_at timestamptz not null default now(),
  unique (tenement_id, year_starting)
);

-- Applications for exemption from the expenditure condition (Form 18 in WA).
create table exemptions (
  id uuid primary key default gen_random_uuid(),
  tenement_id uuid not null references tenements(id),
  year_ending date not null,
  lodged_on date not null,
  shortfall_cents bigint not null check (shortfall_cents >= 0),
  grounds text not null,
  outcome text not null default 'pending' check (outcome in ('pending','granted','refused','withdrawn')),
  decided_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenement_id, year_ending)
);

create table surrenders (
  id uuid primary key default gen_random_uuid(),
  tenement_id uuid not null references tenements(id),
  kind text not null check (kind in ('compulsory partial','voluntary partial','full')),
  lodged_on date not null,
  area_surrendered numeric(12,2),
  effective_on date,
  created_at timestamptz not null default now()
);

-- Applications to extend the term (WA Mining Act section 61). The tenement stays in force while one is pending.
create table extensions (
  id uuid primary key default gen_random_uuid(),
  tenement_id uuid not null references tenements(id),
  applied_on date not null,
  grounds text not null,
  outcome text not null default 'pending' check (outcome in ('pending','granted','refused','withdrawn')),
  new_expiry date,
  decided_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Native title, heritage, access, farm-in, joint venture and royalty agreements.
create table agreements (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  kind text not null check (kind in ('native title','heritage','land access','farm-in','joint venture','royalty','other')),
  title text not null,
  counterparty text not null,
  project_id uuid references projects(id),
  signed_on date,
  ends_on date,
  summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Conditions and endorsements written on the grant.
create table conditions (
  id uuid primary key default gen_random_uuid(),
  tenement_id uuid not null references tenements(id),
  number int not null,
  text text not null,
  unique (tenement_id, number)
);

-- Anything else with a date: agreement payments, heritage notices, condition actions.
create table obligations (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  tenement_id uuid references tenements(id),
  agreement_id uuid references agreements(id),
  due_on date not null,
  done_on date,
  owner text not null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ASX quarters for listed groups. due_on is one month after the quarter ends.
create table asx_quarters (
  code text primary key,
  starts_on date not null,
  ends_on date not null,
  due_on date not null,
  reported_on date,
  check (ends_on > starts_on)
);

create table activity (
  id bigint generated always as identity primary key,
  entity_id text not null,
  action text not null,
  actor text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create trigger holders_touch before update on holders for each row execute function touch_updated_at();
create trigger projects_touch before update on projects for each row execute function touch_updated_at();
create trigger tenements_touch before update on tenements for each row execute function touch_updated_at();
create trigger exemptions_touch before update on exemptions for each row execute function touch_updated_at();
create trigger extensions_touch before update on extensions for each row execute function touch_updated_at();
create trigger agreements_touch before update on agreements for each row execute function touch_updated_at();
create trigger obligations_touch before update on obligations for each row execute function touch_updated_at();

create index interests_tenement on interests (tenement_id);
create index expenditure_tenement on expenditure (tenement_id, spent_on);
create index obligations_due on obligations (due_on) where done_on is null;

insert into rules (code, jurisdiction, title, label, rule, source) values
  ('FORM5', 'WA', 'Operations report (Form 5)', 'Form 5', 'Lodge the Form 5 within 60 days after each anniversary of the start of the term. Mining Act 1978 ss 51, 68, 70H and 82; Mining Regulations 1981 regs 16, 22, 23E and 32.', 'https://www.dmp.wa.gov.au/Operations-Reports-Expenditure-5702.aspx'),
  ('FORM5-FINAL', 'WA', 'Final operations report', 'final Form 5', 'Lodge a Form 5 within 60 days after the tenement ends by surrender, expiry or forfeiture.', 'https://www.dmp.wa.gov.au/Operations-Reports-Expenditure-5702.aspx'),
  ('RENT', 'WA', 'Annual rent', 'rent', 'Rent for the second and later years is paid yearly in advance, no later than one month after the anniversary of the start of the term. Mining Regulations 1981 reg 109; non-payment leads to forfeiture action under regs 49 and 50.', 'https://www.dmp.wa.gov.au/Debt-Recovery-Procedure-for-26920.aspx'),
  ('EXEMPTION', 'WA', 'Expenditure exemption (Form 18)', 'expenditure exemption', 'Where the minimum expenditure was not met, apply for exemption within 60 days after the end of the expenditure year it relates to.', 'https://www.dmp.wa.gov.au/Operations-Reports-Expenditure-5702.aspx'),
  ('CPS', 'WA', 'Compulsory partial surrender', 'partial surrender', 'Exploration licences applied for on or after 10 February 2006 surrender 40 per cent of their blocks at the end of the sixth year, lodged (Form 14 with a map) before the sixth anniversary. No exemption or deferral. Not needed at 10 blocks or fewer. Mining Act 1978 s 65.', 'https://www.dmp.wa.gov.au/Minerals/Compulsory-Partial-Surrender-5701.aspx'),
  ('EXPIRY', 'WA', 'Extension of term', 'extension of term', 'Apply to extend before the expiry date. The licence stays in force until the application is decided. Mining Act 1978 s 61; grounds in Mining Regulations 1981 reg 23AB.', 'https://www.wa.gov.au/organisation/department-of-mines-petroleum-and-exploration/extensions-of-term-exploration-licences'),
  ('ASX-QUARTER', 'ASX', 'Quarterly tenement schedule', 'ASX tenement schedule', 'A mining exploration entity''s quarterly activity report lists tenements held at the end of the quarter and where they are, tenements acquired and disposed of in the quarter, and farm-in and farm-out interests held, acquired and disposed of. It goes to ASX with the Appendix 5B, within one month after the quarter ends. ASX Listing Rules 5.3.3 and 5.5.', 'https://www.asx.com.au/about/regulation/rules-guidance-notes-and-waivers/asx-listing-rules-guidance-notes-and-waivers'),
  ('OBLIGATION', 'any', 'Agreement and condition obligations', 'obligation', 'The date written in your own agreement or tenement condition. The register records it; your agreement is the source.', 'your agreement or grant');

-- form5: the types the Form 5 provisions name (prospecting, exploration and retention licences, mining leases).
insert into tenement_types (code, name, term_years, form5, cps) values
  ('E', 'Exploration licence', 5, true, true),
  ('P', 'Prospecting licence', 4, true, false),
  ('M', 'Mining lease', 21, true, false),
  ('R', 'Retention licence', 5, true, false),
  ('L', 'Miscellaneous licence', 21, false, false),
  ('G', 'General purpose lease', 21, false, false);

insert into expenditure_categories (code, name) values
  ('drilling', 'Drilling'),
  ('geophysics', 'Geophysical surveys'),
  ('geochemistry', 'Geochemistry and assays'),
  ('geology', 'Geological mapping and interpretation'),
  ('heritage', 'Heritage surveys and land access'),
  ('earthworks', 'Access tracks and earthworks'),
  ('rehabilitation', 'Rehabilitation'),
  ('administration', 'Administration and overheads'),
  ('rates', 'Rent and shire rates'),
  ('other', 'Other');

-- ---------- views ----------

-- One row per tenement with the tenement year it is in today.
create view tenement_years as
select t.*, ty.name as type_name, ty.cps as type_cps, ty.form5 as type_form5, p.code as project, p.name as project_name,
       y.years_done,
       case when t.granted_on is not null then (t.granted_on + make_interval(years => y.years_done))::date end as last_anniversary,
       case when t.granted_on is not null then (t.granted_on + make_interval(years => y.years_done + 1))::date end as next_anniversary,
       case when t.granted_on is not null and y.years_done >= 1 then (t.granted_on + make_interval(years => y.years_done - 1))::date end as prev_anniversary
from tenements t
join tenement_types ty on ty.code = t.type_code
left join projects p on p.id = t.project_id
cross join lateral (select case when t.granted_on is null or t.granted_on > current_date then 0
                                else extract(year from age(current_date, t.granted_on))::int end as years_done) y;

-- Spend in the current tenement year and the year that just ended, against the commitment.
create view tenement_spend as
select ty.id, ty.ref, ty.project, ty.manager, ty.status, ty.commitment_cents,
       ty.last_anniversary as year_started, ty.next_anniversary as year_ends,
       coalesce((select sum(e.amount_cents) from expenditure e where e.tenement_id = ty.id
                 and e.spent_on >= ty.last_anniversary and e.spent_on < ty.next_anniversary), 0)::bigint as spent_this_year_cents,
       ty.prev_anniversary as last_year_started,
       coalesce((select sum(e.amount_cents) from expenditure e where e.tenement_id = ty.id
                 and e.spent_on >= ty.prev_anniversary and e.spent_on < ty.last_anniversary), 0)::bigint as spent_last_year_cents,
       case when ty.next_anniversary is not null then ty.next_anniversary - current_date end as days_left_in_year
from tenement_years ty
where ty.status = 'live';

-- Every dated obligation, done or not. kind is the rule code; due_on is the last day to act.
create view tenement_calendar as
-- Form 5 for the year that ended at the last anniversary.
select ty.id as tenement_id, ty.ref, ty.project, ty.manager, 'FORM5' as kind,
       'Form 5 for the year ending ' || ty.last_anniversary as item,
       ty.last_anniversary + 60 as due_on, f.lodged_on as done_on
from tenement_years ty
left join form5_reports f on f.tenement_id = ty.id and f.year_ending = ty.last_anniversary
where ty.status = 'live' and ty.years_done >= 1 and ty.type_form5
union all
-- Final Form 5 once a tenement ends.
select t.id, t.ref, p.code, t.manager, 'FORM5-FINAL', 'Final Form 5 (ended ' || t.ended_on || ')',
       t.ended_on + 60, f.lodged_on
from tenements t
left join projects p on p.id = t.project_id
join tenement_types tt on tt.code = t.type_code and tt.form5
left join form5_reports f on f.tenement_id = t.id and f.year_ending = t.ended_on
where t.ended_on is not null and t.granted_on is not null and t.status in ('surrendered','expired','forfeited')
union all
-- Rent for the year that started at the last anniversary.
select ty.id, ty.ref, ty.project, ty.manager, 'RENT', 'Rent for the year from ' || ty.last_anniversary,
       (ty.last_anniversary + interval '1 month')::date, r.paid_on
from tenement_years ty
left join rent_payments r on r.tenement_id = ty.id and r.year_starting = ty.last_anniversary
where ty.status = 'live' and ty.years_done >= 1
union all
-- Next year's rent, so it shows up before the anniversary.
select ty.id, ty.ref, ty.project, ty.manager, 'RENT', 'Rent for the year from ' || ty.next_anniversary,
       (ty.next_anniversary + interval '1 month')::date, r.paid_on
from tenement_years ty
left join rent_payments r on r.tenement_id = ty.id and r.year_starting = ty.next_anniversary
where ty.status = 'live' and ty.next_anniversary <= current_date + 60 and (ty.expires_on is null or ty.next_anniversary < ty.expires_on)
union all
-- Exemption window when last year's spend fell short of the commitment.
select s.id, s.ref, s.project, s.manager, 'EXEMPTION',
       'Expenditure exemption: spent ' || to_char(s.spent_last_year_cents / 100.0, 'FM999,999,990') || ' of ' || to_char(s.commitment_cents / 100.0, 'FM999,999,990') || ' in the year ending ' || s.year_started,
       s.year_started + 60, x.lodged_on
from tenement_spend s
left join exemptions x on x.tenement_id = s.id and x.year_ending = s.year_started
where s.last_year_started is not null and coalesce(s.commitment_cents, 0) > s.spent_last_year_cents
union all
-- Compulsory partial surrender before the sixth anniversary.
select ty.id, ty.ref, ty.project, ty.manager, 'CPS', 'Compulsory partial surrender (40% of ' || trim_scale(ty.area) || ' blocks)',
       (ty.granted_on + interval '6 years')::date - 1,
       (select min(s.lodged_on) from surrenders s where s.tenement_id = ty.id and s.kind in ('compulsory partial','voluntary partial')
          and s.lodged_on < (ty.granted_on + interval '6 years')::date)
from tenement_years ty
where ty.status = 'live' and ty.type_cps and ty.applied_on >= date '2006-02-10' and ty.area_unit = 'blocks' and ty.area > 10
  and (ty.granted_on + interval '6 years')::date >= current_date - 365
union all
-- Expiry: an extension application must be in before the term ends.
select ty.id, ty.ref, ty.project, ty.manager, 'EXPIRY', 'Term ends ' || ty.expires_on || ': apply to extend or let it go',
       ty.expires_on - 1,
       (select max(x.applied_on) from extensions x where x.tenement_id = ty.id and x.applied_on < ty.expires_on and x.applied_on >= ty.expires_on - 365)
from tenement_years ty
where ty.status = 'live' and ty.expires_on is not null and ty.expires_on <= current_date + 365
union all
select o.tenement_id, coalesce(t.ref, a.code), coalesce(p.code, ap.code), o.owner, 'OBLIGATION', o.title || ' (' || o.code || ')', o.due_on, o.done_on
from obligations o
left join tenements t on t.id = o.tenement_id
left join projects p on p.id = t.project_id
left join agreements a on a.id = o.agreement_id
left join projects ap on ap.id = a.project_id
union all
select null, q.code, null, 'company secretary', 'ASX-QUARTER', 'Quarterly tenement schedule for the quarter ending ' || q.ends_on, q.due_on, q.reported_on
from asx_quarters q;

-- Open items with the rule behind each and days left (negative = late).
create view open_dates as
select c.*, c.due_on - current_date as days_left, r.title as rule_title, r.label, r.rule, r.source
from tenement_calendar c
join rules r on r.code = c.kind
where c.done_on is null;

-- What needs a person now, worst first.
create view attention_queue as
select case when days_left < 0 then 1 else 3 end as rank,
       case when days_left < 0 then 'late: ' else 'due: ' end || label as item,
       ref, project, manager as owner, item as detail, due_on, days_left
from open_dates
where days_left <= 30
union all
select 2, 'commitment not met yet', s.ref, s.project, s.manager,
       'spent ' || to_char(s.spent_this_year_cents / 100.0, 'FM999,999,990') || ' of ' || to_char(s.commitment_cents / 100.0, 'FM999,999,990') || ', year ends ' || s.year_ends,
       s.year_ends - 1, s.days_left_in_year
from tenement_spend s
where coalesce(s.commitment_cents, 0) > s.spent_this_year_cents and s.days_left_in_year <= 120
union all
select 4, 'exemption still undecided', t.ref, p.code, t.manager,
       'lodged ' || x.lodged_on || ' for the year ending ' || x.year_ending, x.lodged_on, x.lodged_on - current_date
from exemptions x join tenements t on t.id = x.tenement_id left join projects p on p.id = t.project_id
where x.outcome = 'pending' and x.lodged_on <= current_date - 90;

-- Rule findings: late is a breach, due inside 30 days is a warning.
create view compliance_findings as
select kind as rule, case when days_left < 0 then 'breach' else 'warning' end as severity, ref, project,
       item || case when days_left < 0 then ': ' || abs(days_left) || ' days late (due ' || due_on || ')' else ': due ' || due_on || ', ' || days_left || ' days left' end
       || '. ' || rule as finding
from open_dates
where days_left <= 30
union all
-- Rent paid late is a finding even after it is paid.
select 'RENT', 'warning', t.ref, p.code,
       'Rent for the year from ' || r.year_starting || ' paid ' || r.paid_on || ', after ' || (r.year_starting + interval '1 month')::date || '. Late payment can carry a penalty.'
from rent_payments r join tenements t on t.id = r.tenement_id left join projects p on p.id = t.project_id
where r.paid_on > (r.year_starting + interval '1 month')::date and r.year_starting >= current_date - 365
union all
select 'INTERESTS', 'warning', t.ref, p.code, 'Live tenement with interests adding up to ' || trim_scale(coalesce(sum(i.pct), 0)) || '%, not 100%. Check the register.'
from tenements t left join projects p on p.id = t.project_id
left join interests i on i.tenement_id = t.id and i.from_on <= current_date and (i.to_on is null or i.to_on > current_date) and i.nature in ('registered holder','joint venture')
where t.status = 'live'
group by t.id, t.ref, p.code
having coalesce(sum(i.pct), 0) <> 100;

-- Current holdings in one line per tenement.
create view tenement_register as
select ty.id, ty.ref, ty.type_name as type, ty.project, ty.status, ty.location, ty.applied_on, ty.granted_on, ty.expires_on, ty.ended_on,
       ty.area, ty.area_unit, ty.commitment_cents, ty.rent_cents, ty.manager, ty.years_done as tenement_year,
       (select string_agg(h.code || ' ' || trim_scale(i.pct) || '%' || case when i.nature <> 'registered holder' then ' (' || i.nature || ')' else '' end, ', ' order by i.pct desc)
          from interests i join holders h on h.id = i.holder_id
         where i.tenement_id = ty.id and i.from_on <= current_date and (i.to_on is null or i.to_on > current_date)) as holders,
       (select coalesce(sum(i.pct), 0) from interests i join holders h on h.id = i.holder_id
         where i.tenement_id = ty.id and h.in_group and i.from_on <= current_date and (i.to_on is null or i.to_on > current_date)) as group_pct
from tenement_years ty;

-- The group's interest in a tenement on a given day: used by the ASX schedule.
create function group_interest(t uuid, on_day date) returns numeric language sql stable as $$
  select coalesce(sum(i.pct), 0) from interests i join holders h on h.id = i.holder_id
  where i.tenement_id = t and h.in_group and i.from_on <= on_day and (i.to_on is null or i.to_on > on_day)
$$;

alter table rules enable row level security;
alter table tenement_types enable row level security;
alter table holders enable row level security;
alter table projects enable row level security;
alter table tenements enable row level security;
alter table interests enable row level security;
alter table expenditure_categories enable row level security;
alter table expenditure enable row level security;
alter table form5_reports enable row level security;
alter table rent_payments enable row level security;
alter table exemptions enable row level security;
alter table surrenders enable row level security;
alter table extensions enable row level security;
alter table agreements enable row level security;
alter table conditions enable row level security;
alter table obligations enable row level security;
alter table asx_quarters enable row level security;
alter table activity enable row level security;

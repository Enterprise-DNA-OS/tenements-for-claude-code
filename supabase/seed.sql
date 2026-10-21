-- Fictional demo data: a junior explorer with three West Australian projects, a joint venture and a farm-in.
-- Tenement numbers, holders and agreement parties are invented. Dates are relative to today, so the demo
-- always has late, due and clean work. Safe to run twice. Never load it into your real register.

insert into holders (code, name, abn, in_group) values
  ('RKR', 'Red Kite Resources Ltd', '11 000 000 001 (fictional)', true),
  ('SBM', 'Saltbush Minerals Pty Ltd', '11 000 000 002 (fictional)', true),
  ('MPL', 'Mulga Prospecting Pty Ltd', '11 000 000 003 (fictional)', false),
  ('WGL', 'Wattle Gold NL', '11 000 000 004 (fictional)', false)
on conflict (code) do nothing;

insert into projects (code, name, region, combined_reporting, manager) values
  ('LCG', 'Lake Carey Gold', 'Laverton, WA', 'C 41/2023 (fictional)', 'Jess Arnott'),
  ('MUR', 'Murchison Lithium', 'Cue, WA', null, 'Liam Okafor'),
  ('PIL', 'Pilbara Copper', 'Marble Bar, WA', null, 'Priya Shah')
on conflict (code) do nothing;

-- ref, type, project, status, location, applied, granted, expires, ended, area, unit, commitment, rent, manager
insert into tenements (ref, type_code, project_id, status, location, applied_on, granted_on, expires_on, ended_on, area, area_unit, commitment_cents, rent_cents, manager)
select v.ref, v.type_code, p.id, v.status, v.location, v.applied_on, v.granted_on, v.expires_on, v.ended_on, v.area, v.area_unit, v.commitment_cents, v.rent_cents, v.manager
from (values
  ('E 39/9101', 'E', 'LCG', 'live', 'Laverton, WA', (current_date - interval '3 years 200 days')::date, (current_date - interval '3 years 75 days')::date, (current_date - interval '3 years 75 days' + interval '5 years')::date, null::date, 40.00, 'blocks', 7000000, 680000, 'Jess Arnott'),
  ('E 39/9102', 'E', 'LCG', 'live', 'Laverton, WA', (current_date - interval '2 years 150 days')::date, (current_date - interval '2 years 40 days')::date, (current_date - interval '2 years 40 days' + interval '5 years')::date, null, 25.00, 'blocks', 5000000, 425000, 'Jess Arnott'),
  ('E 39/9103', 'E', 'LCG', 'live', 'Laverton, WA', (current_date - interval '6 years 120 days')::date, (current_date - interval '5 years 340 days')::date, (current_date - interval '5 years 340 days' + interval '10 years')::date, null, 70.00, 'blocks', 10000000, 1190000, 'Jess Arnott'),
  ('M 39/9104', 'M', 'LCG', 'live', 'Laverton, WA', (current_date - interval '8 years 300 days')::date, (current_date - interval '8 years 10 days')::date, (current_date - interval '8 years 10 days' + interval '21 years')::date, null, 480.00, 'ha', 4800000, 1104000, 'Jess Arnott'),
  ('L 39/9105', 'L', 'LCG', 'live', 'Laverton, WA', (current_date - interval '3 years 90 days')::date, (current_date - interval '3 years 5 days')::date, (current_date - interval '3 years 5 days' + interval '21 years')::date, null, 62.00, 'ha', null, 136400, 'Jess Arnott'),
  ('E 39/9106', 'E', 'LCG', 'live', 'Laverton, WA', (current_date - interval '1 year 30 days')::date, (current_date - 260), (current_date - 260 + interval '5 years')::date, null, 20.00, 'blocks', 4000000, 340000, 'Jess Arnott'),
  ('E 51/9201', 'E', 'MUR', 'live', 'Cue, WA', (current_date - interval '5 years 100 days')::date, ((current_date - interval '5 years')::date + 25), (current_date + 25), null, 18.00, 'blocks', 3000000, 306000, 'Liam Okafor'),
  ('E 51/9202', 'E', 'MUR', 'application', 'Cue, WA', (current_date - 120), null, null, null, 12.00, 'blocks', null, null, 'Liam Okafor'),
  ('E 51/9203', 'E', 'MUR', 'live', 'Cue, WA', (current_date - interval '1 year 140 days')::date, (current_date - interval '1 year 20 days')::date, (current_date - interval '1 year 20 days' + interval '5 years')::date, null, 15.00, 'blocks', 3000000, 255000, 'Liam Okafor'),
  ('P 51/9204', 'P', 'MUR', 'live', 'Cue, WA', (current_date - interval '2 years 180 days')::date, (current_date - interval '2 years 100 days')::date, (current_date - interval '2 years 100 days' + interval '4 years')::date, null, 120.00, 'ha', 600000, 42000, 'Liam Okafor'),
  ('E 45/9301', 'E', 'PIL', 'live', 'Marble Bar, WA', (current_date - interval '6 years 200 days')::date, (current_date - interval '6 years 30 days')::date, (current_date - interval '6 years 30 days' + interval '10 years')::date, null, 36.00, 'blocks', 7000000, 920000, 'Priya Shah'),
  ('E 45/9302', 'E', 'PIL', 'surrendered', 'Marble Bar, WA', (current_date - interval '4 years 120 days')::date, (current_date - interval '4 years 60 days')::date, (current_date - interval '4 years 60 days' + interval '5 years')::date, (date_trunc('quarter', current_date)::date - 20), 14.00, 'blocks', 2000000, 238000, 'Priya Shah'),
  ('E 45/9303', 'E', 'PIL', 'live', 'Marble Bar, WA', (current_date - interval '3 years 60 days')::date, (current_date - interval '2 years 300 days')::date, (current_date - interval '2 years 300 days' + interval '5 years')::date, null, 30.00, 'blocks', 6000000, 510000, 'Priya Shah')
) as v(ref, type_code, project, status, location, applied_on, granted_on, expires_on, ended_on, area, area_unit, commitment_cents, rent_cents, manager)
join projects p on p.code = v.project
on conflict (ref) do nothing;

-- Interests. E 45/9301 is a joint venture whose split moved in the last quarter; E 45/9303 is Wattle Gold's
-- licence that Red Kite is earning into.
insert into interests (tenement_id, holder_id, pct, nature, from_on, to_on, note)
select t.id, h.id, v.pct, v.nature, coalesce(v.from_on, t.granted_on, t.applied_on), v.to_on, v.note
from (values
  ('E 39/9101', 'RKR', 100.00, 'registered holder', null::date, null::date, null),
  ('E 39/9102', 'RKR', 100.00, 'registered holder', null, null, null),
  ('E 39/9103', 'RKR', 100.00, 'registered holder', null, null, null),
  ('M 39/9104', 'RKR', 100.00, 'registered holder', null, null, null),
  ('L 39/9105', 'RKR', 100.00, 'registered holder', null, null, null),
  ('E 39/9106', 'RKR', 100.00, 'registered holder', null, null, null),
  ('E 51/9201', 'SBM', 100.00, 'registered holder', null, null, null),
  ('E 51/9202', 'SBM', 100.00, 'registered holder', null, null, 'application'),
  ('E 51/9203', 'SBM', 100.00, 'registered holder', null, null, null),
  ('P 51/9204', 'SBM', 100.00, 'registered holder', null, null, null),
  ('E 45/9301', 'RKR', 70.00, 'joint venture', null, (date_trunc('quarter', current_date)::date - 45), 'before the second earn-in milestone'),
  ('E 45/9301', 'MPL', 30.00, 'joint venture', null, (date_trunc('quarter', current_date)::date - 45), 'before the second earn-in milestone'),
  ('E 45/9301', 'RKR', 80.00, 'joint venture', (date_trunc('quarter', current_date)::date - 45), null, 'second earn-in milestone met'),
  ('E 45/9301', 'MPL', 20.00, 'joint venture', (date_trunc('quarter', current_date)::date - 45), null, 'second earn-in milestone met'),
  ('E 45/9302', 'RKR', 100.00, 'registered holder', null, (date_trunc('quarter', current_date)::date - 20), 'surrendered'),
  ('E 45/9303', 'WGL', 100.00, 'registered holder', null, null, null),
  ('E 45/9303', 'RKR', 51.00, 'farm-in', (date_trunc('quarter', current_date)::date - 60), null, 'farm-in: 51% on spending the first stage')
) as v(ref, holder, pct, nature, from_on, to_on, note)
join tenements t on t.ref = v.ref
join holders h on h.code = v.holder
where not exists (select 1 from interests i where i.tenement_id = t.id and i.holder_id = h.id and i.nature = v.nature
                  and i.from_on = coalesce(v.from_on, t.granted_on, t.applied_on));

-- Expenditure, placed by tenement year: 'last' is the year that ended at the last anniversary, 'this' the year
-- running now. E 39/9101 and P 51/9204 fell short last year; everything else met its commitment.
insert into expenditure (tenement_id, spent_on, category, amount_cents, description, supplier, source, source_hash)
select y.id, (case v.yr when 'last' then y.prev_anniversary else y.last_anniversary end) + v.day, v.category, v.cents, v.description, v.supplier, 'seed', v.h
from (values
  ('s01', 'E 39/9101', 'last', 40, 'drilling', 2900000, 'RC drilling, 14 holes for 1,820 m', 'Goldfields Drilling (fictional)'),
  ('s02', 'E 39/9101', 'last', 95, 'geochemistry', 950000, 'Assays for the RC programme', 'Kalgoorlie Assay Labs (fictional)'),
  ('s03', 'E 39/9101', 'last', 120, 'geology', 850000, 'Logging and interpretation', null),
  ('s04', 'E 39/9101', 'last', 200, 'administration', 500000, 'Tenement administration share', null),
  ('s05', 'E 39/9101', 'this', 20, 'heritage', 1250000, 'Heritage survey with the native title group', null),
  ('s06', 'E 39/9102', 'last', 60, 'geophysics', 2400000, 'Ground gravity survey', 'Outback Geophysics (fictional)'),
  ('s07', 'E 39/9102', 'last', 180, 'drilling', 3200000, 'Aircore drilling, 60 holes', 'Goldfields Drilling (fictional)'),
  ('s08', 'E 39/9102', 'last', 300, 'administration', 550000, 'Tenement administration share', null),
  ('s09', 'E 39/9103', 'last', 50, 'drilling', 7800000, 'Diamond drilling, 4 holes', 'Deep Core Drilling (fictional)'),
  ('s10', 'E 39/9103', 'last', 150, 'geochemistry', 2600000, 'Assays and petrology', 'Kalgoorlie Assay Labs (fictional)'),
  ('s11', 'E 39/9103', 'this', 90, 'drilling', 6100000, 'RC drilling, 18 holes', 'Goldfields Drilling (fictional)'),
  ('s12', 'E 39/9103', 'this', 200, 'geology', 900000, 'Resource model update', null),
  ('s13', 'M 39/9104', 'last', 100, 'drilling', 3600000, 'Grade control drilling', 'Goldfields Drilling (fictional)'),
  ('s14', 'M 39/9104', 'last', 250, 'rehabilitation', 1500000, 'Waste dump rehabilitation', null),
  ('s15', 'E 39/9106', 'this', 60, 'geochemistry', 600000, 'Soil sampling, 400 samples', 'Kalgoorlie Assay Labs (fictional)'),
  ('s16', 'E 51/9201', 'last', 80, 'drilling', 2200000, 'RC drilling on the pegmatite swarm', 'Murchison Drilling (fictional)'),
  ('s17', 'E 51/9201', 'last', 160, 'geochemistry', 900000, 'Lithium assays', 'Kalgoorlie Assay Labs (fictional)'),
  ('s18', 'E 51/9201', 'this', 40, 'geology', 2700000, 'Mapping and rock chip sampling', null),
  ('s19', 'E 51/9201', 'this', 250, 'drilling', 1100000, 'Follow-up RC drilling', 'Murchison Drilling (fictional)'),
  ('s20', 'E 51/9203', 'last', 100, 'geophysics', 1800000, 'Airborne magnetics', 'Outback Geophysics (fictional)'),
  ('s21', 'E 51/9203', 'last', 250, 'geology', 1620000, 'Mapping and interpretation', null),
  ('s22', 'P 51/9204', 'last', 70, 'geology', 185000, 'Prospecting and mapping', null),
  ('s23', 'E 45/9301', 'last', 90, 'drilling', 5400000, 'RC drilling at the main prospect', 'Pilbara Drilling (fictional)'),
  ('s24', 'E 45/9301', 'last', 200, 'geochemistry', 2100000, 'Copper assays', 'Kalgoorlie Assay Labs (fictional)'),
  ('s25', 'E 45/9301', 'this', 15, 'earthworks', 800000, 'Access track repairs after the wet', null),
  ('s26', 'E 45/9303', 'last', 120, 'drilling', 4100000, 'Farm-in stage one drilling', 'Pilbara Drilling (fictional)'),
  ('s27', 'E 45/9303', 'last', 260, 'geochemistry', 2300000, 'Farm-in stage one assays', 'Kalgoorlie Assay Labs (fictional)')
) as v(h, ref, yr, day, category, cents, description, supplier)
join tenement_years y on y.ref = v.ref
where not exists (select 1 from expenditure e where e.source_hash = v.h);

-- Form 5s lodged. E 39/9101 has not lodged for the year that just ended, and is late.
insert into form5_reports (tenement_id, year_ending, lodged_on, reported_cents, receipt, combined)
select y.id, case v.which when 'last' then y.last_anniversary else y.prev_anniversary end,
       (case v.which when 'last' then y.last_anniversary else y.prev_anniversary end) + v.lodged_after, v.cents, v.receipt, v.combined
from (values
  ('E 39/9101', 'prev', 41, 7400000, 'F5-0001 (fictional)', true),
  ('E 39/9102', 'prev', 38, 5200000, 'F5-0002 (fictional)', true),
  ('E 39/9103', 'last', 44, 10400000, 'F5-0003 (fictional)', true),
  ('M 39/9104', 'prev', 50, 5100000, 'F5-0004 (fictional)', true),
  ('E 51/9201', 'last', 30, 3100000, 'F5-0005 (fictional)', false),
  ('P 51/9204', 'last', 52, 185000, 'F5-0006 (fictional)', false),
  ('E 45/9301', 'last', 20, 7500000, 'F5-0007 (fictional)', false),
  ('E 45/9303', 'last', 33, 6400000, 'F5-0008 (fictional)', false)
) as v(ref, which, lodged_after, cents, receipt, combined)
join tenement_years y on y.ref = v.ref
on conflict (tenement_id, year_ending) do nothing;

-- Rent for the current year. E 39/9102 is late; M 39/9104 and E 51/9203 are due soon; P 51/9204 paid late.
insert into rent_payments (tenement_id, year_starting, paid_on, amount_cents, receipt)
select y.id, y.last_anniversary, y.last_anniversary + v.paid_after, y.rent_cents, v.receipt
from (values
  ('E 39/9101', 12, 'R-1001 (fictional)'),
  ('E 39/9103', 9, 'R-1002 (fictional)'),
  ('L 39/9105', -10, 'R-1003 (fictional)'),
  ('E 51/9201', 14, 'R-1004 (fictional)'),
  ('P 51/9204', 45, 'R-1005 (fictional)'),
  ('E 45/9301', 7, 'R-1006 (fictional)'),
  ('E 45/9303', 20, 'R-1007 (fictional)')
) as v(ref, paid_after, receipt)
join tenement_years y on y.ref = v.ref
on conflict (tenement_id, year_starting) do nothing;

-- P 51/9204 fell short and applied for exemption in time; the department has not decided.
insert into exemptions (tenement_id, year_ending, lodged_on, shortfall_cents, grounds, outcome)
select y.id, y.last_anniversary, y.last_anniversary + 50, y.commitment_cents - 185000,
       'Access to the eastern half was blocked by a pastoral lease dispute for most of the year.', 'pending'
from tenement_years y where y.ref = 'P 51/9204'
on conflict (tenement_id, year_ending) do nothing;

-- E 45/9301 made its compulsory partial surrender before the sixth anniversary (60 blocks down to 36).
insert into surrenders (tenement_id, kind, lodged_on, area_surrendered, effective_on)
select t.id, 'compulsory partial', (t.granted_on + interval '6 years')::date - 25, 24.00, (t.granted_on + interval '6 years')::date
from tenements t where t.ref = 'E 45/9301'
  and not exists (select 1 from surrenders s where s.tenement_id = t.id);
insert into surrenders (tenement_id, kind, lodged_on, area_surrendered, effective_on)
select t.id, 'full', t.ended_on - 5, t.area, t.ended_on
from tenements t where t.ref = 'E 45/9302'
  and not exists (select 1 from surrenders s where s.tenement_id = t.id);

-- Both extended licences were extended for five years.
insert into extensions (tenement_id, applied_on, grounds, outcome, new_expiry, decided_on)
select t.id, (t.granted_on + interval '5 years')::date - 60, 'Heritage survey delays held up the drilling programme.', 'granted',
       (t.granted_on + interval '10 years')::date, (t.granted_on + interval '5 years')::date + 40
from tenements t where t.ref in ('E 39/9103', 'E 45/9301')
  and not exists (select 1 from extensions x where x.tenement_id = t.id);

insert into agreements (code, kind, title, counterparty, project_id, signed_on, summary)
select v.code, v.kind, v.title, v.counterparty, p.id, v.signed_on, v.summary
from (values
  ('NT-01', 'native title', 'Lake Carey native title agreement', 'Ngurra Native Title Group (fictional)', 'LCG', (current_date - interval '4 years')::date, 'Annual payment each year on the signing anniversary; heritage surveys before ground disturbance.'),
  ('HA-01', 'heritage', 'Lake Carey heritage protocol', 'Ngurra Native Title Group (fictional)', 'LCG', (current_date - interval '4 years')::date, '21 days notice of any drilling programme; survey teams booked through the group.'),
  ('LA-01', 'land access', 'Yarri Downs Station access', 'Yarri Downs Pastoral Co (fictional)', 'MUR', (current_date - interval '2 years')::date, '14 days notice before entry; gates left as found; tracks repaired.'),
  ('JV-01', 'joint venture', 'Pilbara Copper joint venture', 'Mulga Prospecting Pty Ltd', 'PIL', (current_date - interval '5 years')::date, 'Red Kite earns to 80% in two milestones; Mulga free-carried to a decision to mine.'),
  ('FI-01', 'farm-in', 'Wattle farm-in', 'Wattle Gold NL', 'PIL', (current_date - 200), 'Red Kite earns 51% of E 45/9303 by spending the stage one amount in two years, 75% with stage two.')
) as v(code, kind, title, counterparty, project, signed_on, summary)
join projects p on p.code = v.project
on conflict (code) do nothing;

insert into conditions (tenement_id, number, text)
select t.id, v.n, v.text from (values
  ('E 39/9101', 1, 'All surface holes drilled for exploration are to be capped, filled or otherwise made safe after completion.'),
  ('E 39/9101', 2, 'All disturbances to the surface of the land made as a result of exploration are to be backfilled and rehabilitated.'),
  ('E 51/9203', 1, 'No exploration within 100 metres of the Cue water reserve boundary without written approval.')
) as v(ref, n, text)
join tenements t on t.ref = v.ref
on conflict (tenement_id, number) do nothing;

insert into obligations (code, title, tenement_id, agreement_id, due_on, done_on, owner, note)
select v.code, v.title, t.id, a.id, v.due_on, v.done_on, v.owner, v.note
from (values
  ('OB-01', 'Annual payment under the native title agreement', null, 'NT-01', (current_date - 5), null::date, 'Jess Arnott', 'Paid by the finance team on the agreement anniversary'),
  ('OB-02', 'Give 21 days notice of the drilling programme', 'E 39/9102', 'HA-01', (current_date + 7), null, 'Jess Arnott', 'Drilling planned for next month'),
  ('OB-03', 'Notify Yarri Downs 14 days before the field crew goes in', 'E 51/9203', 'LA-01', (current_date - 2), (current_date - 3), 'Liam Okafor', null),
  ('OB-04', 'Rehabilitate the March drill pads (condition 2)', 'E 39/9101', null, (current_date + 45), null, 'Jess Arnott', null),
  ('OB-05', 'Stage one farm-in expenditure statement to Wattle Gold', 'E 45/9303', 'FI-01', (current_date + 21), null, 'Priya Shah', null)
) as v(code, title, ref, agreement, due_on, done_on, owner, note)
left join tenements t on t.ref = v.ref
left join agreements a on a.code = v.agreement
on conflict (code) do nothing;

-- The last two ASX quarters. The one before last was reported; the last one is not reported yet.
insert into asx_quarters (code, starts_on, ends_on, due_on, reported_on)
select to_char(e, 'YYYY-MM'), date_trunc('quarter', e)::date, e::date,
       ((e + interval '1 day') + interval '1 month' - interval '1 day')::date, r
from (values
  ((date_trunc('quarter', current_date) - interval '1 day')::date, null::date),
  ((date_trunc('quarter', current_date) - interval '3 months' - interval '1 day')::date,
   (date_trunc('quarter', current_date) - interval '3 months' - interval '1 day' + interval '28 days')::date)
) as v(e, r)
on conflict (code) do nothing;

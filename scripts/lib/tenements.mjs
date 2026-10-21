// The tenement desk: every read and write the CLI offers, in one place.
// scripts/tenements.mjs parses the command line; scripts/smoke.mjs drives this directly.
import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { REPO_ROOT } from './db.mjs';
import { parseCsv } from './csv.mjs';
import { table } from './format.mjs';

export const TABLES = ['rules', 'tenement_types', 'holders', 'projects', 'tenements', 'interests', 'expenditure_categories', 'expenditure',
  'form5_reports', 'rent_payments', 'exemptions', 'surrenders', 'extensions', 'agreements', 'conditions', 'obligations', 'asx_quarters', 'activity'];

// Reads with no arguments. Each is one query against the shared views.
export const READS = {
  tenements: `select ref, type, project, status, location, granted_on, expires_on, area, area_unit, holders, commitment_cents, manager
      from tenement_register order by project nulls last, ref`,
  applications: `select ref, type, project, location, applied_on, current_date - applied_on as days_waiting, area, area_unit, holders
      from tenement_register where status = 'application' order by applied_on`,
  holders: `select h.code, h.name, h.abn, h.in_group,
      (select count(distinct i.tenement_id)::int from interests i where i.holder_id = h.id and (i.to_on is null or i.to_on > current_date)) as tenements
      from holders h order by in_group desc, code`,
  projects: `select p.code, p.name, p.region, p.combined_reporting, p.manager,
      (select count(*)::int from tenements t where t.project_id = p.id and t.status in ('live','application')) as tenements,
      (select coalesce(sum(s.commitment_cents), 0)::bigint from tenement_spend s where s.project = p.code) as commitment_cents,
      (select coalesce(sum(s.spent_this_year_cents), 0)::bigint from tenement_spend s where s.project = p.code) as spent_this_year_cents
      from projects p order by code`,
  interests: `select t.ref, h.code as holder, h.name, trim_scale(i.pct) as pct, i.nature, i.from_on, i.to_on, i.note
      from interests i join tenements t on t.id = i.tenement_id join holders h on h.id = i.holder_id
      where i.to_on is null or i.to_on > current_date - 365 order by t.ref, i.from_on, i.pct desc`,
  calendar: `select due_on, days_left, label as what, ref, project, manager as owner, item as detail
      from open_dates where due_on <= current_date + 365 order by due_on, ref`,
  attention: 'select item, ref, project, owner, detail, due_on, days_left from attention_queue order by rank, due_on, ref',
  compliance: `select rule, severity, ref, project, finding from compliance_findings
      order by case severity when 'breach' then 0 else 1 end, rule, ref`,
  rents: `select c.ref, c.project, c.item as detail, c.due_on, c.due_on - current_date as days_left, t.rent_cents
      from tenement_calendar c join tenements t on t.id = c.tenement_id where c.kind = 'RENT' and c.done_on is null order by c.due_on, c.ref`,
  form5: `select ref, project, item as detail, due_on, days_left, manager as owner from open_dates
      where kind in ('FORM5','FORM5-FINAL') order by due_on, ref`,
  expenditure: `select ref, project, year_started, year_ends, days_left_in_year, commitment_cents, spent_this_year_cents,
      greatest(coalesce(commitment_cents, 0) - spent_this_year_cents, 0) as still_to_spend_cents,
      case when coalesce(commitment_cents, 0) = 0 then null else round(100.0 * spent_this_year_cents / commitment_cents)::int end as pct_spent
      from tenement_spend order by days_left_in_year, ref`,
  shortfalls: `select s.ref, s.project, s.last_year_started, s.year_started as year_ended, s.commitment_cents, s.spent_last_year_cents,
      s.commitment_cents - s.spent_last_year_cents as shortfall_cents, s.year_started + 60 as exemption_by, x.lodged_on as exemption_lodged, x.outcome
      from tenement_spend s left join exemptions x on x.tenement_id = s.id and x.year_ending = s.year_started
      where s.last_year_started is not null and coalesce(s.commitment_cents, 0) > s.spent_last_year_cents order by s.year_started, s.ref`,
  surrenders: `select c.ref, c.project, c.item as detail, c.due_on as lodge_by, c.done_on as lodged_on,
      case when c.done_on is null then c.due_on - current_date end as days_left
      from tenement_calendar c where c.kind = 'CPS' order by c.due_on, c.ref`,
  expiring: `select r.ref, r.project, r.type, r.expires_on, r.expires_on - current_date as days_left, r.tenement_year,
      (select x.outcome || ' (applied ' || x.applied_on || ')' from extensions x where x.tenement_id = r.id order by x.applied_on desc limit 1) as last_extension
      from tenement_register r where r.status = 'live' and r.expires_on <= current_date + 365 order by r.expires_on`,
  exemptions: `select t.ref, x.year_ending, x.lodged_on, x.shortfall_cents, x.outcome, x.decided_on, x.grounds
      from exemptions x join tenements t on t.id = x.tenement_id order by x.lodged_on desc`,
  agreements: `select a.code, a.kind, a.title, a.counterparty, p.code as project, a.signed_on, a.ends_on,
      (select count(*)::int from obligations o where o.agreement_id = a.id and o.done_on is null) as open_obligations
      from agreements a left join projects p on p.id = a.project_id order by a.code`,
  obligations: `select o.code, o.title, coalesce(t.ref, a.code) as on, o.owner, o.due_on, o.due_on - current_date as days_left
      from obligations o left join tenements t on t.id = o.tenement_id left join agreements a on a.id = o.agreement_id
      where o.done_on is null order by o.due_on, o.code`,
  quarters: `select q.code, q.starts_on, q.ends_on, q.due_on, q.reported_on from asx_quarters q order by q.ends_on desc`,
  rules: 'select code, jurisdiction, title, rule, source from rules order by jurisdiction desc, code',
  activity: 'select entity_id, action, actor, detail, created_at from activity order by created_at desc, id desc limit 50',
};

// Ten questions, each one query. /insights runs them all.
export const QUESTIONS = [
  ['How much do we have to spend before each anniversary, and on which tenements?',
    `select ref, project, year_ends, commitment_cents - spent_this_year_cents as still_to_spend_cents from tenement_spend
     where coalesce(commitment_cents, 0) > spent_this_year_cents order by year_ends, ref`],
  ['What is our total annual commitment and rent, by project?',
    `select coalesce(project, '(none)') as project, count(*)::int as tenements, coalesce(sum(commitment_cents), 0)::bigint as commitment_cents,
       coalesce(sum(rent_cents), 0)::bigint as rent_cents from tenement_register where status = 'live' group by project order by commitment_cents desc`],
  ['How much did we spend on each kind of work over the last 12 months?',
    `select c.name as category, coalesce(sum(e.amount_cents), 0)::bigint as spent_cents, count(e.id)::int as entries from expenditure_categories c
     left join expenditure e on e.category = c.code and e.spent_on > current_date - 365 group by c.name having count(e.id) > 0 order by spent_cents desc`],
  ['Which tenements have needed an exemption, and how often?',
    `select t.ref, count(*)::int as exemptions, string_agg(x.outcome, ', ' order by x.year_ending) as outcomes from exemptions x
     join tenements t on t.id = x.tenement_id group by t.ref order by exemptions desc, t.ref`],
  ['What falls due in the next 90 days, by month?',
    `select to_char(due_on, 'YYYY-MM') as month, count(*)::int as items, string_agg(distinct label, ', ') as kinds from open_dates
     where due_on <= current_date + 90 group by 1 order by 1`],
  ['Which suppliers did we pay the most for work on the ground?',
    `select coalesce(supplier, '(own team)') as supplier, sum(amount_cents)::bigint as spent_cents, count(distinct tenement_id)::int as tenements
     from expenditure group by 1 order by spent_cents desc limit 10`],
  ['How long have our applications been waiting?', READS.applications],
  ['Which tenements are held with partners, and at what share?',
    `select ref, holders, group_pct from tenement_register where status in ('live','application') and group_pct < 100 order by ref`],
  ['Who carries the most open dates, and how many are late?',
    `select manager as owner, count(*)::int as open_items, count(*) filter (where days_left < 0)::int as late from open_dates
     where due_on <= current_date + 90 group by manager order by late desc, open_items desc`],
  ['Was rent paid on time over the last year?',
    `select t.ref, r.year_starting, r.paid_on, (r.year_starting + interval '1 month')::date as due_on,
       r.paid_on <= (r.year_starting + interval '1 month')::date as on_time from rent_payments r join tenements t on t.id = r.tenement_id
     where r.year_starting > current_date - 365 order by on_time, r.year_starting`],
];

// Command name -> [positional args, allowed flags]. Unknown flags fail before anything is written.
const SPECS = {
  ...Object.fromEntries(Object.keys(READS).map((k) => [k, [0, []]])),
  due: [0, ['days']],
  insights: [0, []],
  tenement: [1, []],
  project: [1, []],
  schedule: [1, []],
  'add-holder': [0, ['actor', 'code', 'name', 'abn', 'partner']],
  'add-project': [0, ['actor', 'code', 'name', 'region', 'combined', 'manager']],
  'add-tenement': [0, ['actor', 'ref', 'project', 'status', 'location', 'applied', 'granted', 'expires', 'area', 'unit', 'commitment', 'rent', 'manager', 'holder', 'pct']],
  grant: [1, ['actor', 'on', 'expires', 'commitment', 'rent']],
  interest: [1, ['actor', 'holder', 'pct', 'nature', 'from', 'note']],
  spend: [1, ['actor', 'on', 'category', 'amount', 'description', 'supplier']],
  'pay-rent': [1, ['actor', 'on', 'amount', 'receipt', 'year']],
  'lodge-form5': [1, ['actor', 'on', 'year-ending', 'amount', 'receipt', 'combined']],
  'lodge-exemption': [1, ['actor', 'on', 'grounds']],
  'decide-exemption': [1, ['actor', 'on', 'outcome', 'year-ending']],
  surrender: [1, ['actor', 'on', 'kind', 'area', 'effective']],
  'apply-extension': [1, ['actor', 'on', 'grounds']],
  'decide-extension': [1, ['actor', 'on', 'outcome', 'expires']],
  'add-agreement': [0, ['actor', 'code', 'kind', 'title', 'counterparty', 'project', 'signed', 'ends', 'summary']],
  'add-obligation': [0, ['actor', 'code', 'title', 'tenement', 'agreement', 'due', 'owner', 'note']],
  done: [1, ['actor', 'on']],
  'add-condition': [1, ['actor', 'number', 'text']],
  'add-quarter': [0, ['actor', 'ends']],
  'report-quarter': [1, ['actor', 'on']],
  import: [2, ['actor', 'map', 'dry-run', 'holder', 'project']],
  export: [0, ['file']],
  'weekly-review': [0, []],
  'draft-form5': [1, []],
  'draft-exemption': [1, []],
  'draft-extension': [1, []],
  'draft-schedule': [1, []],
};
export const COMMANDS = Object.keys(SPECS);

export function help() {
  return `Tenement desk. node scripts/tenements.mjs <command> [arguments] [--key=value] [--json]
${COMMANDS.join(', ')}
Exact syntax: docs/cli.md. Nothing here lodges with the department, pays rent or reports to ASX.`;
}

// ---------- small helpers ----------

const BOOL_FLAGS = new Set(['dry-run', 'combined', 'partner']);
function flag(o, k) {
  if (o[k] === undefined) return false;
  if (o[k] !== true) throw Error(`--${k} takes no value`);
  return true;
}
function required(o, k) {
  const v = o[k];
  if (typeof v !== 'string' || !v.trim()) throw Error(`Required --${k}=value`);
  return v.trim();
}
function optional(o, k) {
  const v = o[k];
  if (v === undefined) return null;
  if (typeof v !== 'string' || !v.trim()) throw Error(`--${k} needs a value`);
  return v.trim();
}
export function today() { return new Date().toISOString().slice(0, 10); }
export function isoDate(s, label = 'date') {
  const v = String(s ?? '');
  const au = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  const iso = au ? `${au[3]}-${au[2].padStart(2, '0')}-${au[1].padStart(2, '0')}` : v;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso) || new Date(iso + 'T00:00:00Z').toISOString().slice(0, 10) !== iso) throw Error(`Invalid ${label}: ${s} (use YYYY-MM-DD)`);
  return iso;
}
export function cents(value) {
  const s = String(value ?? '').replace(/^\$/, '').replaceAll(',', '');
  if (!/^\d{1,11}(\.\d{1,2})?$/.test(s)) throw Error('Amount must be a dollar figure like 70000 or 70,000.00');
  const [a, b = ''] = s.split('.');
  return Number(a) * 100 + Number(b.padEnd(2, '0'));
}
// "E39/9101", "e 39/9101" and "E 39/09101" all mean E 39/9101.
export function normaliseRef(s) {
  const m = String(s ?? '').trim().toUpperCase().match(/^([A-Z]{1,2})\s*(\d{1,2})\s*\/\s*0*(\d{1,6})(?:-[A-Z])?$/);
  if (!m) throw Error(`Not a tenement number: ${s} (expected the register's form, like E 39/9101)`);
  return `${m[1]} ${m[2]}/${m[3]}`;
}
function money(c) { return c == null ? 'none set' : '$' + (Number(c) / 100).toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 2 }); }
function actor(o) { return optional(o, 'actor') || 'operator'; }
const same = (a, b) => String(a ?? '').trim().toLowerCase() === String(b ?? '').trim().toLowerCase();

async function audit(db, id, action, who, detail = {}) {
  await db.query('insert into activity (entity_id, action, actor, detail) values ($1, $2, $3, $4)', [String(id), action, who, JSON.stringify(detail)]);
}
async function one(db, sql, params) { return (await db.query(sql, params))[0]; }

// Find one record by code, number, id prefix or name. Ambiguous or missing: list and stop.
async function pick(db, kind, ref) {
  if (!ref) throw Error(`Missing ${kind} reference`);
  const q = {
    tenement: "select id, ref as key, coalesce(location, '') as name from tenements order by ref",
    holder: 'select id, code as key, name from holders order by code',
    project: 'select id, code as key, name from projects order by code',
    agreement: 'select id, code as key, title as name from agreements order by code',
    obligation: 'select id, code as key, title as name from obligations order by code',
    quarter: 'select code as id, code as key, ends_on::text as name from asx_quarters order by code',
  }[kind];
  const rows = await db.query(q);
  const r = String(ref).toLowerCase();
  const squash = (s) => String(s).toLowerCase().replace(/\s+/g, '');
  let hits = rows.filter((x) => same(x.key, ref) || squash(x.key) === squash(ref) || same(x.id, ref) || same(x.name, ref));
  if (!hits.length) hits = rows.filter((x) => String(x.id).toLowerCase().startsWith(r) || squash(x.key).endsWith(squash(ref)) || squash(x.key).startsWith(squash(ref)) || String(x.name).toLowerCase().includes(r));
  if (hits.length !== 1) {
    throw Error(`${hits.length ? 'Ambiguous' : 'No matching'} ${kind}: ${ref}\n${(hits.length ? hits : rows).map((x) => `  ${x.key}  ${x.name}`).join('\n')}`);
  }
  return hits[0];
}
async function tenementRow(db, ref) {
  const hit = await pick(db, 'tenement', ref);
  return one(db, 'select * from tenement_years where id = $1', [hit.id]);
}
async function update(db, tableName, id, values) {
  const keys = Object.keys(values);
  return one(db, `update ${tableName} set ${keys.map((k, i) => `${k} = $${i + 2}`).join(', ')} where id = $1 returning *`, [id, ...Object.values(values)]);
}
async function insert(db, tableName, values) {
  const keys = Object.keys(values);
  return one(db, `insert into ${tableName} (${keys.join(', ')}) values (${keys.map((_, i) => '$' + (i + 1)).join(', ')}) returning *`, Object.values(values));
}
async function nextCode(db, tableName, column, prefix, width) {
  const rows = await db.query(`select ${column} as code from ${tableName} where ${column} like $1`, [prefix + '%']);
  const max = rows.map((x) => Number(String(x.code).slice(prefix.length))).filter(Number.isFinite).reduce((a, b) => Math.max(a, b), 0);
  return prefix + String(max + 1).padStart(width, '0');
}
async function tx(db, fn) {
  await db.exec('BEGIN');
  try { const out = await fn(); await db.exec('COMMIT'); return out; } catch (e) { await db.exec('ROLLBACK'); throw e; }
}
function live(t) { if (t.status !== 'live') throw Error(`${t.ref} is ${t.status}, not live`); }
function notFuture(on, what = 'That date') { if (on > today()) throw Error(`${what} cannot be in the future`); }

function writeFile(file, content) {
  const f = path.resolve(file);
  fs.mkdirSync(path.dirname(f), { recursive: true, mode: 0o700 });
  fs.writeFileSync(f, content, { flag: 'wx', mode: 0o600 });
  return f;
}
function outDir() { return process.env.OUTPUT_DIR || REPO_ROOT; }
function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''); }
function draft(name, body) {
  return { file: writeFile(path.join(outDir(), 'drafts', `${slug(name)}-${today()}-${randomUUID().slice(0, 8)}.md`), body) };
}
function mdTable(rows) {
  if (!rows.length) return 'Nil.';
  const keys = Object.keys(rows[0]);
  const cell = (v, k) => (v == null ? '' : k.endsWith('_cents') ? money(v) : String(v)).replaceAll('|', '/');
  return [`| ${keys.map((k) => k.replace(/_cents$/, '').replaceAll('_', ' ')).join(' | ')} |`, `|${keys.map(() => '---').join('|')}|`,
    ...rows.map((r) => `| ${keys.map((k) => cell(r[k], k)).join(' | ')} |`)].join('\n');
}

// ---------- output ----------

function show(v, key) {
  if (v == null) return '';
  if (key.endsWith('_cents')) return (Number(v) / 100).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (typeof v === 'object') return v instanceof Date ? v.toISOString().slice(0, 10) : JSON.stringify(v);
  return v;
}
function render(rows) {
  if (!rows.length) return '(none)';
  return table(rows, Object.keys(rows[0]).map((key) => ({ key, label: key.replace(/_cents$/, '').replaceAll('_', ' '), format: (v) => show(v, key) })));
}
export function human(result) {
  if (Array.isArray(result) && result[0]?.question) return result.map((x) => `${x.question}\n${render(x.rows)}`).join('\n\n');
  if (Array.isArray(result)) return render(result);
  if (result && result.sections) return result.sections.map((s) => `${s.title}\n${render(s.rows)}`).join('\n\n');
  return JSON.stringify(result, null, 2);
}

// ---------- the ASX quarterly tenement schedule (Listing Rule 5.3.3) ----------

async function schedule(db, code) {
  const q = await one(db, 'select * from asx_quarters where code = $1', [(await pick(db, 'quarter', code)).id]);
  const p = [q.starts_on, q.ends_on];
  const held = await db.query(`select t.ref as tenement, t.location, case when t.status = 'application' or t.granted_on > $2::date then 'application' else 'granted' end as status,
      trim_scale(group_interest(t.id, ($1::date - 1))) as interest_at_start, trim_scale(group_interest(t.id, $2::date)) as interest_at_end
    from tenements t where coalesce(t.granted_on, t.applied_on) <= $2::date and (t.ended_on is null or t.ended_on > $2::date) and group_interest(t.id, $2::date) > 0
    order by t.ref`, p);
  const acquired = await db.query(`select distinct t.ref as tenement, t.location, h.code as holder, trim_scale(i.pct) as pct, i.nature, i.from_on as acquired_on
    from interests i join tenements t on t.id = i.tenement_id join holders h on h.id = i.holder_id
    where h.in_group and i.from_on between $1::date and $2::date and i.nature not in ('farm-in','farm-out')
      and group_interest(t.id, i.from_on) > group_interest(t.id, (i.from_on - 1)) order by t.ref`, p);
  const disposed = await db.query(`select t.ref as tenement, t.location, trim_scale(group_interest(t.id, ($1::date - 1))) as interest_at_start,
      trim_scale(group_interest(t.id, $2::date)) as interest_at_end, coalesce(t.status || ' ' || t.ended_on, 'interest reduced') as how
    from tenements t where group_interest(t.id, $2::date) < group_interest(t.id, ($1::date - 1))
      and not exists (select 1 from interests f where f.tenement_id = t.id and f.nature in ('farm-in','farm-out') and f.from_on between $1::date and $2::date)
    order by t.ref`, p);
  const farm = await db.query(`select t.ref as tenement, t.location, i.nature, h.code as holder, trim_scale(i.pct) as pct, i.from_on, i.to_on
    from interests i join tenements t on t.id = i.tenement_id join holders h on h.id = i.holder_id
    where $1::date is not null and i.nature in ('farm-in','farm-out') and h.in_group and i.from_on <= $2::date and (i.to_on is null or i.to_on > $2::date) order by t.ref`, p);
  const farmMoved = await db.query(`select t.ref as tenement, i.nature, h.code as holder, trim_scale(i.pct) as pct,
      case when i.from_on between $1::date and $2::date then 'acquired ' || i.from_on else 'disposed ' || i.to_on end as change
    from interests i join tenements t on t.id = i.tenement_id join holders h on h.id = i.holder_id
    where i.nature in ('farm-in','farm-out') and h.in_group and (i.from_on between $1::date and $2::date or i.to_on between $1::date and $2::date) order by t.ref`, p);
  return {
    quarter: q.code, starts_on: q.starts_on, ends_on: q.ends_on, due_on: q.due_on,
    sections: [
      { title: `Mining tenements held at the end of the quarter (${q.ends_on})`, rows: held },
      { title: 'Mining tenements acquired during the quarter', rows: acquired },
      { title: 'Mining tenements disposed of during the quarter', rows: disposed },
      { title: 'Beneficial interests in farm-in or farm-out agreements at the end of the quarter', rows: farm },
      { title: 'Farm-in or farm-out interests acquired or disposed of during the quarter', rows: farmMoved },
    ],
  };
}

// ---------- imports ----------
// schedule: a tenement schedule saved as CSV (a LandTracker or consultant report, or a register search). One row per tenement.
// spend: expenditure lines from the accounts, one row per line, tagged with the tenement.
export const SCHEDULE_COLUMNS = ['Tenement', 'Status', 'Project', 'Location', 'Holder', 'Interest', 'Applied', 'Granted', 'Expiry', 'Area', 'Area unit', 'Commitment', 'Rent', 'Manager'];
export const SPEND_COLUMNS = ['Tenement', 'Date', 'Category', 'Amount', 'Description', 'Supplier'];
const REQUIRED = { schedule: ['Tenement', 'Status'], spend: ['Tenement', 'Date', 'Amount', 'Description'] };
const STATUS_WORDS = { live: 'live', granted: 'live', current: 'live', pending: 'application', application: 'application', applied: 'application',
  surrendered: 'surrendered', expired: 'expired', forfeited: 'forfeited', dead: 'expired', refused: 'refused', withdrawn: 'withdrawn' };

async function importCsv(db, args, o) {
  const [kind, file] = args;
  if (!['schedule', 'spend'].includes(kind)) throw Error('Supported imports: schedule (a tenement schedule as CSV), spend (expenditure lines as CSV)');
  const columns = kind === 'schedule' ? SCHEDULE_COLUMNS : SPEND_COLUMNS;
  const dry = flag(o, 'dry-run');
  const who = actor(o);
  const map = o.map ? JSON.parse(fs.readFileSync(path.resolve(String(o.map)), 'utf8')) : {};
  for (const k of Object.keys(map)) if (!columns.includes(k)) throw Error(`--map names an unknown field: ${k}`);
  const rows = parseCsv(fs.readFileSync(path.resolve(file), 'utf8'));
  if (!rows.length) throw Error('The file has no rows');
  const heading = (k) => map[k] || k;
  const known = new Set(columns.map(heading));
  for (const h of Object.keys(rows[0])) if (!known.has(h)) throw Error(`Unknown column "${h}". Map it with --map or remove it.`);
  for (const k of REQUIRED[kind]) if (!(heading(k) in rows[0])) throw Error(`Missing column "${heading(k)}"`);
  const get = (r, k) => String(r[heading(k)] ?? '').trim();
  const result = { kind, file: path.resolve(file), rows: rows.length, inserted: 0, skipped: 0, dry_run: dry };
  const defaultHolder = o.holder ? await pick(db, 'holder', String(o.holder)) : null;
  const defaultProject = o.project ? await pick(db, 'project', String(o.project)) : null;
  const holders = await db.query('select id, code, name from holders');
  const projects = await db.query('select id, code, name from projects');
  const seen = new Set();
  await db.exec('BEGIN');
  try {
    for (const [i, r] of rows.entries()) {
      const line = `row ${i + 2}`;
      for (const k of REQUIRED[kind]) if (!get(r, k)) throw Error(`${line}: ${k} is empty`);
      let ref;
      try { ref = normaliseRef(get(r, 'Tenement')); } catch (e) { throw Error(`${line}: ${e.message}`); }
      const hash = createHash('sha256').update(JSON.stringify(columns.map((k) => get(r, k)))).digest('hex');
      if (kind === 'spend') {
        const t = await one(db, 'select id from tenements where ref = $1', [ref]);
        if (!t) throw Error(`${line}: ${ref} is not in the register. Import the schedule first.`);
        if (await one(db, 'select 1 from expenditure where source_hash = $1', [hash])) { result.skipped++; continue; }
        const on = isoDate(get(r, 'Date'), `${line} Date`);
        if (on > today()) throw Error(`${line}: spend cannot be dated in the future`);
        const category = (get(r, 'Category') || 'other').toLowerCase();
        if (!(await one(db, 'select 1 from expenditure_categories where code = $1', [category]))) throw Error(`${line}: unknown category "${category}". Map it to one of: ${(await db.query('select code from expenditure_categories order by code')).map((x) => x.code).join(', ')}`);
        let amount;
        try { amount = cents(get(r, 'Amount')); } catch (e) { throw Error(`${line}: ${e.message}`); }
        if (amount <= 0) throw Error(`${line}: Amount must be more than zero`);
        await insert(db, 'expenditure', { tenement_id: t.id, spent_on: on, category, amount_cents: amount, description: get(r, 'Description'),
          supplier: get(r, 'Supplier') || null, source: 'import', source_hash: hash });
        result.inserted++;
        continue;
      }
      if (seen.has(ref)) throw Error(`${line}: ${ref} appears twice. One row per tenement; holders with shares go in Holder as "RKR 70; MPL 30".`);
      seen.add(ref);
      const existing = await one(db, 'select id, source_hash from tenements where ref = $1', [ref]);
      if (existing) {
        if (existing.source_hash === hash) { result.skipped++; continue; }
        throw Error(`${line}: ${ref} is already in the register with different values. Correct it with the commands, not a re-import.`);
      }
      const status = STATUS_WORDS[get(r, 'Status').toLowerCase()];
      if (!status) throw Error(`${line}: Status "${get(r, 'Status')}" is not one of ${Object.keys(STATUS_WORDS).join(', ')}`);
      const type = ref.split(' ')[0];
      if (!(await one(db, 'select 1 from tenement_types where code = $1', [type]))) throw Error(`${line}: tenement type ${type} is not set up. Add it with /customise.`);
      const d = (k) => (get(r, k) ? isoDate(get(r, k), `${line} ${k}`) : null);
      const granted = d('Granted');
      if (status === 'live' && !granted) throw Error(`${line}: a live tenement needs its Granted date (the anniversaries come from it)`);
      const projectName = get(r, 'Project');
      let project = projectName ? projects.find((p) => same(p.code, projectName) || same(p.name, projectName)) : defaultProject;
      if (projectName && !project) {
        project = await insert(db, 'projects', { code: await nextCode(db, 'projects', 'code', 'PRJ-', 2), name: projectName });
        projects.push(project);
      }
      const money2 = (k) => { if (!get(r, k)) return null; try { return cents(get(r, k)); } catch (e) { throw Error(`${line} ${k}: ${e.message}`); } };
      const area = get(r, 'Area') ? Number(get(r, 'Area').replaceAll(',', '')) : null;
      if (area != null && !(area > 0)) throw Error(`${line}: Area must be a number`);
      const unit = (get(r, 'Area unit') || (type === 'E' ? 'blocks' : 'ha')).toLowerCase().replace(/^hectares?$/, 'ha').replace(/^bl$|^block$/, 'blocks');
      if (!['blocks', 'ha'].includes(unit)) throw Error(`${line}: Area unit must be blocks or ha`);
      const t = await insert(db, 'tenements', { ref, type_code: type, project_id: project?.id ?? null, status, location: get(r, 'Location') || null,
        applied_on: d('Applied'), granted_on: granted, expires_on: d('Expiry'), area, area_unit: unit, commitment_cents: money2('Commitment'),
        rent_cents: money2('Rent'), manager: get(r, 'Manager') || 'unassigned', source: 'import', source_hash: hash });
      // Holder: "Red Kite Resources Ltd", "RKR 70; MPL 30", or empty with --holder.
      const parts = get(r, 'Holder') ? get(r, 'Holder').split(';').map((s) => s.trim()).filter(Boolean) : [];
      const shares = parts.length ? parts.map((s) => { const m = s.match(/^(.*?)\s+(\d{1,3}(?:\.\d{1,2})?)%?$/); return m ? [m[1], Number(m[2])] : [s, null]; })
        : defaultHolder ? [[defaultHolder.key, null]] : [];
      if (!shares.length) throw Error(`${line}: no Holder. Add one or pass --holder.`);
      if (shares.length === 1 && shares[0][1] == null) shares[0][1] = Number(get(r, 'Interest').replace('%', '')) || 100;
      if (shares.some((s) => s[1] == null)) throw Error(`${line}: give every holder a share, like "RKR 70; MPL 30"`);
      const total = shares.reduce((a, s) => a + s[1], 0);
      if (Math.abs(total - 100) > 0.001) throw Error(`${line}: holder shares add up to ${total}, not 100`);
      for (const [name, pct] of shares) {
        let h = holders.find((x) => same(x.code, name) || same(x.name, name));
        if (!h) { h = await insert(db, 'holders', { code: await nextCode(db, 'holders', 'code', 'H-', 3), name, in_group: false }); holders.push(h); }
        await insert(db, 'interests', { tenement_id: t.id, holder_id: h.id, pct, nature: shares.length > 1 ? 'joint venture' : 'registered holder',
          from_on: granted || d('Applied') || today(), note: 'imported' });
      }
      await audit(db, t.id, 'import', who, { ref, file: path.basename(file) });
      result.inserted++;
    }
    await db.exec(dry ? 'ROLLBACK' : 'COMMIT');
  } catch (e) {
    await db.exec('ROLLBACK');
    throw e;
  }
  return result;
}

// ---------- the commands ----------

export async function run(db, cmd, args = [], o = {}) {
  const spec = SPECS[cmd];
  if (!spec) throw Error(`Unknown command: ${cmd}\n${help()}`);
  if (args.length !== spec[0]) throw Error(`${cmd} takes ${spec[0]} argument(s), got ${args.length}`);
  for (const k of Object.keys(o)) {
    if (!spec[1].includes(k)) throw Error(`Unknown flag --${k} for ${cmd}`);
    if (!BOOL_FLAGS.has(k) && o[k] === true) throw Error(`--${k} needs a value`);
    if (BOOL_FLAGS.has(k) && o[k] !== true) throw Error(`--${k} takes no value`);
  }
  if (READS[cmd]) return db.query(READS[cmd]);
  const who = () => actor(o);
  switch (cmd) {
    case 'due': {
      const days = Number(o.days ?? 30);
      if (!Number.isInteger(days) || days < 0 || days > 730) throw Error('--days must be a whole number from 0 to 730');
      return db.query(`select due_on, days_left, label as what, ref, project, manager as owner, item as detail, rule
        from open_dates where days_left <= $1 order by due_on, ref`, [days]);
    }
    case 'insights': {
      const out = [];
      for (const [question, sql] of QUESTIONS) out.push({ question, rows: await db.query(sql) });
      return out;
    }
    case 'tenement': {
      const t = await tenementRow(db, args[0]);
      const id = [t.id];
      return {
        ref: t.ref,
        sections: [
          { title: t.ref, rows: await db.query(`select ref, type, project, status, location, applied_on, granted_on, expires_on, ended_on, area, area_unit,
              tenement_year, commitment_cents, rent_cents, manager from tenement_register where id = $1`, id) },
          { title: 'Holders', rows: await db.query(`select h.code, h.name, trim_scale(i.pct) as pct, i.nature, i.from_on, i.to_on from interests i
              join holders h on h.id = i.holder_id where i.tenement_id = $1 order by i.from_on, i.pct desc`, id) },
          { title: 'Dates', rows: await db.query(`select c.kind as rule, c.item, c.due_on, c.done_on from tenement_calendar c where c.tenement_id = $1
              and (c.done_on is null or c.done_on > current_date - 400) order by c.due_on`, id) },
          { title: 'This year and last year', rows: await db.query(`select year_started, year_ends, commitment_cents, spent_this_year_cents, spent_last_year_cents
              from tenement_spend where id = $1`, id) },
          { title: 'Expenditure', rows: await db.query(`select spent_on, category, amount_cents, description, supplier from expenditure
              where tenement_id = $1 order by spent_on desc limit 20`, id) },
          { title: 'Form 5s', rows: await db.query('select year_ending, lodged_on, reported_cents, receipt, combined from form5_reports where tenement_id = $1 order by year_ending desc', id) },
          { title: 'Rent', rows: await db.query('select year_starting, paid_on, amount_cents, receipt from rent_payments where tenement_id = $1 order by year_starting desc', id) },
          { title: 'Exemptions, surrenders and extensions', rows: await db.query(`
              select 'exemption' as what, lodged_on, outcome || coalesce(' ' || decided_on, '') as result, grounds as detail from exemptions where tenement_id = $1
              union all select kind || ' surrender', lodged_on, coalesce('effective ' || effective_on, ''), coalesce(trim_scale(area_surrendered) || ' surrendered', '') from surrenders where tenement_id = $1
              union all select 'extension', applied_on, outcome || coalesce(' to ' || new_expiry, ''), grounds from extensions where tenement_id = $1
              order by lodged_on`, id) },
          { title: 'Conditions', rows: await db.query('select number, text from conditions where tenement_id = $1 order by number', id) },
          { title: 'History', rows: await db.query('select action, actor, detail, created_at from activity where entity_id = $1 order by created_at, id', [String(t.id)]) },
        ],
      };
    }
    case 'project': {
      const p = await pick(db, 'project', args[0]);
      return {
        project: p.key,
        sections: [
          { title: `${p.key} ${p.name}`, rows: await db.query('select code, name, region, combined_reporting, manager from projects where id = $1', [p.id]) },
          { title: 'Tenements', rows: await db.query(`select ref, type, status, granted_on, expires_on, holders, commitment_cents, rent_cents from tenement_register
              where project = $1 order by ref`, [p.key]) },
          { title: 'Spend against commitment this tenement year', rows: await db.query(`select ref, year_ends, commitment_cents, spent_this_year_cents from tenement_spend
              where project = $1 order by ref`, [p.key]) },
          { title: 'Open dates', rows: await db.query('select due_on, days_left, label as what, ref, item as detail from open_dates where project = $1 order by due_on', [p.key]) },
        ],
      };
    }
    case 'schedule':
      return schedule(db, args[0]);
    case 'add-holder': {
      const h = await insert(db, 'holders', { code: required(o, 'code').toUpperCase(), name: required(o, 'name'), abn: optional(o, 'abn'), in_group: !flag(o, 'partner') });
      await audit(db, h.id, 'add-holder', who(), { code: h.code });
      return h;
    }
    case 'add-project': {
      const p = await insert(db, 'projects', { code: required(o, 'code').toUpperCase(), name: required(o, 'name'), region: optional(o, 'region'),
        combined_reporting: optional(o, 'combined'), manager: optional(o, 'manager') });
      await audit(db, p.id, 'add-project', who(), { code: p.code });
      return p;
    }
    case 'add-tenement': {
      const ref = normaliseRef(required(o, 'ref'));
      const type = ref.split(' ')[0];
      if (!(await one(db, 'select 1 from tenement_types where code = $1', [type]))) throw Error(`Tenement type ${type} is not set up. Types: ${(await db.query('select code from tenement_types order by code')).map((x) => x.code).join(', ')}`);
      const status = (optional(o, 'status') || (o.granted ? 'live' : 'application')).toLowerCase();
      if (!['live', 'application'].includes(status)) throw Error('--status is live or application. Record an end with surrender.');
      const granted = o.granted ? isoDate(o.granted, 'granted date') : null;
      if (status === 'live' && !granted) throw Error('A live tenement needs --granted=<YYYY-MM-DD>: every anniversary comes from it');
      if (granted) notFuture(granted, 'The grant date');
      const applied = o.applied ? isoDate(o.applied, 'applied date') : (status === 'application' ? today() : null);
      if (applied && granted && applied > granted) throw Error('A tenement cannot be granted before it was applied for');
      const project = o.project ? await pick(db, 'project', required(o, 'project')) : null;
      const holder = await pick(db, 'holder', required(o, 'holder'));
      const pct = Number(optional(o, 'pct') ?? 100);
      if (!(pct > 0 && pct <= 100)) throw Error('--pct must be more than 0 and at most 100');
      const area = o.area ? Number(required(o, 'area')) : null;
      if (area != null && !(area > 0)) throw Error('--area must be a number');
      const unit = (optional(o, 'unit') || (type === 'E' ? 'blocks' : 'ha')).toLowerCase();
      if (!['blocks', 'ha'].includes(unit)) throw Error('--unit is blocks or ha');
      return tx(db, async () => {
        const t = await insert(db, 'tenements', { ref, type_code: type, project_id: project?.id ?? null, status, location: optional(o, 'location'),
          applied_on: applied, granted_on: granted, expires_on: o.expires ? isoDate(o.expires, 'expiry date') : null, area, area_unit: unit,
          commitment_cents: o.commitment ? cents(o.commitment) : null, rent_cents: o.rent ? cents(o.rent) : null, manager: optional(o, 'manager') || 'unassigned' });
        await insert(db, 'interests', { tenement_id: t.id, holder_id: holder.id, pct, nature: 'registered holder', from_on: granted || applied });
        await audit(db, t.id, 'add-tenement', who(), { ref, status });
        return one(db, 'select ref, type, status, granted_on, expires_on, holders from tenement_register where id = $1', [t.id]);
      });
    }
    case 'grant': {
      const t = await tenementRow(db, args[0]);
      if (t.status !== 'application') throw Error(`${t.ref} is ${t.status}. Only an application is granted.`);
      const on = isoDate(o.on ?? today());
      notFuture(on, 'The grant date');
      if (t.applied_on && on < String(t.applied_on)) throw Error(`${t.ref} was applied for on ${t.applied_on}`);
      return tx(db, async () => {
        await update(db, 'tenements', t.id, { status: 'live', granted_on: on, expires_on: o.expires ? isoDate(o.expires, 'expiry date') : null,
          commitment_cents: o.commitment ? cents(o.commitment) : t.commitment_cents, rent_cents: o.rent ? cents(o.rent) : t.rent_cents });
        await db.query('update interests set from_on = $2 where tenement_id = $1 and from_on < $2 and to_on is null', [t.id, on]);
        await audit(db, t.id, 'grant', who(), { on });
        return one(db, 'select ref, status, granted_on, expires_on, commitment_cents, rent_cents from tenement_register where id = $1', [t.id]);
      });
    }
    case 'interest': {
      const t = await tenementRow(db, args[0]);
      const h = await pick(db, 'holder', required(o, 'holder'));
      const pct = Number(required(o, 'pct'));
      if (!(pct >= 0 && pct <= 100)) throw Error('--pct is 0 to 100 (0 ends the holder\'s interest)');
      const nature = (optional(o, 'nature') || 'registered holder').toLowerCase();
      if (!['registered holder', 'beneficial', 'farm-in', 'farm-out', 'joint venture'].includes(nature)) throw Error('--nature is registered holder, beneficial, farm-in, farm-out or joint venture');
      const from = isoDate(o.from ?? today(), 'from date');
      return tx(db, async () => {
        const prior = await db.query('select id, from_on from interests where tenement_id = $1 and holder_id = $2 and nature = $3 and to_on is null', [t.id, h.id, nature]);
        for (const p of prior) {
          if (String(p.from_on) >= from) throw Error(`${h.key} already holds a ${nature} interest from ${p.from_on}. Changes run forward in time.`);
          await db.query('update interests set to_on = $2 where id = $1', [p.id, from]);
        }
        if (pct > 0) await insert(db, 'interests', { tenement_id: t.id, holder_id: h.id, pct, nature, from_on: from, note: optional(o, 'note') });
        await audit(db, t.id, 'interest', who(), { holder: h.key, pct, nature, from });
        return db.query(`select h.code as holder, trim_scale(i.pct) as pct, i.nature, i.from_on, i.to_on from interests i join holders h on h.id = i.holder_id
          where i.tenement_id = $1 and (i.to_on is null or i.to_on >= $2) order by i.from_on, i.pct desc`, [t.id, from]);
      });
    }
    case 'spend': {
      const t = await tenementRow(db, args[0]);
      const on = isoDate(o.on ?? today());
      notFuture(on, 'Spend');
      const category = required(o, 'category').toLowerCase();
      if (!(await one(db, 'select 1 from expenditure_categories where code = $1', [category]))) throw Error(`Unknown category ${category}. Categories: ${(await db.query('select code from expenditure_categories order by code')).map((x) => x.code).join(', ')}`);
      const amount = cents(required(o, 'amount'));
      if (amount <= 0) throw Error('--amount must be more than zero');
      const e = await insert(db, 'expenditure', { tenement_id: t.id, spent_on: on, category, amount_cents: amount, description: required(o, 'description'), supplier: optional(o, 'supplier') });
      await audit(db, t.id, 'spend', who(), { on, category, amount_cents: amount });
      const s = await one(db, 'select ref, year_ends, commitment_cents, spent_this_year_cents from tenement_spend where id = $1', [t.id]);
      return { ...(s || { ref: t.ref }), recorded_cents: e.amount_cents };
    }
    case 'pay-rent': {
      const t = await tenementRow(db, args[0]);
      live(t);
      if (t.years_done < 1 && !o.year) throw Error(`${t.ref} is in its first year: first-year rent is paid with the application. Pass --year=<anniversary> to record an advance payment.`);
      const year = o.year ? isoDate(o.year, 'year start') : String(t.last_anniversary);
      const anniversaries = await db.query('select (granted_on + make_interval(years => n))::date::text as d from tenements, generate_series(1, 60) n where id = $1', [t.id]);
      if (!anniversaries.some((a) => a.d === year)) throw Error(`${year} is not an anniversary of ${t.ref} (granted ${t.granted_on})`);
      const on = isoDate(o.on ?? today());
      notFuture(on, 'The payment date');
      const amount = o.amount ? cents(o.amount) : t.rent_cents;
      if (!amount) throw Error('No rent on record for this tenement. Pass --amount=<dollars> from the department\'s notice.');
      const r = await insert(db, 'rent_payments', { tenement_id: t.id, year_starting: year, paid_on: on, amount_cents: amount, receipt: optional(o, 'receipt') });
      await audit(db, t.id, 'pay-rent', who(), { year, on, amount_cents: amount });
      const due = await one(db, "select ($1::date + interval '1 month')::date as due_on", [year]);
      return { ref: t.ref, year_starting: year, paid_on: on, due_on: due.due_on, on_time: on <= String(due.due_on), amount_cents: r.amount_cents };
    }
    case 'lodge-form5': {
      const t = await tenementRow(db, args[0]);
      const ending = o['year-ending'] ? isoDate(o['year-ending'], 'year ending') : String(t.ended_on || t.last_anniversary || '');
      if (!ending || (t.status === 'live' && t.years_done < 1 && !o['year-ending'])) throw Error(`${t.ref} has not finished a tenement year yet`);
      const on = isoDate(o.on ?? today());
      notFuture(on, 'The lodgement date');
      if (on < ending) throw Error(`The Form 5 for the year ending ${ending} is lodged after that date`);
      const spent = await one(db, `select coalesce(sum(amount_cents), 0)::bigint as c from expenditure where tenement_id = $1
        and spent_on >= ($2::date - interval '1 year')::date and spent_on < $2::date`, [t.id, ending]);
      const amount = o.amount !== undefined ? cents(o.amount) : Number(spent.c);
      const f = await insert(db, 'form5_reports', { tenement_id: t.id, year_ending: ending, lodged_on: on, reported_cents: amount, receipt: optional(o, 'receipt'), combined: flag(o, 'combined') });
      await audit(db, t.id, 'lodge-form5', who(), { year_ending: ending, on, reported_cents: amount });
      const due = await one(db, 'select $1::date + 60 as due_on', [ending]);
      return { ref: t.ref, year_ending: ending, lodged_on: on, due_on: due.due_on, on_time: on <= String(due.due_on), reported_cents: f.reported_cents,
        commitment_cents: t.commitment_cents, shortfall_cents: Math.max(0, Number(t.commitment_cents || 0) - amount) };
    }
    case 'lodge-exemption': {
      const t = await tenementRow(db, args[0]);
      const s = await one(db, 'select * from tenement_spend where id = $1', [t.id]);
      if (!s?.last_year_started) throw Error(`${t.ref} has no completed tenement year to apply for`);
      const shortfall = Number(s.commitment_cents || 0) - Number(s.spent_last_year_cents);
      if (shortfall <= 0) throw Error(`${t.ref} met its commitment for the year ending ${s.year_started}: no exemption is needed`);
      const on = isoDate(o.on ?? today());
      notFuture(on, 'The lodgement date');
      const x = await insert(db, 'exemptions', { tenement_id: t.id, year_ending: s.year_started, lodged_on: on, shortfall_cents: shortfall, grounds: required(o, 'grounds') });
      await audit(db, t.id, 'lodge-exemption', who(), { year_ending: s.year_started, on, shortfall_cents: shortfall });
      const due = await one(db, 'select $1::date + 60 as due_on', [s.year_started]);
      return { ref: t.ref, year_ending: x.year_ending, lodged_on: on, lodge_by: due.due_on, in_time: on <= String(due.due_on), shortfall_cents: shortfall };
    }
    case 'decide-exemption': {
      const t = await tenementRow(db, args[0]);
      const rows = await db.query("select * from exemptions where tenement_id = $1 and outcome = 'pending' order by year_ending", [t.id]);
      const x = o['year-ending'] ? rows.find((r) => String(r.year_ending) === isoDate(o['year-ending'])) : rows.length === 1 ? rows[0] : null;
      if (!x) throw Error(rows.length ? `${t.ref} has ${rows.length} pending exemptions: pass --year-ending` : `${t.ref} has no pending exemption`);
      const outcome = required(o, 'outcome').toLowerCase();
      if (!['granted', 'refused', 'withdrawn'].includes(outcome)) throw Error('--outcome is granted, refused or withdrawn');
      const on = isoDate(o.on ?? today());
      if (on < String(x.lodged_on)) throw Error('A decision cannot predate the application');
      const out = await update(db, 'exemptions', x.id, { outcome, decided_on: on });
      await audit(db, t.id, 'decide-exemption', who(), { year_ending: x.year_ending, outcome, on });
      return { ref: t.ref, year_ending: out.year_ending, outcome, decided_on: on,
        next: outcome === 'refused' ? 'A refused exemption exposes the tenement to forfeiture or a penalty. Talk to your tenement adviser now.' : null };
    }
    case 'surrender': {
      const t = await tenementRow(db, args[0]);
      live(t);
      const kind = required(o, 'kind').toLowerCase();
      if (!['compulsory partial', 'voluntary partial', 'full'].includes(kind)) throw Error('--kind is compulsory partial, voluntary partial or full');
      const on = isoDate(o.on ?? today());
      notFuture(on, 'The lodgement date');
      const effective = o.effective ? isoDate(o.effective, 'effective date') : (kind === 'compulsory partial' ? String(await one(db, "select ($1::date + interval '6 years')::date::text as d", [t.granted_on]).then((r) => r.d)) : on);
      const area = kind === 'full' ? Number(t.area) : Number(required(o, 'area'));
      if (kind !== 'full' && !(area > 0 && area < Number(t.area))) throw Error(`--area must be more than 0 and less than the ${t.area} ${t.area_unit} held`);
      if (kind === 'compulsory partial' && t.area_unit === 'blocks' && area < Math.ceil(Number(t.area) * 0.4))
        throw Error(`A compulsory partial surrender gives up at least 40% of the blocks: ${Math.ceil(Number(t.area) * 0.4)} of ${t.area}`);
      return tx(db, async () => {
        await insert(db, 'surrenders', { tenement_id: t.id, kind, lodged_on: on, area_surrendered: area || null, effective_on: effective });
        if (kind === 'full') {
          await update(db, 'tenements', t.id, { status: 'surrendered', ended_on: effective });
          await db.query('update interests set to_on = $2 where tenement_id = $1 and to_on is null', [t.id, effective]);
        } else await update(db, 'tenements', t.id, { area: Number(t.area) - area });
        await audit(db, t.id, 'surrender', who(), { kind, on, area, effective });
        return { ...(await one(db, 'select ref, status, area, area_unit, ended_on from tenements where id = $1', [t.id])), kind, lodged_on: on, effective_on: effective,
          next: kind === 'full' ? 'Lodge the final Form 5 within 60 days of the surrender (lodge-form5).' : null };
      });
    }
    case 'apply-extension': {
      const t = await tenementRow(db, args[0]);
      live(t);
      if (!t.expires_on) throw Error(`${t.ref} has no expiry date on record`);
      const on = isoDate(o.on ?? today());
      notFuture(on, 'The application date');
      if (on >= String(t.expires_on)) throw Error(`${t.ref} expired on ${t.expires_on}. An extension is applied for before expiry.`);
      if (await one(db, "select 1 from extensions where tenement_id = $1 and outcome = 'pending'", [t.id])) throw Error(`${t.ref} already has a pending extension`);
      const x = await insert(db, 'extensions', { tenement_id: t.id, applied_on: on, grounds: required(o, 'grounds') });
      await audit(db, t.id, 'apply-extension', who(), { on });
      return { ref: t.ref, applied_on: x.applied_on, expires_on: t.expires_on, note: 'The licence stays in force until the application is decided.' };
    }
    case 'decide-extension': {
      const t = await tenementRow(db, args[0]);
      const x = await one(db, "select * from extensions where tenement_id = $1 and outcome = 'pending'", [t.id]);
      if (!x) throw Error(`${t.ref} has no pending extension`);
      const outcome = required(o, 'outcome').toLowerCase();
      if (!['granted', 'refused', 'withdrawn'].includes(outcome)) throw Error('--outcome is granted, refused or withdrawn');
      const on = isoDate(o.on ?? today());
      if (on < String(x.applied_on)) throw Error('A decision cannot predate the application');
      const expires = outcome === 'granted' ? isoDate(required(o, 'expires'), 'new expiry') : null;
      if (expires && expires <= String(t.expires_on)) throw Error(`The new expiry must be after ${t.expires_on}`);
      return tx(db, async () => {
        await update(db, 'extensions', x.id, { outcome, decided_on: on, new_expiry: expires });
        if (expires) await update(db, 'tenements', t.id, { expires_on: expires });
        await audit(db, t.id, 'decide-extension', who(), { outcome, on, expires });
        return one(db, 'select ref, status, expires_on from tenements where id = $1', [t.id]);
      });
    }
    case 'add-agreement': {
      const kind = required(o, 'kind').toLowerCase();
      const kinds = ['native title', 'heritage', 'land access', 'farm-in', 'joint venture', 'royalty', 'other'];
      if (!kinds.includes(kind)) throw Error(`--kind is one of ${kinds.join(', ')}`);
      const project = o.project ? await pick(db, 'project', required(o, 'project')) : null;
      const a = await insert(db, 'agreements', { code: optional(o, 'code') || await nextCode(db, 'agreements', 'code', 'AG-', 2), kind, title: required(o, 'title'),
        counterparty: required(o, 'counterparty'), project_id: project?.id ?? null, signed_on: o.signed ? isoDate(o.signed, 'signed date') : null,
        ends_on: o.ends ? isoDate(o.ends, 'end date') : null, summary: optional(o, 'summary') });
      await audit(db, a.id, 'add-agreement', who(), { code: a.code });
      return a;
    }
    case 'add-obligation': {
      if (!o.tenement && !o.agreement) throw Error('An obligation belongs to a tenement, an agreement or both: pass --tenement or --agreement');
      const t = o.tenement ? await pick(db, 'tenement', required(o, 'tenement')) : null;
      const a = o.agreement ? await pick(db, 'agreement', required(o, 'agreement')) : null;
      const ob = await insert(db, 'obligations', { code: optional(o, 'code') || await nextCode(db, 'obligations', 'code', 'OB-', 2), title: required(o, 'title'),
        tenement_id: t?.id ?? null, agreement_id: a?.id ?? null, due_on: isoDate(required(o, 'due'), 'due date'), owner: required(o, 'owner'), note: optional(o, 'note') });
      await audit(db, ob.id, 'add-obligation', who(), { code: ob.code, due_on: ob.due_on });
      return ob;
    }
    case 'done': {
      const hit = await pick(db, 'obligation', args[0]);
      const ob = await one(db, 'select * from obligations where id = $1', [hit.id]);
      if (ob.done_on) throw Error(`${ob.code} was done on ${ob.done_on}`);
      const on = isoDate(o.on ?? today());
      notFuture(on, 'The done date');
      const out = await update(db, 'obligations', ob.id, { done_on: on });
      await audit(db, ob.id, 'done', who(), { on });
      return { code: out.code, title: out.title, due_on: out.due_on, done_on: on, on_time: on <= String(out.due_on) };
    }
    case 'add-condition': {
      const t = await tenementRow(db, args[0]);
      const n = Number(required(o, 'number'));
      if (!Number.isInteger(n) || n < 1) throw Error('--number is the condition number on the grant');
      const c = await insert(db, 'conditions', { tenement_id: t.id, number: n, text: required(o, 'text') });
      await audit(db, t.id, 'add-condition', who(), { number: n });
      return c;
    }
    case 'add-quarter': {
      const ends = isoDate(required(o, 'ends'), 'quarter end');
      const q = await one(db, `select to_char($1::date, 'YYYY-MM') as code, date_trunc('quarter', $1::date)::date as starts_on,
        (date_trunc('quarter', $1::date) + interval '3 months' - interval '1 day')::date as quarter_end,
        (($1::date + interval '1 day') + interval '1 month' - interval '1 day')::date as due_on`, [ends]);
      if (String(q.quarter_end) !== ends) throw Error(`${ends} is not the last day of a calendar quarter (31 March, 30 June, 30 September, 31 December)`);
      const row = await insert(db, 'asx_quarters', { code: q.code, starts_on: q.starts_on, ends_on: ends, due_on: q.due_on });
      await audit(db, row.code, 'add-quarter', who(), row);
      return row;
    }
    case 'report-quarter': {
      const q = await one(db, 'select * from asx_quarters where code = $1', [(await pick(db, 'quarter', args[0])).id]);
      if (q.reported_on) throw Error(`${q.code} was reported on ${q.reported_on}`);
      const on = isoDate(o.on ?? today());
      if (on <= String(q.ends_on)) throw Error(`${q.code} ends ${q.ends_on}. Report after the quarter closes.`);
      notFuture(on, 'The report date');
      const out = await one(db, 'update asx_quarters set reported_on = $2 where code = $1 returning *', [q.code, on]);
      await audit(db, q.code, 'report-quarter', who(), { on });
      return { ...out, on_time: on <= String(out.due_on) };
    }
    case 'import':
      return importCsv(db, args, o);
    case 'export': {
      const archive = {};
      for (const t of TABLES) archive[t] = await db.query(`select * from ${t}`);
      const file = o.file ? String(o.file) : path.join(outDir(), 'exports', `tenements-${today()}-${randomUUID().slice(0, 8)}.json`);
      return { file: writeFile(file, JSON.stringify(archive, null, 2)), tables: TABLES.length, tenements: archive.tenements.length };
    }
    case 'weekly-review': {
      const attention = await run(db, 'attention');
      const due = await run(db, 'due', [], { days: '14' });
      const compliance = await run(db, 'compliance');
      const breaches = compliance.filter((r) => r.severity === 'breach');
      const body = `# Tenement review, week of ${today()}

Drafted from three commands: attention, due --days=14 and compliance. Read it, correct it, then share it. Nothing is lodged or paid from here.

## Late or at risk (${breaches.length})

${breaches.length ? breaches.map((r) => `- **${r.ref}** (${r.rule}): ${r.finding}`).join('\n') : 'Nothing late.'}

## What needs a person (${attention.length})

${mdTable(attention.map(({ item, ref, owner, detail, due_on }) => ({ item, ref, owner, detail, due_on })))}

## Due in the next 14 days (${due.length})

${mdTable(due.map(({ due_on, what, ref, owner }) => ({ due_on, what, ref, owner })))}

## Decisions for this week

- Which late items are lodged or paid today, and by whom.
- Whether any tenement short of its commitment should be surrendered rather than carried.
`;
      return draft('weekly-review', body);
    }
    case 'draft-form5': {
      const t = await tenementRow(db, args[0]);
      const ending = String(t.ended_on || t.last_anniversary || '');
      if (!ending || (t.status === 'live' && t.years_done < 1)) throw Error(`${t.ref} has not finished a tenement year yet`);
      const lines = await db.query(`select c.name as category, sum(e.amount_cents)::bigint as amount_cents, count(*)::int as entries from expenditure e
        join expenditure_categories c on c.code = e.category where e.tenement_id = $1 and e.spent_on >= ($2::date - interval '1 year')::date and e.spent_on < $2::date
        group by c.name order by amount_cents desc`, [t.id, ending]);
      const detail = await db.query(`select spent_on, category, amount_cents, description, supplier from expenditure where tenement_id = $1
        and spent_on >= ($2::date - interval '1 year')::date and spent_on < $2::date order by spent_on`, [t.id, ending]);
      const total = lines.reduce((a, r) => a + Number(r.amount_cents), 0);
      const due = await one(db, 'select $1::date + 60 as due_on, ($1::date - interval \'1 year\')::date as starts', [ending]);
      const short = Number(t.commitment_cents || 0) - total;
      const body = `# Form 5 working paper: ${t.ref}

Year ${due.starts} to ${ending}. Lodge by **${due.due_on}** (60 days after the ${t.ended_on ? 'tenement ended' : 'anniversary'}).
Holder: ${(await one(db, 'select holders from tenement_register where id = $1', [t.id])).holders || 'none recorded'}. Project: ${t.project || 'none'}${t.project ? '' : ''}.

This is a working paper drafted from the register so the person lodging has every figure in one place. It is not the Form 5. Lodge through Mineral Titles Online, map these categories to the headings on the current form, and keep the invoices behind every line.

## Expenditure by category

${mdTable(lines)}

**Total: ${money(total)}.** Commitment: ${money(t.commitment_cents)}.${short > 0 ? ` **Short by ${money(short)}.** Apply for exemption within 60 days of ${ending} or explain the shortfall; see /draft-exemption.` : ' Commitment met.'}

## Every line

${mdTable(detail)}

Record it once lodged: \`node scripts/tenements.mjs lodge-form5 "${t.ref}" --on=<date> --receipt=<number>\`.
`;
      return draft(`form5-${t.ref}`, body);
    }
    case 'draft-exemption': {
      const t = await tenementRow(db, args[0]);
      const s = await one(db, 'select * from tenement_spend where id = $1', [t.id]);
      if (!s?.last_year_started) throw Error(`${t.ref} has no completed tenement year`);
      const shortfall = Number(s.commitment_cents || 0) - Number(s.spent_last_year_cents);
      if (shortfall <= 0) throw Error(`${t.ref} met its commitment for the year ending ${s.year_started}: no exemption is needed`);
      const work = await db.query(`select spent_on, category, amount_cents, description from expenditure where tenement_id = $1
        and spent_on >= $2 and spent_on < $3 order by spent_on`, [t.id, s.last_year_started, s.year_started]);
      const notes = await db.query(`select o.title, o.due_on, o.done_on, o.note from obligations o where o.tenement_id = $1 and o.due_on between $2 and $3 order by o.due_on`, [t.id, s.last_year_started, s.year_started]);
      const body = `# Expenditure exemption draft: ${t.ref}

Year ${s.last_year_started} to ${s.year_started}. Commitment ${money(s.commitment_cents)}, spent ${money(s.spent_last_year_cents)}, **short by ${money(shortfall)}**.
Apply within 60 days of the end of the year: by **${(await one(db, 'select $1::date + 60 as d', [s.year_started])).d}**.

This draft collects the facts from the register. It is not the application and not legal advice. The grounds, the statutory declaration and the evidence are for the holder and its tenement adviser; the department decides.

## Work done in the year

${mdTable(work)}

## Dated events on this tenement in the year

${mdTable(notes)}

## Grounds (write these from what actually happened)

- [What stopped the work: access, approvals, heritage, weather, the work being planned for the next year. Name the dates.]
- [What was done instead, and what is planned with the dates.]
- [Evidence attached: correspondence, survey bookings, approvals.]

Record it once lodged: \`node scripts/tenements.mjs lodge-exemption "${t.ref}" --on=<date> --grounds="<one line>"\`.
`;
      return draft(`exemption-${t.ref}`, body);
    }
    case 'draft-extension': {
      const t = await tenementRow(db, args[0]);
      live(t);
      if (!t.expires_on) throw Error(`${t.ref} has no expiry date on record`);
      const years = await db.query(`select f.year_ending, f.reported_cents, coalesce(x.outcome, '') as exemption from form5_reports f
        left join exemptions x on x.tenement_id = f.tenement_id and x.year_ending = f.year_ending where f.tenement_id = $1 order by f.year_ending`, [t.id]);
      const body = `# Extension of term draft: ${t.ref}

Term ends **${t.expires_on}**. Apply before that date; the licence stays in force until the application is decided.

This draft collects the record the department will look at. It is not the application and not legal advice. The ground relied on must be one the regulations allow; your tenement adviser confirms it.

## The record

${mdTable(years)}

Current commitment ${money(t.commitment_cents)}; area ${t.area} ${t.area_unit}; holders: ${(await one(db, 'select holders from tenement_register where id = $1', [t.id])).holders || 'none recorded'}.

## Grounds (from what actually happened)

- [Why the exploration programme is not complete, with dates.]
- [The work planned for the extended term and its budget.]

Record it once lodged: \`node scripts/tenements.mjs apply-extension "${t.ref}" --on=<date> --grounds="<one line>"\`.
`;
      return draft(`extension-${t.ref}`, body);
    }
    case 'draft-schedule': {
      const s = await schedule(db, args[0]);
      const body = `# Tenement schedule for the quarter ending ${s.ends_on}

For the quarterly activity report (ASX Listing Rule 5.3.3), due with the Appendix 5B by ${s.due_on}. Interests are the group's, from the register. Check every line against the department's register before it is released; nothing is sent from here.

${s.sections.map((x) => `## ${x.title}\n\n${mdTable(x.rows)}`).join('\n\n')}
`;
      return draft(`schedule-${s.quarter}`, body);
    }
  }
  throw Error(`Unhandled command ${cmd}`);
}

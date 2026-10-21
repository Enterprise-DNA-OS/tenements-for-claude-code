#!/usr/bin/env node
// npm test: a temporary database, the migration, the seed twice, every CLI command, the rules and both imports.
// Set TEST_DATABASE_URL to run the same checks against an empty disposable Postgres.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { getDb, REPO_ROOT } from './lib/db.mjs';
import { migrate } from './migrate.mjs';
import { run, COMMANDS, READS, TABLES, QUESTIONS, cents, isoDate, normaliseRef, today } from './lib/tenements.mjs';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tenements-test-'));
process.env.DATA_DIR = path.join(dir, 'db');
process.env.OUTPUT_DIR = dir;
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || '';

const db = await getDb();
const covered = new Set();
let checks = 0;
const call = (c, a = [], o = {}) => { covered.add(c); return run(db, c, a, o); };
async function fails(c, a, o, re) { await assert.rejects(() => call(c, a, o), re); checks++; }
function child(script, args = [], status = 0) {
  const p = spawnSync(process.execPath, [path.join(REPO_ROOT, 'scripts', script), ...args], { cwd: REPO_ROOT, env: process.env, encoding: 'utf8' });
  assert.equal(p.status, status, p.stderr || p.stdout);
  checks++;
  return p.stdout;
}
const day = (n) => { const d = new Date(); d.setUTCDate(d.getUTCDate() - n); return d.toISOString().slice(0, 10); };
const A = { actor: 'Tester' };
const read = (f) => fs.readFileSync(f, 'utf8');

try {
  // Migration runs once; the seed is idempotent.
  assert.equal((await migrate(db)).ran.length, 1);
  assert.equal((await migrate(db)).ran.length, 0);
  const seed = read(path.join(REPO_ROOT, 'supabase', 'seed.sql'));
  await db.exec(seed);
  await db.exec(seed);
  assert.equal((await db.query('select * from tenements')).length, 13);
  assert.equal((await db.query('select * from expenditure')).length, 27);
  assert.equal((await db.query('select * from interests')).length, 17);

  // Every read returns rows in the shape the commands promise.
  for (const c of Object.keys(READS)) assert.ok(Array.isArray(await call(c)), c);
  assert.equal((await call('insights')).length, QUESTIONS.length);
  assert.equal(QUESTIONS.length, 10);
  const attention = await call('attention');
  for (const [item, ref] of [['late: Form 5', 'E 39/9101'], ['late: expenditure exemption', 'E 39/9101'], ['late: rent', 'E 39/9102'], ['late: obligation', 'NT-01'],
    ['due: rent', 'E 51/9203'], ['due: rent', 'M 39/9104'], ['due: Form 5', 'E 39/9102'], ['due: partial surrender', 'E 39/9103'],
    ['due: extension of term', 'E 51/9201'], ['commitment not met yet', 'E 39/9106']])
    assert.ok(attention.some((r) => r.item === item && r.ref === ref), `attention has ${item} on ${ref}`);
  assert.ok(!attention.some((r) => r.ref === 'L 39/9105'), 'a miscellaneous licence has no Form 5 and its rent is paid');
  assert.ok(!attention.some((r) => r.ref === 'P 51/9204' && /exemption/.test(r.item)), 'an exemption lodged in time clears the item');
  const findings = await call('compliance');
  const rules = new Set(findings.map((r) => r.rule));
  for (const r of ['FORM5', 'RENT', 'EXEMPTION', 'CPS', 'EXPIRY', 'OBLIGATION']) assert.ok(rules.has(r), `compliance has ${r}`);
  assert.ok(findings.some((r) => r.rule === 'RENT' && r.ref === 'P 51/9204' && /paid .* after/.test(r.finding)), 'rent paid late is a finding');
  assert.ok(findings.filter((r) => r.severity === 'breach').every((r) => /late/.test(r.finding)));
  assert.ok((await call('due', [], { days: '30' })).every((r) => r.days_left <= 30));
  await fails('due', [], { days: 'soon' }, /--days/);
  assert.ok((await call('shortfalls')).some((r) => r.ref === 'E 39/9101' && Number(r.shortfall_cents) === 1800000));
  assert.ok((await call('surrenders')).some((r) => r.ref === 'E 45/9301' && r.lodged_on));
  assert.equal((await call('applications')).length, 1);

  // The rule arithmetic.
  assert.equal(normaliseRef('e39/09101'), 'E 39/9101');
  assert.equal(normaliseRef(' M 39 / 9104 '), 'M 39/9104');
  assert.throws(() => normaliseRef('39/9101'), /Not a tenement number/);
  assert.equal(cents('70,000.50'), 7000050);
  assert.throws(() => cents('12.345'), /dollar/);
  assert.equal(isoDate('03/02/2026'), '2026-02-03');
  assert.throws(() => isoDate('2026-02-30'), /Invalid/);
  const [{ a }] = await db.query("select (date '2024-02-29' + make_interval(years => 1))::date::text as a");
  assert.equal(a, '2025-02-28', 'a leap-day grant has its anniversary on 28 February');

  // A new exploration licence from application to grant, rent, spend, Form 5 and exemption.
  await call('add-project', [], { ...A, code: 'tst', name: 'Test Project', region: 'Leonora, WA' });
  await call('add-holder', [], { ...A, code: 'jvp', name: 'Partner Pty Ltd', partner: true });
  await fails('add-tenement', [], { ...A, ref: 'Z 39/1', holder: 'RKR' }, /type Z/);
  await fails('add-tenement', [], { ...A, ref: 'E 37/1001', holder: 'RKR', status: 'live' }, /--granted/);
  await fails('add-tenement', [], { ...A, ref: 'E 37/1001', holder: 'RKR', granted: '2999-01-01' }, /future/);
  const app = await call('add-tenement', [], { ...A, ref: 'e37/1001', project: 'TST', holder: 'RKR', applied: day(800), area: '30', location: 'Leonora, WA', manager: 'Tester' });
  assert.equal(app.ref, 'E 37/1001');
  assert.equal(app.status, 'application');
  await fails('pay-rent', ['E 37/1001'], A, /application, not live/);
  const g = await call('grant', ['E 37/1001'], { ...A, on: day(400), expires: isoDate(day(400 - 5 * 365)), commitment: '30000', rent: '2550' });
  assert.equal(g.status, 'live');
  await fails('grant', ['E 37/1001'], A, /Only an application/);
  await fails('pay-rent', ['E 37/1001'], { ...A, year: '2020-01-01' }, /not an anniversary/);
  const rent = await call('pay-rent', ['E 37/1001'], { ...A, on: today(), receipt: 'R-T1' });
  assert.equal(Number(rent.amount_cents), 255000);
  await fails('pay-rent', ['E 37/1001'], A, /duplicate|unique/i);
  await fails('spend', ['E 37/1001'], { ...A, category: 'lunch', amount: '10', description: 'x' }, /Unknown category/);
  await fails('spend', ['E 37/1001'], { ...A, on: '2999-01-01', category: 'drilling', amount: '10', description: 'x' }, /future/);
  await call('spend', ['E 37/1001'], { ...A, on: day(200), category: 'drilling', amount: '12,000', description: 'RC drilling', supplier: 'Test Drilling' });
  const thisYear = await call('spend', ['E 37/1001'], { ...A, on: day(10), category: 'geology', amount: '1500', description: 'Mapping' });
  assert.equal(Number(thisYear.spent_this_year_cents), 150000);
  const f5 = await call('lodge-form5', ['E 37/1001'], { ...A, on: today(), receipt: 'F5-T1' });
  assert.equal(Number(f5.reported_cents), 1200000);
  assert.equal(Number(f5.shortfall_cents), 1800000);
  await fails('lodge-form5', ['E 37/1001'], A, /duplicate|unique/i);
  assert.ok(read((await call('draft-exemption', ['E 37/1001'])).file).includes('short by $18,000'));
  const ex = await call('lodge-exemption', ['E 37/1001'], { ...A, on: today(), grounds: 'Heritage survey delayed' });
  assert.equal(ex.in_time, true);
  await fails('decide-exemption', ['E 37/1001'], { ...A, outcome: 'maybe' }, /--outcome/);
  assert.equal((await call('decide-exemption', ['E 37/1001'], { ...A, outcome: 'granted' })).outcome, 'granted');
  await fails('decide-exemption', ['E 37/1001'], { ...A, outcome: 'granted' }, /no pending/);
  await fails('lodge-exemption', ['E 39/9102'], { ...A, grounds: 'x' }, /met its commitment/);

  // Interests move forward in time; the schedule reads them.
  const moved = await call('interest', ['E 37/1001'], { ...A, holder: 'RKR', pct: '60', from: day(5) });
  assert.ok(moved.some((r) => r.holder === 'RKR' && Number(r.pct) === 60));
  await fails('interest', ['E 37/1001'], { ...A, holder: 'RKR', pct: '50', from: day(30) }, /forward in time/);
  assert.ok((await call('compliance')).some((r) => r.rule === 'INTERESTS' && r.ref === 'E 37/1001'), 'shares that do not add to 100 are flagged');
  await call('interest', ['E 37/1001'], { ...A, holder: 'JVP', pct: '40', nature: 'joint venture', from: day(5) });
  await fails('interest', ['E 37/1001'], { ...A, holder: 'JVP', pct: '10', nature: 'friendly' }, /--nature/);

  // Surrenders: the 40% rule, then a full surrender that ends the tenement and opens the final Form 5.
  await fails('surrender', ['E 39/9103'], { ...A, kind: 'compulsory partial', area: '20' }, /at least 40%/);
  const cps = await call('surrender', ['E 39/9103'], { ...A, kind: 'compulsory partial', area: '28' });
  assert.equal(Number(cps.area), 42);
  assert.ok(!(await call('attention')).some((r) => r.ref === 'E 39/9103' && /surrender/.test(r.item)), 'a lodged surrender clears the date');
  await fails('surrender', ['E 39/9106'], { ...A, kind: 'part', area: '1' }, /--kind/);
  const full = await call('surrender', ['E 37/1001'], { ...A, kind: 'full' });
  assert.equal(full.status, 'surrendered');
  assert.ok((await call('form5')).some((r) => r.ref === 'E 37/1001' && /Final/.test(r.detail)), 'a surrender opens the final Form 5');
  await fails('surrender', ['E 37/1001'], { ...A, kind: 'full' }, /not live/);

  // Extensions: before expiry, then a new expiry.
  assert.ok(read((await call('draft-extension', ['E 51/9201'])).file).includes('Term ends'));
  await call('apply-extension', ['E 51/9201'], { ...A, grounds: 'Heritage clearance delayed the drilling programme' });
  await fails('apply-extension', ['E 51/9201'], { ...A, grounds: 'again' }, /already has a pending/);
  assert.ok(!(await call('attention')).some((r) => r.ref === 'E 51/9201' && /extension/.test(r.item)), 'a pending extension clears the expiry item');
  await fails('decide-extension', ['E 51/9201'], { ...A, outcome: 'granted', expires: '2001-01-01' }, /must be after/);
  const ext = await call('decide-extension', ['E 51/9201'], { ...A, outcome: 'granted', expires: isoDate(day(-5 * 365)) });
  assert.ok(String(ext.expires_on) > today());
  await fails('decide-extension', ['E 51/9201'], { ...A, outcome: 'granted' }, /no pending/);

  // Agreements, obligations and conditions.
  await fails('add-agreement', [], { ...A, kind: 'handshake', title: 'x', counterparty: 'y' }, /--kind/);
  const ag = await call('add-agreement', [], { ...A, kind: 'royalty', title: 'Vendor royalty', counterparty: 'Prospector (fictional)', project: 'TST', signed: day(30) });
  assert.equal(ag.code, 'AG-01');
  await fails('add-obligation', [], { ...A, title: 'x', due: today(), owner: 'x' }, /--tenement or --agreement/);
  const ob = await call('add-obligation', [], { ...A, title: 'Royalty statement', agreement: 'AG-01', due: day(-14), owner: 'Tester' });
  assert.ok((await call('obligations')).some((r) => r.code === ob.code));
  assert.equal((await call('done', [ob.code], A)).on_time, true);
  await fails('done', [ob.code], A, /was done/);
  await call('done', ['OB-01'], { ...A, on: today() });
  assert.ok(!(await call('attention')).some((r) => r.ref === 'NT-01'));
  await call('add-condition', ['E 39/9106'], { ...A, number: '1', text: 'No clearing of native vegetation without a permit.' });
  await fails('add-condition', ['E 39/9106'], { ...A, number: 'one', text: 'x' }, /--number/);

  // ASX quarters and the Listing Rule 5.3.3 schedule.
  await fails('add-quarter', [], { ...A, ends: '2026-05-31' }, /last day of a calendar quarter/);
  const q = await call('add-quarter', [], { ...A, ends: '2025-03-31' });
  assert.equal(String(q.due_on), '2025-04-30');
  const last = (await call('quarters'))[0].code;
  const sch = await call('schedule', [last]);
  assert.equal(sch.sections.length, 5);
  assert.ok(sch.sections[0].rows.some((r) => r.tenement === 'E 51/9202' && r.status === 'application'), 'pending applications are listed');
  assert.ok(sch.sections[0].rows.some((r) => r.tenement === 'E 45/9301' && Number(r.interest_at_end) === 80));
  assert.ok(sch.sections[2].rows.some((r) => r.tenement === 'E 45/9302'), 'the surrender is a disposal');
  assert.ok(sch.sections[3].rows.some((r) => r.tenement === 'E 45/9303' && r.nature === 'farm-in'));
  assert.ok(read((await call('draft-schedule', [last])).file).includes('Listing Rule 5.3.3'));
  assert.equal((await call('report-quarter', [last], { ...A, on: today() })).on_time, true);
  await fails('report-quarter', [last], A, /was reported/);

  // Drafts never lodge; they land in drafts/.
  const paper = read((await call('draft-form5', ['E 39/9101'])).file);
  assert.ok(paper.includes('Short by $18,000') && paper.includes('It is not the Form 5'));
  assert.ok(read((await call('weekly-review')).file).includes('due --days=14'));
  const detail = await call('tenement', ['e39/9101']);
  assert.equal(detail.sections.length, 10);
  assert.ok((await call('project', ['lcg'])).sections[1].rows.length >= 6);
  await fails('tenement', ['E 39/91'], {}, /Ambiguous tenement/);
  await fails('tenement', ['nowhere at all'], {}, /No matching tenement/);

  // Imports: a tenement schedule and expenditure lines, all or nothing, safe to repeat.
  const csv = path.join(dir, 'schedule.csv');
  fs.writeFileSync(csv, 'Tenement,Status,Project,Location,Holder,Applied,Granted,Expiry,Area,Area unit,Commitment,Rent,Manager\n'
    + `E 29/5001,Live,Menzies Gold,"Menzies, WA",RKR 75; JVP 25,${day(900)},${day(800)},${isoDate(day(800 - 5 * 365))},22,blocks,"40,000",3740,Tester\n`
    + `E29/5002,Pending,Menzies Gold,"Menzies, WA",Red Kite Resources Ltd,${day(40)},,,8,blocks,,,Tester\n`);
  const dry = await call('import', ['schedule', csv], { ...A, 'dry-run': true });
  assert.equal(dry.inserted, 2);
  assert.equal((await db.query("select * from tenements where ref like 'E 29/%'")).length, 0, 'a dry run writes nothing');
  assert.equal((await call('import', ['schedule', csv], A)).inserted, 2);
  assert.equal((await call('import', ['schedule', csv], A)).skipped, 2, 'a repeat import skips what is there');
  assert.equal((await db.query("select * from tenement_register where ref = 'E 29/5001' and group_pct = 75")).length, 1);
  const bad = path.join(dir, 'bad.csv');
  fs.writeFileSync(bad, `Tenement,Status,Holder,Granted\nE 29/5003,Live,RKR 60; JVP 30,${day(100)}\nE 29/5004,Live,RKR,\n`);
  await fails('import', ['schedule', bad], A, /add up to 90/);
  assert.equal((await db.query("select * from tenements where ref = 'E 29/5003'")).length, 0, 'a failed import writes nothing');
  fs.writeFileSync(bad, 'Tenement,Status,Shoe size\nE 29/5003,Live,9\n');
  await fails('import', ['schedule', bad], A, /Unknown column/);
  const mapped = path.join(dir, 'map.json');
  fs.writeFileSync(mapped, JSON.stringify({ Tenement: 'Title', Status: 'State', Holder: 'Holders', Granted: 'Grant date' }));
  fs.writeFileSync(bad, `Title,State,Holders,Grant date\nP 29/6001,Granted,RKR,${day(50)}\n`);
  assert.equal((await call('import', ['schedule', bad], { ...A, map: mapped })).inserted, 1, 'headings can be mapped');
  const spend = path.join(dir, 'spend.csv');
  fs.writeFileSync(spend, `Tenement,Date,Category,Amount,Description,Supplier\nE 29/5001,${day(20)},drilling,"8,500.00",Aircore drilling,Test Drilling\nE 29/5001,${day(15)},geochemistry,1200,Assays,\n`);
  assert.equal((await call('import', ['spend', spend], A)).inserted, 2);
  assert.equal((await call('import', ['spend', spend], A)).skipped, 2);
  fs.writeFileSync(bad, `Tenement,Date,Amount,Description\nE 99/1,${day(1)},10,x\n`);
  await fails('import', ['spend', bad], A, /not in the register/);
  await fails('import', ['xlsx', csv], A, /Supported imports/);
  await fails('import', ['schedule', csv], { ...A, dryrun: true }, /Unknown flag/);

  // Export is complete and never overwrites.
  const exp = await call('export', [], { file: path.join(dir, 'archive.json') });
  const archive = JSON.parse(read(exp.file));
  for (const t of TABLES) assert.equal(archive[t].length, (await db.query(`select * from ${t}`)).length, t);
  await fails('export', [], { file: exp.file }, /EEXIST/);
  await fails('nonsense', [], {}, /Unknown command/);
  await fails('tenements', ['extra'], {}, /takes 0 argument/);
  await fails('add-holder', [], { ...A, code: 'X', name: 'Y', partner: 'yes' }, /takes no value/);

  assert.deepEqual(COMMANDS.filter((c) => !covered.has(c)), [], 'every CLI command is exercised');
  assert.ok((await db.query("select relrowsecurity from pg_class where relname = 'tenements'"))[0].relrowsecurity);
  await db.query("update tenements set location = '<script>alert(1)</script>' where ref = 'E 39/9101'");
  await db.close();

  // The CLI, the views and the documents as a person runs them.
  child('tenements.mjs', ['--help']);
  child('tenements.mjs', ['unknown'], 1);
  assert.ok(child('tenements.mjs', ['attention']).includes('late: Form 5'));
  assert.ok(JSON.parse(child('tenements.mjs', ['holders', '--json'])).length === 5);
  assert.match(JSON.parse(child('tenements.mjs', ['tenement', 'E 39/91', '--json'], 1)).error, /Ambiguous/);
  child('view.mjs');
  child('docs.mjs');
  assert.equal(fs.readdirSync(path.join(dir, 'views')).length, 3);
  const files = fs.readdirSync(path.join(dir, 'docs-out', 'tenement-summary'));
  assert.ok(files.length >= 17);
  const html = files.map((f) => read(path.join(dir, 'docs-out', 'tenement-summary', f))).join('\n');
  assert.ok(html.includes('&lt;script&gt;') && !html.includes('<script>alert(1)</script>'), 'text is escaped in documents');
  console.log(`PASS: ${covered.size} CLI commands; migration, idempotent seed, Form 5, rent, exemption, partial surrender and expiry dates, interests and the ASX schedule, obligations, atomic schedule and spend imports, drafts, export, RLS and escaped HTML (${checks} negative and subprocess checks).`);
} catch (e) {
  try { await db.close(); } catch {}
  throw e;
} finally {
  fs.rmSync(dir, { recursive: true, force: true });
}

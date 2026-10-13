import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { ContentStore } from '../server/content-store.mjs';
import { InboxStore, csvCell } from '../server/inbox.mjs';
import { validateDemo, validateCareers, validateAsk, isBot } from '../server/forms.mjs';

const centres = ['Kadavanthra', 'Vennala'];
const demo = { name: '  Asha   K ', phone: '98950 85731', grade: '9', board: 'CBSE', mode: 'At a centre', centre: 'Vennala', preferred_time: '6 pm' };

test('a demo booking is cleaned: name trimmed, phone in +91 form', () => {
  const { values, errors } = validateDemo(demo, { centres });
  assert.deepEqual(errors, {});
  assert.deepEqual(values, { name: 'Asha K', phone: '+919895085731', grade: '9', board: 'CBSE', mode: 'At a centre', centre: 'Vennala', preferred_time: '6 pm' });
});

test('an online booking drops any centre, and a centre booking needs a real centre', () => {
  assert.equal(validateDemo({ ...demo, mode: 'Online' }, { centres }).values.centre, '');
  assert.ok(validateDemo({ ...demo, centre: 'Mars' }, { centres }).errors.centre);
});

test('demo bookings reject a bad phone, a class outside 5 to 12 and unknown boards', () => {
  const { errors } = validateDemo({ ...demo, phone: '12345', grade: '4', board: 'IB' }, { centres });
  assert.deepEqual(Object.keys(errors).sort(), ['board', 'grade', 'phone']);
});

test('job applications need a listed role, a real email and a web link for the CV', () => {
  const base = { name: 'Ravi', phone: '9895085731', email: 'ravi@example.com', role: 'Physics teacher', experience: '3 years', message: 'Hello', cv_url: 'https://drive.google.com/x' };
  assert.deepEqual(validateCareers(base, { roles: ['Physics teacher'] }).errors, {});
  assert.ok(validateCareers({ ...base, role: 'Pilot' }, { roles: ['Physics teacher'] }).errors.role);
  assert.equal(validateCareers({ ...base, role: 'Other' }, { roles: [] }).errors.role, undefined);
  assert.ok(validateCareers({ ...base, cv_url: 'javascript:alert(1)' }, { roles: ['Physics teacher'] }).errors.cv_url);
  assert.ok(validateCareers({ ...base, email: 'not-an-email' }, { roles: ['Physics teacher'] }).errors.email);
});

test('questions need 10 or more characters; email is optional but must be valid', () => {
  assert.deepEqual(validateAsk({ name: 'Meera', phone: '9895085731', question: 'Do you teach Class 8 maths online?' }).errors, {});
  assert.ok(validateAsk({ name: 'Meera', phone: '9895085731', question: 'Fees?' }).errors.question);
  assert.ok(validateAsk({ name: 'Meera', phone: '9895085731', email: 'x', question: 'Do you teach Class 8 maths online?' }).errors.email);
});

test('the hidden website field marks a bot', () => {
  assert.equal(isBot({ website: '' }), false);
  assert.equal(isBot({}), false);
  assert.equal(isBot({ website: 'http://spam.example' }), true);
});

test('spreadsheet formulas in exported cells are neutralised and quotes are escaped', () => {
  assert.equal(csvCell('=HYPERLINK("http://x")'), `"'=HYPERLINK(""http://x"")"`);
  assert.equal(csvCell('+918891910919'), "'+918891910919");
  assert.equal(csvCell('-1'), "'-1");
  assert.equal(csvCell('@SUM(A1)'), "'@SUM(A1)");
  assert.equal(csvCell('Line one\nLine two'), '"Line one\nLine two"');
  assert.equal(csvCell('Plain'), 'Plain');
  assert.equal(csvCell(null), '');
});

const setup = () => {
  const db = new DatabaseSync(':memory:');
  const content = new ContentStore(db);
  content.applySeed();
  return { content, inbox: new InboxStore(db) };
};

test('inbox entries list newest first, change status and can be deleted', () => {
  const { inbox } = setup();
  const first = inbox.add('demo', validateDemo(demo, { centres }).values);
  const second = inbox.add('demo', validateDemo({ ...demo, name: 'Second' }, { centres }).values);
  assert.deepEqual(inbox.list('demo').map(r => r.id), [second, first]);
  assert.deepEqual(inbox.counts(), { demo: 2, careers: 0, ask: 0 });
  assert.equal(inbox.update('demo', first, { status: 'contacted', notes: 'Called\r\nat 6' }), true);
  assert.equal(inbox.list('demo').find(r => r.id === first).notes, 'Called\nat 6');
  assert.equal(inbox.counts().demo, 1);
  assert.throws(() => inbox.update('demo', first, { status: 'lost' }), /new, contacted or closed/);
  assert.equal(inbox.update('demo', 9999, { status: 'closed' }), false);
  assert.equal(inbox.remove('demo', first), true);
  assert.equal(inbox.list('demo').length, 1);
  assert.throws(() => inbox.list('nope'), /Unknown inbox/);
});

test('the CSV export has a header, readable phones and safe cells', () => {
  const { inbox } = setup();
  inbox.add('demo', validateDemo({ ...demo, name: '=HYPERLINK("http://x")' }, { centres }).values);
  const csv = inbox.csv('demo');
  assert.ok(csv.startsWith('﻿Received,Student,Phone,Class,Board,Online or centre,Centre,Preferred time,Status,Notes\r\n'));
  assert.match(csv, /,"'=HYPERLINK\(""http:\/\/x""\)",'\+91 98950 85731,9,CBSE,At a centre,Vennala,6 pm,new,\r\n$/);
});

test('an answered question is published to the FAQ and closed', () => {
  const { inbox, content } = setup();
  const id = inbox.add('ask', validateAsk({ name: 'Meera', phone: '9895085731', question: 'do u teach class 8 online??' }).values);
  const faqId = inbox.publishAnswer(id, { category: 'Programmes', question: 'Do you teach Class 8 online?', answer: 'Yes. Class 8 is taught online and at every centre.' });
  assert.ok(faqId > 0);
  assert.equal(content.faqs().at(-1).question, 'Do you teach Class 8 online?');
  const [row] = inbox.list('ask');
  assert.equal(row.status, 'closed');
  assert.equal(row.faq_id, faqId);
  assert.throws(() => inbox.publishAnswer(id, { category: '', question: 'Q?', answer: '' }), /highlighted/);
  assert.equal(inbox.publishAnswer(9999, { category: 'Programmes', question: 'Question?', answer: 'Answer.' }), null);
});

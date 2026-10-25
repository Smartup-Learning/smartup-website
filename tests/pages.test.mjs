import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSiteServer } from '../server.mjs';
import { AssessmentStore } from '../server/assessment.mjs';
import { ContentStore } from '../server/content-store.mjs';

async function start(prepare = () => {}) {
  const store = new AssessmentStore(':memory:');
  const content = new ContentStore(store.db);
  content.applySeed();
  prepare(content);
  const server = createSiteServer({ store, content });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  const html = async path => { const r = await fetch(base + path); assert.equal(r.status, 200, path); return r.text(); };
  return { html, base, content, close: () => new Promise(r => server.close(() => { store.close(); r(); })) };
}

test('Our Story lists every chapter in order, the growth data and the vision', async t => {
  const site = await start();
  t.after(site.close);
  const page = await site.html('/story');
  const years = [...page.matchAll(/data-year="([^"]+)"/g)].map(m => m[1]);
  assert.deepEqual(years, ['2014', '2015', '2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025', '2026', 'Next']);
  assert.match(page, /30,000\+/);
  assert.match(page, /Shaping the future of learning/);
});

test('Our Story keeps the vision to headlines, introduces the founders and invites teachers', async t => {
  const site = await start();
  t.after(site.close);
  const page = await site.html('/story');
  const vision = page.split('id="vision"')[1].split('</section>')[0];
  assert.match(vision, /A global education network/);
  assert.doesNotMatch(vision, /Expand across the GCC/, 'no long descriptions');
  assert.doesNotMatch(vision, /discover each student/, 'no paragraphs');
  assert.match(page, /The people behind Smartup[\s\S]*Mohamed Rayees/);
  assert.match(page, /Teach with Smartup[\s\S]*href="\/careers"/);
  assert.match(page, /href="\/contact"[^>]*>Connect with us</);
});

test('photos from past years on Our Story are black and white, and this year stays in colour', async t => {
  const site = await start();
  t.after(site.close);
  const page = await site.html('/story');
  const media = year => page.split(`data-year="${year}"`)[1].split('</li>')[0];
  assert.match(media('2014'), /chapter-media--past/);
  assert.match(media('2025'), /chapter-media--past/);
  assert.doesNotMatch(media('2026'), /chapter-media--past/);
  assert.match(page.split('class="hero-visual')[1].slice(0, 40), /hero-visual--past/);
});

test('a chapter edited by staff appears on the next request', async t => {
  const site = await start(content => content.db.prepare("UPDATE timeline_entries SET title = 'Edited chapter title' WHERE year_label = '2015'").run());
  t.after(site.close);
  assert.match(await site.html('/story'), /Edited chapter title/);
});

test('story intro does not double up "more than" with a plus sign', async t => {
  const site = await start();
  t.after(site.close);
  assert.doesNotMatch(await site.html('/story'), /more than \d[\d,]*\+/);
});

test('homepage sections follow the client order', async t => {
  const site = await start();
  t.after(site.close);
  const page = await site.html('/');
  const ids = [...page.matchAll(/<section[^>]*\sid="([^"]+)"/g)].map(m => m[1]);
  assert.deepEqual(ids, ['courses', 'offline', 'results', 'feedback', 'alumni', 'connect']);
});

test('the homepage gives Offline Centres their own section, one call button per shared number', async t => {
  const site = await start();
  t.after(site.close);
  const offline = (await site.html('/')).split('id="offline"')[1].split('</section>')[0];
  assert.match(offline, /Offline Centres/);
  for (const name of ['Eraveli', 'Fort Kochi', 'Kadavanthra', 'Chullickal', 'Moolamkuzhi', 'Edappally', 'Palluruthy', 'Thoppumpady', 'Vennala']) assert.match(offline, new RegExp(name));
  assert.deepEqual([...offline.matchAll(/href="tel:(\+\d+)"/g)].map(m => m[1]), ['+917356072139', '+917356072108', '+917356072098']);
});

test('Connect with us offers a call, a centre and the teaching openings', async t => {
  const site = await start();
  t.after(site.close);
  const connect = (await site.html('/')).split('id="connect"')[1].split('</section>')[0];
  assert.match(connect, /href="tel:\+918891910919"/);
  assert.match(connect, /href="\/contact"/);
  assert.match(connect, /Teach with Smartup[\s\S]*12 openings/);
  assert.match(connect, /href="\/demo"[^>]*>Find your program</);
});

test('every programme card shows its mentorship with a tick, and Courses compares it in one row', async t => {
  const site = await start();
  t.after(site.close);
  const home = await site.html('/');
  for (const text of ['1:1 Mentorship', '1:3 Mentorship', 'Mentorship included']) assert.match(home, new RegExp(`class="mentorship"[^>]*>[\\s\\S]{0,120}${text}`), text);
  const courses = await site.html('/courses');
  const row = courses.split(/<th scope="row"[^>]*>Mentorship<\/th>/)[1].split('</tr>')[0];
  assert.match(row, /1:1 Mentorship[\s\S]*1:3 Mentorship[\s\S]*aria-label="Included"/);
  assert.doesNotMatch(courses, /<th scope="row"[^>]*>Mentorship and support</);
});

test('sections with no published content are left out, heading and all', async t => {
  const site = await start(content => {
    content.db.exec("UPDATE testimonials SET published = 0; UPDATE alumni SET published = 0; UPDATE jobs SET published = 0; UPDATE results SET published = 0;");
  });
  t.after(site.close);
  const page = await site.html('/');
  for (const id of ['results', 'feedback', 'alumni', 'careers']) assert.doesNotMatch(page, new RegExp(`id="${id}"`), id);
  assert.match(page, /id="courses"/);
});

test('results always name exam and year', async t => {
  const site = await start();
  t.after(site.close);
  const page = await site.html('/');
  assert.match(page, /SSLC · 2026/);
  assert.match(page, /Class 10 · 2026/);
});

test('pages still render when settings keys go missing while running', async t => {
  const site = await start();
  t.after(site.close);
  site.content.db.exec("DELETE FROM settings WHERE key IN ('social', 'phone', 'vision', 'heroHeadline')");
  for (const path of ['/', '/story']) assert.doesNotMatch(await site.html(path), /Internal server error|undefined/, path);
});

test('written testimonials render as quotes, not empty video players', async t => {
  const site = await start(content => content.db.prepare("INSERT INTO testimonials(kind, section, title, person, quote, sort) VALUES('written', 'feedback', 'A parent', 'Parent of a Class 10 student', 'Smartup changed how my son studies.', 9)").run());
  t.after(site.close);
  const page = await site.html('/');
  assert.match(page, /<blockquote[^>]*>[\s\S]*Smartup changed how my son studies\.[\s\S]*<\/blockquote>/);
  assert.doesNotMatch(page, /src=""/);
});

test('Our Story stays tidy when chapters and growth data are empty', async t => {
  const site = await start(content => content.db.exec('DELETE FROM timeline_entries; DELETE FROM growth_points;'));
  t.after(site.close);
  const page = await site.html('/story');
  assert.doesNotMatch(page, /to\s+students/);
  assert.doesNotMatch(page, /year by year/);
});

test('the homepage description is built from the live stats', async t => {
  const site = await start(content => content.db.exec("UPDATE stats SET value = '10' WHERE label = 'Centres in Kochi'"));
  t.after(site.close);
  assert.match(await site.html('/'), /<meta name="description" content="[^"]*10 centres in kochi/i);
});

test('Founders lists all four leaders with full bios and Vision 2030', async t => {
  const site = await start();
  t.after(site.close);
  const page = await site.html('/founders');
  for (const name of ['Mohamed Rayees', 'Dhanesh Narayanan Achari', 'Mohamed Shihas K. Y.', 'Shanu K. Y.']) assert.match(page, new RegExp(name.replace(/\./g, '\\.')));
  assert.match(page, /Vision 2030/);
  assert.match(page, /Meet the four people who lead Smartup/);
});

test('Faculty lists every published team member with qualifications', async t => {
  const site = await start();
  t.after(site.close);
  const page = await site.html('/faculty');
  assert.equal([...page.matchAll(/data-filter-tags=/g)].length, 35);
  assert.match(page, /Aflah K\. R\./);
  assert.match(page, /MSc Botany/);
});

test('an empty faculty table shows a friendly message and no filter bar', async t => {
  const site = await start(content => content.db.exec('UPDATE faculty SET published = 0'));
  t.after(site.close);
  const page = await site.html('/faculty');
  assert.match(page, /Our team will be introduced here soon/);
  assert.doesNotMatch(page, /data-filter-for/);
});

test('Results groups every result by year, newest first, then by exam, with a figure strip and whole posters', async t => {
  const site = await start();
  t.after(site.close);
  const page = await site.html('/results');
  const years = [...page.matchAll(/<section[^>]*data-year="(\d{4})"/g)].map(m => m[1]);
  assert.deepEqual(years, ['2026', '2025', '2024', '2023', '2020']);
  assert.match(page, /<strong[^>]*>127<\/strong> students with Full A\+/);
  const year2026 = page.slice(page.indexOf('data-year="2026"'), page.indexOf('data-year="2025"'));
  const exams = [...year2026.matchAll(/<h4[^>]*class="exam-title"[^>]*>([^<]+)/g)].map(m => m[1].trim());
  assert.deepEqual(exams.sort(), ['Class 10', 'Plus One', 'Plus Two', 'SSLC']);
  assert.match(page, /href="\/seed\/img\/result-2026-sslc-107-1600\.webp"/);
  assert.match(page, /<span class="name"[^>]*>Afna Navas<\/span>/);
  assert.match(page, /<span class="score"[^>]*>1108\/1200<\/span>/);
});

test('result detail that only repeats the exam and year is not printed again, but a centre or Full A+ is', async t => {
  const site = await start();
  t.after(site.close);
  const page = await site.html('/results');
  assert.doesNotMatch(page, /CBSE Class 10, 2025–\u206026/);
  assert.match(page, /<span class="extra"[^>]*>Chullickal<\/span>/);
});

test('a landscape result poster spans two columns', async t => {
  const site = await start();
  t.after(site.close);
  assert.match(await site.html('/results'), /<figure[^>]*class="result[^"]*\bwide\b[^"]*"[^>]*>(?:(?!<\/figure>)[\s\S])*timeline-2020-results/);
});

test('Results without any rows shows a friendly message', async t => {
  const site = await start(content => content.db.exec('UPDATE results SET published = 0'));
  t.after(site.close);
  assert.match(await site.html('/results'), /Results will be published here soon/);
});

test('Life @ Smartup lists every event with its category', async t => {
  const site = await start();
  t.after(site.close);
  const page = await site.html('/life');
  for (const title of ['Talent Eve 7.0', 'Shoot the Drugs', 'Coffee With Chairman', 'Onam']) assert.match(page, new RegExp(title));
  assert.match(page, /data-filter-tags="talent-eve"/);
});

test('Videos groups videos into their categories and links to the channels', async t => {
  const site = await start();
  t.after(site.close);
  const page = await site.html('/videos');
  for (const heading of ['Live classes', 'Exam preparation', 'Short lessons', 'Toppers Talk', 'From the Chairman', 'Events']) assert.match(page, new RegExp(heading));
  assert.match(page, /youtube\.com\/@smartupeducations/);
  assert.doesNotMatch(page, /<iframe/);
});

test('an empty events table shows a friendly message', async t => {
  const site = await start(content => content.db.exec('UPDATE events SET published = 0'));
  t.after(site.close);
  assert.match(await site.html('/life'), /New photos and stories are on their way/);
});

test('Testimonials shows student and parent videos, and hides Google Reviews until a link is set', async t => {
  const site = await start();
  t.after(site.close);
  const page = await site.html('/testimonials');
  assert.equal([...page.matchAll(/<video /g)].length, 3);
  assert.match(page, /Smartup through a parent/);
  assert.doesNotMatch(page, /Google Reviews/);
});

test('a Google Reviews link appears once it is set', async t => {
  const site = await start(content => content.db.prepare("UPDATE settings SET value = ? WHERE key = 'googleReviewsUrl'").run(JSON.stringify('https://g.page/r/example/review')));
  t.after(site.close);
  assert.match(await site.html('/testimonials'), /href="https:\/\/g\.page\/r\/example\/review"/);
});

test('Alumni shows the alumni videos and an invitation to share a story', async t => {
  const site = await start();
  t.after(site.close);
  const page = await site.html('/alumni');
  assert.equal([...page.matchAll(/<video /g)].length, 3);
  assert.match(page, /mailto:info@smartupedu\.in\?subject=/);
});

test('Courses explains every programme, class lengths and parent updates', async t => {
  const site = await start();
  t.after(site.close);
  const page = await site.html('/courses');
  for (const text of ['Smartup Pro', 'Smartup Trio', 'Smartup Power', 'State Board programme', '1 hr 45 min', 'Monthly report', '1:1 Mentorship', 'Previous Year Questions']) assert.match(page, new RegExp(text));
  assert.match(page, /9 centres/);
});

test('Courses calls the classroom option Offline Centres and leaves centre details to Contact', async t => {
  const site = await start();
  t.after(site.close);
  const page = await site.html('/courses');
  assert.doesNotMatch(page, /Learn from home/);
  const offline = page.split('id="offline-title"')[1].split('</section>')[0];
  assert.match(page, />Offline Centres</);
  assert.doesNotMatch(offline, /tel:|maps\.app/);
  assert.match(offline, /href="\/contact"/);
});

test('the blog lists posts newest first and each post renders its body', async t => {
  const site = await start();
  t.after(site.close);
  const list = await site.html('/blog');
  const slugs = [...list.matchAll(/href="\/blog\/([a-z0-9-]+)"/g)].map(m => m[1]);
  assert.deepEqual([...new Set(slugs)], ['home-tuition-or-online-tuition', 'board-exam-90-day-plan', 'how-parents-can-help-in-exam-season', 'daily-practice-beats-cramming']);
  const post = await site.html('/blog/board-exam-90-day-plan');
  assert.match(post, /<h2>Days 1–\u206030: finish the first round<\/h2>/);
  assert.match(post, /<article/);
});

test('a post body cannot inject HTML', async t => {
  const site = await start(content => content.db.prepare("UPDATE posts SET body = '<img src=x onerror=alert(1)>' WHERE slug = 'daily-practice-beats-cramming'").run());
  t.after(site.close);
  const post = await site.html('/blog/daily-practice-beats-cramming');
  assert.doesNotMatch(post, /<img src=x/);
  assert.match(post, /&lt;img src=x onerror=alert\(1\)&gt;/);
});

test('an empty blog shows a friendly message', async t => {
  const site = await start(content => content.db.exec('UPDATE posts SET published = 0'));
  t.after(site.close);
  assert.match(await site.html('/blog'), /First articles are on their way/);
});

test('Ask Smartup lists FAQs and offers a phone and email fallback', async t => {
  const site = await start();
  t.after(site.close);
  const page = await site.html('/ask');
  assert.equal([...page.matchAll(/data-faq[\s>]/g)].length, 13);
  assert.match(page, /href="tel:\+918891910919"/);
  assert.match(page, /mailto:info@smartupedu\.in/);
});

test('App and Community pages link to the stores and every social channel', async t => {
  const site = await start();
  t.after(site.close);
  const app = await site.html('/app');
  assert.match(app, /apps\.apple\.com\/in\/app\/smartup-learning/);
  assert.match(app, /play\.google\.com\/store\/apps\/details\?id=com\.paperlms\.smartup/);
  const community = await site.html('/community');
  assert.equal([...community.matchAll(/class="channel"/g)].length, 7);
});

test('Contact lists every centre, all phone numbers and the registered office', async t => {
  const site = await start();
  t.after(site.close);
  const page = await site.html('/contact');
  assert.equal([...page.matchAll(/class="centre"/g)].length, 9);
  for (const tel of ['+918891910919', '+917356072079', '+917994436060']) assert.match(page, new RegExp(`href="tel:\\${tel}"`));
  assert.match(page, /Smartup Eduventures Private Limited/);
  assert.match(page, /Kadavanthra, Ernakulam 682020/);
});

test('Careers groups openings by type and each one links to the application form', async t => {
  const site = await start();
  t.after(site.close);
  const page = await site.html('/careers');
  assert.equal([...page.matchAll(/href="\/careers\?role=[^"#]+#apply"/g)].length, 12);
  for (const type of ['Full time', 'Part time', 'Teaching assistant', 'Other']) assert.match(page, new RegExp(`<h2[^>]*>${type}`));
  assert.match(page, /<form method="post" action="\/api\/forms\/careers"/);
});

test('Careers without openings says so and still invites applications', async t => {
  const site = await start(content => content.db.exec('UPDATE jobs SET published = 0'));
  t.after(site.close);
  assert.match(await site.html('/careers'), /No openings right now/);
});

test('the demo page explains how to book and lists centre phones', async t => {
  const site = await start();
  t.after(site.close);
  const page = await site.html('/demo');
  assert.match(page, /<h1[^>]*>Find the right/);
  for (const phone of ['+917356072139', '+917356072108', '+917356072098']) assert.match(page, new RegExp(`href="tel:\\${phone}"`), phone);
});

test('Contact lists each shared number once, above the centres that use it, each with directions', async t => {
  const site = await start();
  t.after(site.close);
  const centres = (await site.html('/contact')).split('id="centres-title"')[1].split('</section>')[0];
  const groups = centres.split('class="group"').slice(1);
  assert.equal(groups.length, 3);
  assert.match(groups[0], /tel:\+917356072139[\s\S]*Eraveli[\s\S]*Fort Kochi[\s\S]*Kadavanthra/);
  assert.equal([...centres.matchAll(/href="tel:/g)].length, 3);
  assert.equal([...centres.matchAll(/>Directions</g)].length, 9);
});

test('the blog sends "Talk to our team" to this website, not the old one', async t => {
  const site = await start();
  t.after(site.close);
  const post = await site.html('/blog/how-parents-can-help-in-exam-season');
  assert.match(post, /<a href="\/contact">Talk to our team<\/a>/);
  assert.doesNotMatch(post, /smartupedu\.in\/contact/);
});

test('every page has a Home link apart from the logo, marked current on the homepage', async t => {
  const site = await start();
  t.after(site.close);
  assert.match(await site.html('/'), /<a href="\/" class="home-link" aria-current="page"/);
  assert.match(await site.html('/courses'), /<a href="\/" class="home-link"(?! aria-current)[^>]*>[\s\S]*?Home<\/span>/);
});

test('every menu link resolves to a page', async t => {
  const site = await start();
  t.after(site.close);
  const { navGroups, quickLinks } = await import('../src/lib/nav.ts');
  const links = new Set([...navGroups.flatMap(g => g.links), ...quickLinks].map(l => l.href));
  for (const href of links) await site.html(href);
});

test('the tuition guide reads as headings, lists and bold labels, with no sample label', async t => {
  const site = await start();
  t.after(site.close);
  const post = await site.html('/blog/home-tuition-or-online-tuition');
  assert.match(post, /<h1[^>]*>Choosing what&#39;s right: how to choose between home tuition and online tuition<\/h1>/);
  assert.match(post, /<h2>Which to choose: a 4-step guide to narrow it down<\/h2>/);
  assert.match(post, /<h3>Step 4: Consider going hybrid<\/h3>/);
  assert.match(post, /<li><strong>Screen-free learning:<\/strong>/);
  assert.doesNotMatch(post, /Sample — to be replaced|\*\*/);
});

test('a post shows its reading time, share links and the other posts', async t => {
  const site = await start();
  t.after(site.close);
  const post = await site.html('/blog/board-exam-90-day-plan');
  assert.match(post, /\d+ min read/);
  assert.match(post, /href="https:\/\/wa\.me\/\?text=[^"]*%2Fblog%2Fboard-exam-90-day-plan"/);
  assert.match(post, /href="https:\/\/www\.facebook\.com\/sharer\/sharer\.php\?u=[^"]*%2Fblog%2Fboard-exam-90-day-plan"/);
  const related = post.slice(post.indexOf('Keep reading'));
  assert.match(related, /href="\/blog\/home-tuition-or-online-tuition"/);
  assert.match(related, /href="\/blog\/how-parents-can-help-in-exam-season"/);
  assert.doesNotMatch(related, /href="\/blog\/board-exam-90-day-plan"/);
});

test('the demo page has a booking form that works without JavaScript', async t => {
  const site = await start();
  t.after(site.close);
  const page = await site.html('/demo');
  assert.match(page, /<form method="post" action="\/api\/forms\/demo"/);
  for (const name of ['name', 'phone', 'grade', 'board', 'mode', 'centre', 'preferred_time', 'website']) assert.match(page, new RegExp(`name="${name}"`));
  assert.equal([...page.matchAll(/<option value="(Chullickal|Kadavanthra|Eraveli|Thoppumpady|Palluruthy|Moolamkuzhi|Fort Kochi|Vennala|Edappally)"/g)].length, 9);
  assert.match(page, /We use these details only to reply to you/);
  assert.match(page, /href="\/privacy"/);
});

test('a form that failed without JavaScript explains what to do', async t => {
  const site = await start();
  t.after(site.close);
  assert.match(await site.html('/demo?error=invalid'), /Some details were missing or not valid/);
  assert.match(await site.html('/ask?error=busy'), /Too many attempts right now/);
  assert.doesNotMatch(await site.html('/demo'), /Some details were missing/);
});

test('Careers preselects the role named in the link', async t => {
  const site = await start();
  t.after(site.close);
  assert.match(await site.html('/careers?role=Physics%20teacher'), /<option value="Physics teacher" selected/);
});

test('Ask Smartup has a question form', async t => {
  const site = await start();
  t.after(site.close);
  const page = await site.html('/ask');
  assert.match(page, /<form method="post" action="\/api\/forms\/ask"/);
  assert.match(page, /name="question"/);
});

test('the thanks page confirms each form and stays out of search; an unknown form is not found', async t => {
  const site = await start();
  t.after(site.close);
  const demo = await site.html('/thanks?form=demo');
  assert.match(demo, /Your demo class request is in/);
  assert.match(demo, /<meta name="robots" content="noindex, nofollow">/);
  assert.match(await site.html('/thanks?form=careers'), /Thank you for applying/);
  assert.match(await site.html('/thanks?form=ask'), /Your question is with our team/);
  assert.equal((await fetch(`${site.base}/thanks?form=nope`)).status, 404);
});

test('alumni stories from the admin appear on the Alumni page and the homepage', async t => {
  const site = await start(content => content.db.exec("INSERT INTO alumni(name, batch, now_role, story, achievements, is_sample) VALUES('Anjali R', 'SSLC 2016', 'Software engineer, Bengaluru', 'Joined in Class 8.', 'Full A+', 1)"));
  t.after(site.close);
  const alumni = await site.html('/alumni');
  assert.match(alumni, /Anjali R/);
  assert.match(alumni, /SSLC 2016 · Software engineer, Bengaluru/);
  assert.match(alumni, /Sample — to be replaced/);
  // The homepage shows alumni videos only (Smartup team, 24 Oct 2026).
  assert.doesNotMatch(await site.html('/'), /Anjali R/);
});

test('faculty details and job descriptions show once staff add them', async t => {
  const site = await start(content => {
    content.db.exec("UPDATE faculty SET experience_years = 12, expertise = 'Board exam problem solving' WHERE rowid = (SELECT MIN(rowid) FROM faculty)");
    content.db.exec("UPDATE jobs SET description = 'Teach Physics to Classes 11 and 12.' WHERE rowid = (SELECT MIN(rowid) FROM jobs)");
  });
  t.after(site.close);
  const faculty = await site.html('/faculty');
  assert.match(faculty, /12 years of teaching/);
  assert.match(faculty, /Board exam problem solving/);
  assert.match(await site.html('/careers'), /Teach Physics to Classes 11 and 12\./);
});

test('a written review can be a screenshot, and sample reviews are labelled', async t => {
  const site = await start(content => content.db.exec("INSERT INTO testimonials(kind, section, title, person, quote, image, is_sample, sort) VALUES('written', 'feedback', 'WhatsApp message from a parent', 'Parent', '', '/seed/img/faculty-abdul-ahad-ag', 1, 99)"));
  t.after(site.close);
  const page = await site.html('/testimonials');
  assert.match(page, /srcset="\/seed\/img\/faculty-abdul-ahad-ag-480\.webp/);
  assert.match(page, /Sample — to be replaced/);
});

test('the starter blog posts carry the sample label until approved', async t => {
  const site = await start();
  t.after(site.close);
  assert.match(await site.html('/blog'), /Sample — to be replaced/);
  assert.match(await site.html('/blog/board-exam-90-day-plan'), /Sample — to be replaced/);
});

test('Results headings nest: years are h3 and exam groups are h4, with board filters', async t => {
  const site = await start();
  t.after(site.close);
  const page = await site.html('/results');
  const years = [...page.matchAll(/<h3[^>]*class="year-title"/g)].length;
  assert.ok(years >= 5);
  assert.equal([...page.matchAll(/<h3[\s>]/g)].length, years);
  assert.ok([...page.matchAll(/<h4[^>]*class="exam-title"/g)].length >= 9);
  assert.match(page, /aria-label="Filter by board"/);
  assert.match(page, /data-filter-tags="2026 state"/);
});

test('the privacy page explains form data, cookies and YouTube, and the footer links to it', async t => {
  const site = await start();
  t.after(site.close);
  const page = await site.html('/privacy');
  for (const text of ['When you fill in a form', 'Smartup Quest', 'youtube-nocookie\\.com', 'i\\.ytimg\\.com', 'Continue on WhatsApp', 'does not use advertising or analytics cookies']) assert.match(page, new RegExp(text));
  assert.match(await site.html('/'), /href="\/privacy"/);
});

test('pages without content say so instead of showing empty sections', async t => {
  const site = await start(content => content.db.exec('UPDATE testimonials SET published = 0; UPDATE videos SET published = 0; UPDATE centres SET published = 0;'));
  t.after(site.close);
  assert.match(await site.html('/testimonials'), /Student and parent stories will appear here soon/);
  assert.match(await site.html('/videos'), /New videos are on their way/);
  const contact = await site.html('/contact');
  assert.doesNotMatch(contact, /id="centres-title"/);
  assert.doesNotMatch(contact, /0 centres/);
  assert.doesNotMatch(await site.html('/courses'), /0 centres/);
  assert.doesNotMatch(await site.html('/demo'), /id="near-title"/);
});

test('the Alumni page shows each former student with their batch and where they are now', async t => {
  const site = await start();
  t.after(site.close);
  const page = await site.html('/alumni');
  assert.match(page, /Batch of 2020–\u206021 · Marine engineer/);
  assert.match(page, /Batch of 2018–\u206019 · Freelance safety consultant/);
  assert.match(page, /alt="Mufeedha in a white coat at her medical college"/);
});

test('responsive images carry their width and height so the page does not jump while loading', async t => {
  const site = await start();
  t.after(site.close);
  for (const path of ['/', '/results', '/story', '/life', '/alumni', '/founders', '/faculty']) {
    const images = [...(await site.html(path)).matchAll(/<img\b[^>]*\ssrcset="[^"]*"[^>]*>/g)].map(m => m[0]);
    assert.ok(images.length > 0, path);
    for (const img of images) assert.match(img, /\swidth="\d+"[^>]*\sheight="\d+"|\sheight="\d+"[^>]*\swidth="\d+"/, `${path}: ${img.slice(0, 120)}`);
  }
});

test('time and class ranges are glued so a line never breaks inside them', async t => {
  const site = await start();
  t.after(site.close);
  const glued = '5–⁠9 pm';
  assert.ok((await site.html('/')).includes(`open ${glued}`), 'home courses line');
  assert.ok((await site.html('/contact')).includes(glued), 'contact');
  assert.ok((await site.html('/courses')).includes(glued), 'courses');
  const visibleText = html => html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ');
  for (const path of ['/', '/story', '/founders', '/faculty', '/results', '/life', '/videos', '/testimonials', '/alumni', '/courses', '/blog', '/blog/board-exam-90-day-plan', '/ask', '/app', '/community', '/contact', '/careers', '/demo', '/privacy']) {
    const loose = visibleText(await site.html(path)).match(/.{0,30}\w–\w.{0,20}/);
    assert.equal(loose, null, `${path} has an unglued range: ${loose?.[0]}`);
  }
});

test('a YouTube video with a staff cover shows that cover instead of the YouTube thumbnail', async t => {
  const site = await start(content => content.db.prepare("UPDATE videos SET cover = '/seed/img/alumni-dylan' WHERE category = 'short-lessons'").run());
  t.after(site.close);
  const page = await site.html('/videos');
  assert.match(page, /srcset="\/seed\/img\/alumni-dylan-480\.webp 480w/);
  assert.match(page, /i\.ytimg\.com\/vi\/[\w-]{11}\/hqdefault\.jpg/);
});

test('the home hero shows the photo staff chose, and falls back to the owl without one', async t => {
  const site = await start();
  t.after(site.close);
  assert.match(await site.html('/'), /class="hero[^"]*"[\s\S]*srcset="\/seed\/img\/life-talent-eve-award-480\.webp/);
  const plain = await start(content => content.db.prepare("UPDATE settings SET value = '\"\"' WHERE key = 'heroImage'").run());
  t.after(plain.close);
  const page = await plain.html('/');
  assert.doesNotMatch(page, /life-talent-eve-award/);
  assert.match(page, /hero-owl/);
});

test('asking about a programme on Courses opens the demo form with it chosen', async t => {
  const site = await start();
  t.after(site.close);
  const courses = await site.html('/courses');
  assert.match(courses, /href="\/demo\?programme=Smartup%20Pro"/);
  const demo = await site.html('/demo?programme=Smartup%20Pro');
  assert.match(demo, /<option value="Smartup Pro" selected[^>]*>Smartup Pro<\/option>/);
  assert.match(demo, /<option value="CBSE" selected[^>]*>CBSE<\/option>/);
  assert.doesNotMatch(await site.html('/demo?programme=Nonsense'), /<option value="[^"]+" selected/);
});

test('the footer shows one icon per social network, and Community lists every account', async t => {
  const site = await start();
  t.after(site.close);
  const footer = (await site.html('/')).split('class="site-footer')[1];
  const icons = [...footer.matchAll(/aria-label="Smartup on (\w+)"/g)].map(m => m[1]);
  assert.deepEqual(icons, ['Facebook', 'Instagram', 'YouTube', 'LinkedIn']);
  assert.equal([...(await site.html('/community')).matchAll(/class="channel"/g)].length, 7);
});

test('event videos on Life keep their own names for screen readers', async t => {
  const site = await start();
  t.after(site.close);
  assert.match(await site.html('/life'), /Play “Talent Eve 7\.0” \(YouTube\)/);
});

test('a page header photo, hidden on phones, is not downloaded ahead of everything else', async t => {
  const site = await start();
  t.after(site.close);
  const visual = (await site.html('/life')).split('class="hero-visual')[1].split('</figure>')[0];
  assert.match(visual, /loading="lazy"/);
  assert.doesNotMatch(visual, /fetchpriority/);
});

test('"Ask about" links on the home page also open the demo form with that programme', async t => {
  const site = await start();
  t.after(site.close);
  assert.match(await site.html('/'), /href="\/demo\?programme=Smartup%20Pro"/);
});

test('Shorts show their sharp portrait cover, and a staff cover still wins', async t => {
  const site = await start();
  t.after(site.close);
  const videos = await site.html('/videos');
  const short = videos.split('data-yt="Aypb_y7umfo"')[1].split('</figure>')[0];
  assert.match(short, /srcset="\/seed\/img\/yt-cover-[a-z0-9-]+-480\.webp 480w/);
  assert.doesNotMatch(short, /hqdefault/);
  const custom = await start(content => content.db.prepare("UPDATE videos SET cover = '/seed/img/alumni-dylan' WHERE youtube_id = 'Aypb_y7umfo'").run());
  t.after(custom.close);
  assert.match((await custom.html('/videos')).split('data-yt="Aypb_y7umfo"')[1].split('</figure>')[0], /alumni-dylan-480\.webp/);
});

test('programmes, features and fees on Courses and the home page come from the admin', async t => {
  const site = await start(content => {
    content.db.prepare("UPDATE programmes SET fee = 'From ₹3,000 a month' WHERE name = 'Smartup Pro'").run();
    const trio = content.db.prepare("SELECT features FROM programmes WHERE name = 'Smartup Trio'").get();
    content.db.prepare("UPDATE programmes SET features = ? WHERE name = 'Smartup Trio'").run(JSON.stringify([...JSON.parse(trio.features), 'Weekend doubt sessions']));
  });
  t.after(site.close);
  const courses = await site.html('/courses');
  assert.match(courses, /From ₹3,000 a month/);
  assert.match(courses, /Weekend doubt sessions/);
  assert.match(await site.html('/'), /From ₹3,000 a month/);
});

test('a hidden programme leaves Courses, the home tabs and the demo form', async t => {
  const site = await start(content => content.db.prepare("UPDATE programmes SET published = 0 WHERE name = 'Smartup Power'").run());
  t.after(site.close);
  for (const path of ['/courses', '/', '/demo']) assert.doesNotMatch(await site.html(path), /Smartup Power/, path);
});

test('class timings, parent updates and State Board details come from Settings', async t => {
  const site = await start(content => {
    const details = JSON.parse(content.db.prepare("SELECT value FROM settings WHERE key = 'courseDetails'").get().value);
    details.classLengths[0].level = 'Class 8 (edited)';
    details.stateExamPrep = ['Edited revision plan'];
    content.db.prepare("UPDATE settings SET value = ? WHERE key = 'courseDetails'").run(JSON.stringify(details));
  });
  t.after(site.close);
  const page = await site.html('/courses');
  assert.match(page, /Class 8 \(edited\)/);
  assert.match(page, /Edited revision plan/);
});

test('Contact shows centre addresses and what each office number is for', async t => {
  const site = await start(content => {
    content.db.prepare("UPDATE centres SET address = 'Near St. Mary''s Church, Chullickal' WHERE name = 'Chullickal'").run();
    content.db.prepare("UPDATE settings SET value = ? WHERE key = 'contactPhones'").run(JSON.stringify([{ label: 'Admissions', phone: '+917356072079' }]));
  });
  t.after(site.close);
  const page = await site.html('/contact');
  assert.match(page, /Near St\. Mary(&#39;|')s Church, Chullickal/);
  assert.match(page, /Admissions/);
});

test('the class range drives the demo form choices and the footer line', async t => {
  const site = await start();
  t.after(site.close);
  const demo = await site.html('/demo');
  assert.doesNotMatch(demo, />Class 5</);
  assert.match(demo, />Plus Two \(Class 12\)</);
  assert.match(demo, /Tuitions for classes 8 to \+2/);
  const younger = await start(content => content.db.prepare("UPDATE settings SET value = ? WHERE key = 'classRange'").run(JSON.stringify({ from: 5, to: 10 })));
  t.after(younger.close);
  const page = await younger.html('/demo');
  assert.match(page, />Class 5</);
  assert.doesNotMatch(page, /Plus One/);
  assert.match(page, /Tuitions for classes 5 to 10/);
});

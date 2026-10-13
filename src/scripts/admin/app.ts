import { api, ApiError } from './api';
import { h, toast } from './dom';
import type { Schema } from './fields';
import { contentView } from './content-view';
import { settingsView } from './settings-view';
import { inboxView } from './inbox-view';
import { mediaView } from './media-view';

const DEFAULT = '#/inbox/demo';
const login = document.getElementById('login') as HTMLElement;
const loginForm = document.getElementById('login-form') as HTMLFormElement;
const password = document.getElementById('password') as HTMLInputElement;
const loginError = document.getElementById('login-error') as HTMLElement;
const workspace = document.getElementById('workspace') as HTMLElement;
const nav = document.getElementById('admin-nav') as HTMLElement;
const main = document.getElementById('admin-main') as HTMLElement;
const logout = document.getElementById('logout') as HTMLButtonElement;
let schema: Schema | null = null;

function showLogin() {
  workspace.hidden = true;
  logout.hidden = true;
  login.hidden = false;
  password.focus();
}

async function showWorkspace() {
  schema = await api<Schema>('schema');
  login.hidden = true;
  workspace.hidden = false;
  logout.hidden = false;
  await route();
}

async function renderNav() {
  if (!schema) return;
  const counts = await api<{ counts: Record<string, number> }>('inbox').then(r => r.counts, () => ({} as Record<string, number>));
  const current = location.hash || DEFAULT;
  const groups = [
    { title: 'Inbox', links: Object.entries(schema.inboxes).map(([key, inbox]) => ({ href: `#/inbox/${key}`, label: inbox.label, count: counts[key] ?? 0 })) },
    { title: 'Website content', links: Object.entries(schema.sections).map(([key, section]) => ({ href: `#/content/${key}`, label: section.label, count: 0 })) },
    { title: 'Site', links: [{ href: '#/settings', label: 'Settings', count: 0 }, { href: '#/media', label: 'Media library', count: 0 }] },
  ];
  nav.replaceChildren(h('details', { class: 'nav-menu', open: window.matchMedia('(min-width: 900px)').matches },
    h('summary', {}, 'Menu'),
    ...groups.map(group => h('section', {}, h('h2', {}, group.title), h('ul', {}, ...group.links.map(link =>
      h('li', {}, h('a', { href: link.href, 'aria-current': link.href === current ? 'page' : null }, link.label,
        link.count ? h('span', { class: 'count', 'aria-label': `${link.count} new` }, String(link.count)) : null))))))));
}

async function route() {
  if (!schema) return;
  const [area, key] = location.hash.replace(/^#\/?/, '').split('/');
  try {
    if (area === 'inbox' && Object.hasOwn(schema.inboxes, key)) await inboxView(main, key, schema, () => { void renderNav(); });
    else if (area === 'content' && Object.hasOwn(schema.sections, key)) await contentView(main, key, schema);
    else if (area === 'settings') await settingsView(main, schema);
    else if (area === 'media') await mediaView(main);
    else { location.replace(DEFAULT); return; }
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return;
    main.replaceChildren(h('p', { class: 'error' }, error instanceof Error ? error.message : 'Something went wrong.'));
  }
  await renderNav();
  main.focus();
}

loginForm.addEventListener('submit', async event => {
  event.preventDefault();
  loginError.textContent = '';
  try {
    await api('login', { method: 'POST', body: { password: password.value } });
    password.value = '';
    // If the session ended mid-edit, bring back the open screen so nothing typed is lost.
    if (schema) {
      login.hidden = true;
      workspace.hidden = false;
      logout.hidden = false;
      toast('Signed in again. Press Save to finish.');
    } else await showWorkspace();
  } catch (error) {
    loginError.textContent = error instanceof Error ? error.message : 'Sign-in failed.';
  }
});
logout.addEventListener('click', async () => {
  await api('logout', { method: 'POST' }).catch(() => {});
  schema = null;
  main.replaceChildren();
  showLogin();
});
window.addEventListener('admin:signed-out', showLogin);
window.addEventListener('hashchange', () => { void route(); });

api('session').then(showWorkspace, error => {
  if (error instanceof ApiError && error.status === 401) showLogin();
  else loginError.textContent = 'The admin panel could not load. Refresh the page.';
});

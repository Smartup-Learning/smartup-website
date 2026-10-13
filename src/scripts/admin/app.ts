import { api, ApiError } from './api';
import { h } from './dom';
import type { Schema } from './fields';
import { contentView } from './content-view';
import { settingsView } from './settings-view';

const DEFAULT = '#/content/timeline';
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
  schema = null;
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

function renderNav() {
  if (!schema) return;
  const current = location.hash || DEFAULT;
  const groups = [
    { title: 'Website content', links: Object.entries(schema.sections).map(([key, section]) => ({ href: `#/content/${key}`, label: section.label })) },
    { title: 'Site', links: [{ href: '#/settings', label: 'Settings' }] },
  ];
  nav.replaceChildren(h('details', { class: 'nav-menu', open: window.matchMedia('(min-width: 900px)').matches },
    h('summary', {}, 'Menu'),
    ...groups.map(group => h('section', {}, h('h2', {}, group.title), h('ul', {}, ...group.links.map(link =>
      h('li', {}, h('a', { href: link.href, 'aria-current': link.href === current ? 'page' : null }, link.label))))))));
}

async function route() {
  if (!schema) return;
  const [area, key] = location.hash.replace(/^#\/?/, '').split('/');
  try {
    if (area === 'content' && Object.hasOwn(schema.sections, key)) await contentView(main, key, schema);
    else if (area === 'settings') await settingsView(main, schema);
    else { location.replace(DEFAULT); return; }
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return;
    main.replaceChildren(h('p', { class: 'error' }, error instanceof Error ? error.message : 'Something went wrong.'));
  }
  renderNav();
  main.focus();
}

loginForm.addEventListener('submit', async event => {
  event.preventDefault();
  loginError.textContent = '';
  try {
    await api('login', { method: 'POST', body: { password: password.value } });
    password.value = '';
    await showWorkspace();
  } catch (error) {
    loginError.textContent = error instanceof Error ? error.message : 'Sign-in failed.';
  }
});
logout.addEventListener('click', async () => {
  await api('logout', { method: 'POST' }).catch(() => {});
  showLogin();
});
window.addEventListener('admin:signed-out', showLogin);
window.addEventListener('hashchange', () => { void route(); });

api('session').then(showWorkspace, error => {
  if (error instanceof ApiError && error.status === 401) showLogin();
  else loginError.textContent = 'The admin panel could not load. Refresh the page.';
});

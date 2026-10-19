import { api, ApiError } from './api';
import { h, toast } from './dom';
import { renderField, type Control, type Field, type Schema } from './fields';

/** Settings screens: each shows the settings fields tagged with its `page` (none for the main Settings screen). */
const SETTINGS_PAGES = {
  settings: { page: undefined, title: 'Settings', hint: 'Phone numbers, links and page text used across the website.', save: 'Save settings', saved: 'Settings saved. The website shows the change now.' },
  hero: { page: 'hero', title: 'Homepage hero', hint: 'The headline, line and photo at the top of the homepage.', save: 'Save hero', saved: 'Hero saved. The homepage shows the change now.' },
};

export async function settingsView(main: HTMLElement, schema: Schema, screen: keyof typeof SETTINGS_PAGES = 'settings') {
  const copy = SETTINGS_PAGES[screen];
  const { settings } = await api<{ settings: Record<string, unknown> }>('settings');
  const fields = schema.settings.filter(field => field.page === copy.page);
  const controls: [Field, Control][] = fields.map(field => [field, renderField(field, settings[field.name])]);
  const status = h('p', { class: 'status', role: 'alert' });
  const save = async (event: Event) => {
    event.preventDefault();
    status.textContent = '';
    controls.forEach(([, control]) => control.showError());
    try {
      await api('settings', { method: 'PUT', body: Object.fromEntries(controls.map(([field, control]) => [field.name, control.read()])) });
      toast(copy.saved);
    } catch (failure) {
      if (!(failure instanceof ApiError)) throw failure;
      status.textContent = failure.message;
      const failed = controls.filter(([field]) => failure.fields[field.name]);
      failed.forEach(([field, control]) => control.showError(failure.fields[field.name]));
      failed[0]?.[1].focus();
    }
  };
  main.replaceChildren(h('form', { class: 'editor', novalidate: true, onsubmit: save },
    h('div', { class: 'view-head' }, h('h1', {}, copy.title)),
    h('p', { class: 'hint' }, copy.hint),
    ...controls.map(([, control]) => control.element),
    status,
    h('div', { class: 'actions' }, h('button', { type: 'submit', class: 'primary' }, copy.save))));
}

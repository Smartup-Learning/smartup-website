import { api, ApiError } from './api';
import { h, toast } from './dom';
import { renderField, type Control, type Field, type Schema } from './fields';

export async function settingsView(main: HTMLElement, schema: Schema) {
  const { settings } = await api<{ settings: Record<string, unknown> }>('settings');
  const controls: [Field, Control][] = schema.settings.map(field => [field, renderField(field, settings[field.name])]);
  const status = h('p', { class: 'status', role: 'alert' });
  const save = async (event: Event) => {
    event.preventDefault();
    status.textContent = '';
    controls.forEach(([, control]) => control.showError());
    try {
      await api('settings', { method: 'PUT', body: Object.fromEntries(controls.map(([field, control]) => [field.name, control.read()])) });
      toast('Settings saved. The website shows the change now.');
    } catch (failure) {
      if (!(failure instanceof ApiError)) throw failure;
      status.textContent = failure.message;
      const failed = controls.filter(([field]) => failure.fields[field.name]);
      failed.forEach(([field, control]) => control.showError(failure.fields[field.name]));
      failed[0]?.[1].focus();
    }
  };
  main.replaceChildren(h('form', { class: 'editor', novalidate: true, onsubmit: save },
    h('div', { class: 'view-head' }, h('h1', {}, 'Settings')),
    h('p', { class: 'hint' }, 'Phone numbers, links and homepage text used across the website.'),
    ...controls.map(([, control]) => control.element),
    status,
    h('div', { class: 'actions' }, h('button', { type: 'submit', class: 'primary' }, 'Save settings'))));
}

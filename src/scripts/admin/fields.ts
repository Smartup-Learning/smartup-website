import { h } from './dom';
import { renderMarkdown } from '../../lib/markdown.mjs';
import { uploadMedia, pickMedia } from './media';

export type Option = { value: string; label: string };
export type Field = {
  name: string; label: string; type: string; required?: boolean; max?: number; min?: number; options?: Option[];
  hint?: string; default?: unknown; fields?: Field[]; item?: Field[]; of?: string; prefix?: string; nullable?: boolean; page?: string;
};
export type Section = { label: string; title: string; subtitle: string; sortable: boolean; fields: Field[] };
export type Schema = { sections: Record<string, Section>; settings: Field[]; inboxes: Record<string, { label: string; fields: { name: string; label: string }[] }> };
export type Control = { element: HTMLElement; read(): unknown; showError(message?: string): void; focus(): void };
type Group = Control & { legend: HTMLLegendElement };

let counter = 0;
const nextId = () => `field-${++counter}`;
const INPUT_TYPES: Record<string, string> = { url: 'url', email: 'email', phone: 'tel', date: 'date', int: 'number' };

/** Draws the control for one schema field and reads its value back in the shape the API expects. */
export function renderField(field: Field, value: unknown): Control {
  if (field.type === 'group') return groupField(field, value);
  if (field.type === 'list') return listField(field, value);
  const id = nextId();
  const error = h('p', { class: 'error', id: `${id}-error`, hidden: true });
  const hint = field.hint ? h('p', { class: 'hint', id: `${id}-hint` }, field.hint) : null;
  const describedBy = `${hint ? `${id}-hint ` : ''}${id}-error`;
  const showError = (message?: string) => { error.textContent = message ?? ''; error.hidden = !message; };
  const label = h('label', { for: id }, field.label, field.required || field.type === 'checkbox' ? null : h('span', { class: 'optional' }, ' (optional)'));

  if (field.type === 'checkbox') {
    const input = h('input', { type: 'checkbox', id, checked: Boolean(value ?? field.default), 'aria-describedby': describedBy });
    return { element: h('div', { class: 'field field-checkbox' }, input, label, hint, error), read: () => input.checked, showError, focus: () => input.focus() };
  }
  if (field.type === 'image') return imageField(id, label, hint, error, showError, String(value ?? ''));

  const text = value === null || value === undefined
    ? (typeof field.default === 'string' ? field.default : '')
    : Array.isArray(value) ? value.join('\n') : String(value);
  let control: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
  let preview: HTMLElement | null = null;
  if (field.type === 'select') {
    control = h('select', { id, 'aria-describedby': describedBy },
      !field.required || !text ? h('option', { value: '' }, field.required ? 'Choose…' : '—') : null,
      ...(field.options ?? []).map(o => h('option', { value: o.value, selected: o.value === text }, o.label)));
  } else if (field.type === 'textarea' || field.type === 'markdown' || field.type === 'lines') {
    control = h('textarea', { id, rows: field.type === 'markdown' ? 18 : 5, maxlength: field.type === 'lines' ? null : field.max, 'aria-describedby': describedBy }, text);
    if (field.type === 'markdown') {
      const output = h('div', { class: 'preview', 'aria-live': 'polite' });
      // renderMarkdown escapes the source before adding its own tags, so its output is safe to insert.
      const update = () => { output.innerHTML = renderMarkdown(control.value); };
      control.addEventListener('input', update);
      update();
      preview = h('div', { class: 'markdown' }, h('p', { class: 'hint' }, 'Preview'), output);
    }
  } else {
    control = h('input', {
      id, type: INPUT_TYPES[field.type] ?? 'text', value: text, 'aria-describedby': describedBy,
      maxlength: field.type === 'int' ? null : field.max,
      min: field.type === 'int' ? field.min : null,
      max: field.type === 'int' ? field.max : null,
      readonly: field.type === 'path',
    });
  }
  const read = () => (field.type === 'lines' ? control.value.split('\n').map(line => line.trim()).filter(Boolean) : control.value);
  return { element: h('div', { class: `field field-${field.type}` }, label, hint, control, preview, error), read, showError, focus: () => control.focus() };
}

function groupField(field: Field, value: unknown): Group {
  const current = (value && typeof value === 'object' && !Array.isArray(value) ? value : {}) as Record<string, unknown>;
  const controls = (field.fields ?? []).map(sub => [sub, renderField(sub, current[sub.name])] as const);
  const error = h('p', { class: 'error', hidden: true });
  const legend = h('legend', {}, field.label);
  return {
    element: h('fieldset', { class: 'field' }, legend, field.hint ? h('p', { class: 'hint' }, field.hint) : null, ...controls.map(([, c]) => c.element), error),
    read: () => Object.fromEntries(controls.map(([sub, c]) => [sub.name, c.read()])),
    showError: message => { error.textContent = message ?? ''; error.hidden = !message; },
    focus: () => controls[0]?.[1].focus(),
    legend,
  };
}

function listField(field: Field, value: unknown): Control {
  type Entry = { group: Group; element: HTMLElement; up: HTMLButtonElement; down: HTMLButtonElement };
  const error = h('p', { class: 'error', hidden: true });
  const container = h('div', { class: 'list' });
  const addButton = h('button', { type: 'button' }, '+ Add');
  let entries: Entry[] = [];
  // Entries keep their DOM nodes when moved, so nothing typed is lost.
  const draw = () => {
    entries.forEach((entry, index) => {
      entry.group.legend.textContent = `${field.label}: ${index + 1}`;
      entry.up.disabled = index === 0;
      entry.down.disabled = index === entries.length - 1;
    });
    container.replaceChildren(...entries.map(entry => entry.element));
    addButton.disabled = entries.length >= (field.max ?? 20);
  };
  const move = (entry: Entry, delta: number) => {
    const from = entries.indexOf(entry);
    const to = from + delta;
    if (to < 0 || to >= entries.length) return;
    [entries[from], entries[to]] = [entries[to], entries[from]];
    draw();
  };
  const add = (data: unknown) => {
    const group = groupField({ name: field.name, label: field.label, type: 'group', fields: field.item }, data);
    const up = h('button', { type: 'button', 'aria-label': 'Move up' }, '↑');
    const down = h('button', { type: 'button', 'aria-label': 'Move down' }, '↓');
    const remove = h('button', { type: 'button', class: 'link' }, 'Remove');
    const entry: Entry = { group, up, down, element: h('div', { class: 'list-item' }, group.element, h('div', { class: 'actions' }, up, down, remove)) };
    up.addEventListener('click', () => move(entry, -1));
    down.addEventListener('click', () => move(entry, 1));
    remove.addEventListener('click', () => { entries = entries.filter(other => other !== entry); draw(); });
    entries.push(entry);
    return entry;
  };
  (Array.isArray(value) ? value : []).forEach(add);
  addButton.addEventListener('click', () => { const entry = add({}); draw(); entry.group.focus(); });
  draw();
  return {
    element: h('fieldset', { class: 'field' }, h('legend', {}, field.label), field.hint ? h('p', { class: 'hint' }, field.hint) : null, container, addButton, error),
    read: () => entries.map(entry => entry.group.read()),
    showError: message => { error.textContent = message ?? ''; error.hidden = !message; },
    focus: () => (entries[0] ? entries[0].group.focus() : addButton.focus()),
  };
}

function imageField(id: string, label: HTMLElement, hint: HTMLElement | null, error: HTMLElement, showError: (message?: string) => void, value: string): Control {
  let current = value;
  const thumb = h('img', { class: 'thumb', alt: '' });
  const path = h('code', {});
  const file = h('input', { type: 'file', id, accept: 'image/jpeg,image/png,image/webp' });
  const alt = h('input', { type: 'text', maxlength: 200, 'aria-label': 'Describe the new photo', placeholder: 'Describe the new photo' });
  const upload = h('button', { type: 'button' }, 'Upload');
  const choose = h('button', { type: 'button' }, 'Choose from library');
  const clear = h('button', { type: 'button', class: 'link' }, 'Remove image');
  const draw = () => {
    thumb.hidden = !current;
    if (current) thumb.src = `${current}-480.webp`;
    path.textContent = current || 'No image chosen';
    clear.hidden = !current;
  };
  upload.addEventListener('click', async () => {
    const chosen = file.files?.[0];
    if (!chosen) return showError('Choose a photo file first.');
    if (!alt.value.trim()) return showError('Describe the new photo before uploading.');
    upload.disabled = true;
    try {
      current = (await uploadMedia(chosen, alt.value)).base;
      file.value = '';
      alt.value = '';
      showError();
      draw();
    } catch (failure) {
      showError(failure instanceof Error ? failure.message : 'The upload failed.');
    } finally {
      upload.disabled = false;
    }
  });
  choose.addEventListener('click', async () => {
    const base = await pickMedia();
    if (base) { current = base; draw(); }
  });
  clear.addEventListener('click', () => { current = ''; draw(); });
  draw();
  return {
    element: h('div', { class: 'field field-image' }, label, hint, h('div', { class: 'image-field' }, thumb, path, h('div', { class: 'row' }, file, alt, upload), h('div', { class: 'row' }, choose, clear)), error),
    read: () => current,
    showError,
    focus: () => file.focus(),
  };
}

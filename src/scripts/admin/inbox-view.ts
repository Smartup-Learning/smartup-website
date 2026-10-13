import { api, ApiError } from './api';
import { h, toast, formatPhone } from './dom';
import type { Schema } from './fields';

type Entry = { id: number; created_at: string; status: string; notes: string; faq_id?: number | null; [field: string]: unknown };
const STATUSES: [string, string][] = [['new', 'New'], ['contacted', 'Contacted'], ['closed', 'Closed']];
const statusLabel = (value: string) => STATUSES.find(([v]) => v === value)?.[1] ?? value;
const labelled = (id: string, label: string, control: HTMLElement) => h('div', { class: 'field' }, h('label', { for: id }, label), control);

// Visitor text is only ever added as text nodes (see h()); links are built only from checked formats.
function valueView(name: string, value: unknown): Node | string {
  const text = String(value ?? '');
  if (!text) return '—';
  if (name === 'phone') return h('a', { href: `tel:${text}` }, formatPhone(text));
  if (name === 'email') return h('a', { href: `mailto:${text}` }, text);
  if (name === 'cv_url' && /^https?:\/\//i.test(text)) return h('a', { href: text, target: '_blank', rel: 'noopener noreferrer' }, text);
  return text;
}

/** One inbox, newest first: filter by status, add notes, delete, export, and publish answers to the FAQ. */
export async function inboxView(main: HTMLElement, kind: string, schema: Schema, onChange: () => void) {
  const inbox = schema.inboxes[kind];
  let entries = (await api<{ items: Entry[] }>(`inbox/${kind}`)).items;
  const topics = kind === 'ask' ? [...new Set((await api<{ items: { category: string }[] }>('content/faqs')).items.map(f => f.category))] : [];
  let filter = 'all';

  const publishForm = (entry: Entry) => {
    if (entry.faq_id) return h('p', { class: 'hint' }, 'Published to the FAQ. Edit it under FAQ.');
    const question = h('textarea', { id: `faq-q-${entry.id}`, rows: 2, maxlength: 200 }, String(entry.question ?? ''));
    const answer = h('textarea', { id: `faq-a-${entry.id}`, rows: 4, maxlength: 2000 }, String(entry.answer ?? ''));
    const topic = h('input', { id: `faq-t-${entry.id}`, list: 'faq-topics', maxlength: 60 });
    const error = h('p', { class: 'error', role: 'alert' });
    const button = h('button', { type: 'button' }, 'Publish to FAQ');
    const publish = async () => {
      error.textContent = '';
      // A second click while the first is still sending would publish the question twice.
      button.disabled = true;
      try {
        await api(`inbox/ask/${entry.id}/publish`, { method: 'POST', body: { category: topic.value, question: question.value, answer: answer.value } });
        entry.status = 'closed';
        entry.faq_id = 1;
        toast('Published to the FAQ.');
        onChange();
        draw();
      } catch (failure) {
        if (!(failure instanceof ApiError)) throw failure;
        error.textContent = Object.values(failure.fields)[0] ?? failure.message;
      } finally {
        button.disabled = false;
      }
    };
    button.addEventListener('click', publish);
    return h('fieldset', {}, h('legend', {}, 'Answer and publish to the FAQ'),
      labelled(question.id, 'FAQ question', question), labelled(answer.id, 'Answer', answer), labelled(topic.id, 'FAQ topic', topic), error,
      h('div', { class: 'actions' }, button));
  };

  const entryView = (entry: Entry) => {
    const status = h('select', { id: `status-${kind}-${entry.id}` }, ...STATUSES.map(([value, label]) => h('option', { value, selected: entry.status === value }, label)));
    const notes = h('textarea', { id: `notes-${kind}-${entry.id}`, rows: 3, maxlength: 2000 }, entry.notes);
    const badge = h('span', { class: `badge ${entry.status}` }, statusLabel(entry.status));
    const save = async () => {
      try {
        await api(`inbox/${kind}/${entry.id}`, { method: 'PUT', body: { status: status.value, notes: notes.value } });
      } catch (failure) {
        if (failure instanceof ApiError) return toast(failure.message);
        throw failure;
      }
      entry.status = status.value;
      entry.notes = notes.value;
      badge.textContent = statusLabel(entry.status);
      badge.className = `badge ${entry.status}`;
      toast('Saved.');
      onChange();
    };
    const remove = async () => {
      if (!confirm('Delete this entry for good? Do this when the person asks, or once it is no longer needed.')) return;
      await api(`inbox/${kind}/${entry.id}`, { method: 'DELETE' });
      entries = entries.filter(other => other !== entry);
      toast('Deleted.');
      onChange();
      draw();
    };
    const received = new Date(entry.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
    return h('details', { class: 'entry' },
      h('summary', {}, h('strong', {}, String(entry.name ?? '')), h('span', { class: 'sub' }, formatPhone(String(entry.phone ?? ''))), h('span', { class: 'sub' }, received), badge),
      h('div', { class: 'entry-body' },
        h('dl', {}, ...inbox.fields.filter(f => f.name !== 'answer').flatMap(f => [h('dt', {}, f.label), h('dd', {}, valueView(f.name, entry[f.name]))])),
        labelled(status.id, 'Status', status),
        labelled(notes.id, 'Notes', notes),
        h('div', { class: 'actions' }, h('button', { type: 'button', class: 'primary', onclick: save }, 'Save'), h('button', { type: 'button', class: 'danger', onclick: remove }, 'Delete')),
        kind === 'ask' ? publishForm(entry) : null));
  };

  const draw = () => {
    const shown = entries.filter(entry => filter === 'all' || entry.status === filter);
    const count = (value: string) => (value === 'all' ? entries.length : entries.filter(e => e.status === value).length);
    main.replaceChildren(
      h('div', { class: 'view-head' }, h('h1', {}, inbox.label), h('a', { class: 'button', href: `/api/admin/inbox/${kind}/export`, download: '' }, 'Download CSV')),
      h('div', { class: 'filters', role: 'group', 'aria-label': 'Show entries' }, ...([['all', 'All'], ...STATUSES] as [string, string][]).map(([value, label]) =>
        h('button', { type: 'button', 'aria-pressed': String(filter === value), onclick: () => { filter = value; draw(); } }, `${label} (${count(value)})`))),
      shown.length ? h('div', { class: 'entries' }, ...shown.map(entryView)) : h('p', {}, 'Nothing here.'),
      // replaceChildren would print a null as the text "null", so the topic list is always an element.
      h('datalist', { id: 'faq-topics' }, ...topics.map(topic => h('option', { value: topic }))));
  };
  draw();
}

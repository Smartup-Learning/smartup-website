type Values = Record<string, string>;

/** Sends enquiry forms with fetch so visitors stay on the page; without JS they post normally. */
export function initForms() {
  document.querySelectorAll<HTMLFormElement>('form[data-smartup-form]').forEach(form => {
    form.noValidate = true;
    const banner = form.querySelector<HTMLElement>('[data-form-error]');
    const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(form)) as Values;
      clearErrors(form, banner);
      if (button) button.disabled = true;
      try {
        const response = await fetch(form.action, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
        const result = await response.json().catch(() => ({}));
        if (response.ok) showDone(form, values);
        else if (response.status === 400 && result.fields) showErrors(form, result.fields);
        else showBanner(banner, result.error ?? 'Something went wrong. Please try again, or call us.');
      } catch {
        showBanner(banner, 'You seem to be offline. Please try again, or call us.');
      } finally {
        if (button) button.disabled = false;
      }
    });
  });
}

function clearErrors(form: HTMLFormElement, banner: HTMLElement | null) {
  form.querySelectorAll<HTMLElement>('[data-error-for]').forEach(el => { el.textContent = ''; el.hidden = true; });
  form.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
  if (banner) banner.hidden = true;
}

function showBanner(banner: HTMLElement | null, message: string) {
  if (!banner) return;
  banner.textContent = message;
  banner.hidden = false;
}

function showErrors(form: HTMLFormElement, fields: Values) {
  let first: HTMLElement | null = null;
  for (const [name, message] of Object.entries(fields)) {
    const slot = form.querySelector<HTMLElement>(`[data-error-for="${CSS.escape(name)}"]`);
    const control = form.querySelector<HTMLElement>(`[name="${CSS.escape(name)}"]`);
    if (slot) { slot.textContent = message; slot.hidden = false; }
    if (control) { control.setAttribute('aria-invalid', 'true'); first ??= control; }
  }
  first?.focus();
}

function showDone(form: HTMLFormElement, values: Values) {
  const done = form.closest('[data-form-wrap]')?.querySelector<HTMLElement>('[data-form-done]');
  const link = done?.querySelector<HTMLAnchorElement>('[data-wa-link]');
  if (link && form.dataset.wa) {
    const text = (form.dataset.waText ?? '').replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? '');
    link.href = `https://wa.me/${form.dataset.wa}?text=${encodeURIComponent(text)}`;
  }
  form.hidden = true;
  if (done) { done.hidden = false; done.focus(); }
}

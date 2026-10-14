type Values = Record<string, string>;
type Control = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

const controls = (form: HTMLFormElement) => Array.from(form.querySelectorAll<Control>('.fields input, .fields select, .fields textarea')).filter(c => c.name);

/** The message for a field's current value, or '' when it is fine. Mirrors the server's own checks. */
function problemWith(form: HTMLFormElement, control: Control) {
  const value = control.value.trim();
  const [otherName, otherValue] = (control.dataset.requiredIf ?? '').split('=');
  const other = otherName ? form.querySelector<Control>(`[name="${CSS.escape(otherName)}"]`) : null;
  const required = control.required || (other !== null && other.value === otherValue);
  if (!value) return required ? control.dataset.requiredMessage ?? (control instanceof HTMLSelectElement ? 'Choose one of the options.' : 'Fill in this detail.') : '';
  if (control.type === 'tel') {
    const digits = value.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
    if (!/^[6-9]\d{9}$/.test(digits)) return 'Enter a 10-digit Indian mobile number.';
  }
  if (control.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Enter a valid email address.';
  const min = Number(control.dataset.minlength);
  if (min && value.length < min) return `Write at least ${min} characters.`;
  return '';
}

function setFieldError(form: HTMLFormElement, control: Control, message: string) {
  const slot = form.querySelector<HTMLElement>(`[data-error-for="${CSS.escape(control.name)}"]`);
  if (slot) { slot.textContent = message; slot.hidden = !message; }
  if (message) control.setAttribute('aria-invalid', 'true'); else control.removeAttribute('aria-invalid');
}

/** Sends enquiry forms with fetch so visitors stay on the page; without JS they post normally. */
export function initForms() {
  document.querySelectorAll<HTMLFormElement>('form[data-smartup-form]').forEach(form => {
    form.noValidate = true;
    const banner = form.querySelector<HTMLElement>('[data-form-error]');
    const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
    // A field is checked as the visitor leaves it once it holds something or already shows a problem.
    form.addEventListener('focusout', event => {
      const control = event.target as Control;
      if (!control.name || !(control.value || control.getAttribute('aria-invalid'))) return;
      const message = problemWith(form, control);
      setFieldError(form, control, message);
    });
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(form)) as Values;
      clearErrors(form, banner);
      // Everything the browser can check is checked before sending, and listed together.
      const problems = controls(form).map(control => [control, problemWith(form, control)] as const).filter(([, message]) => message);
      if (problems.length > 0) {
        problems.forEach(([control, message]) => setFieldError(form, control, message));
        const names = problems.map(([control]) => control.dataset.label ?? control.name);
        showBanner(banner, problems.length === 1 ? `Please check one detail: ${names[0]}.` : `Please check ${problems.length} details: ${names.join(', ')}.`);
        problems[0][0].focus();
        return;
      }
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

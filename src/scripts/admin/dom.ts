type Child = Node | string | number | null | undefined | false;

/** Builds an element. Strings become text nodes, so visitor text can never become markup. */
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, unknown> = {}, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) continue;
    if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2), value as EventListener);
    else if (key === 'class') el.className = String(value);
    else el.setAttribute(key, value === true ? '' : String(value));
  }
  for (const child of children) if (child !== null && child !== undefined && child !== false) el.append(typeof child === 'number' ? String(child) : child);
  return el;
}

/** A short message at the bottom of the screen, read out by screen readers. */
export function toast(message: string) {
  const el = document.getElementById('admin-toast');
  if (!el) return;
  el.textContent = message;
  window.clearTimeout(Number(el.dataset.timer));
  el.dataset.timer = String(window.setTimeout(() => { el.textContent = ''; }, 4000));
}

/** +919895085731 → +91 98950 85731, as on the public site. */
export const formatPhone = (e164: string) => (/^\+91\d{10}$/.test(e164) ? `+91 ${e164.slice(3, 8)} ${e164.slice(8)}` : e164);

/** True while the admin is showing this screen, e.g. isShowing('content', 'faqs'). A save can finish after staff
 * have moved on; views only redraw while they are still on screen. */
export const isShowing = (...route: string[]) => location.hash.replace(/^#\/?/, '').split('/').slice(0, route.length).join('/') === route.join('/');

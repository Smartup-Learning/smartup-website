export class ApiError extends Error {
  status: number;
  fields: Record<string, string>;
  constructor(status: number, message: string, fields: Record<string, string> = {}) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

type Options = { method?: string; body?: unknown; raw?: Blob };

/** Calls the staff API. A 401 on anything but sign-in means the session has ended. */
export async function api<T = Record<string, any>>(path: string, { method = 'GET', body, raw }: Options = {}): Promise<T> {
  const headers: Record<string, string> = { 'X-Smartup-Request': '1' };
  let payload: BodyInit | undefined;
  if (raw) { payload = raw; headers['Content-Type'] = raw.type; }
  else if (method !== 'GET') { payload = JSON.stringify(body ?? {}); headers['Content-Type'] = 'application/json'; }
  const response = await fetch(`/api/admin/${path}`, { method, headers, body: payload, credentials: 'same-origin' });
  const data = await response.json().catch(() => ({}));
  if (response.status === 401 && path !== 'login') window.dispatchEvent(new CustomEvent('admin:signed-out'));
  if (!response.ok) throw new ApiError(response.status, data.error ?? 'Something went wrong. Please try again.', data.fields);
  return data as T;
}

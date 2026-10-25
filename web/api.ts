let csrf = '';
export class ApiError extends Error {
  status: number;
  kind: 'request' | 'offline' | 'unauthenticated' | 'expired' | 'invalid-link';
  constructor(message: string, status: number, kind: ApiError['kind'] = 'request') { super(message); this.name = 'ApiError'; this.status = status; this.kind = kind; }
}
export async function initializeSession(launchLink?: string): Promise<void> {
  let token = new URLSearchParams(location.hash.slice(1)).get('token');
  if (launchLink !== undefined) {
    let url: URL;
    try { url = new URL(launchLink.trim()); } catch { throw new ApiError('Invalid launch link', 400, 'invalid-link'); }
    token = new URLSearchParams(url.hash.slice(1)).get('token');
    if (url.origin !== location.origin || !token || !/^[a-f0-9]{64}$/i.test(token)) throw new ApiError('Use the full launch link for this local service', 400, 'invalid-link');
  }
  let response: Response;
  try { response = token
    ? await fetch('/api/v1/session', { method: 'POST', headers: { 'x-openlab-bootstrap': token } })
    : await fetch('/api/v1/session'); }
  catch { throw new ApiError('Local service unavailable', 0, 'offline'); }
  history.replaceState(null, '', location.pathname + location.search);
  if (!response.ok) throw new ApiError('Use the current launch link', response.status, token ? 'expired' : 'unauthenticated');
  csrf = (await response.json() as { csrf: string }).csrf;
}
export const csrfToken = () => csrf;
export async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  let response: Response;
  try { response = await fetch('/api/v1' + path, { method, headers: { 'content-type': 'application/json', 'x-openlab-csrf': csrf }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }); }
  catch { throw new ApiError('Local service unavailable / 本地服务不可达', 0, 'offline'); }
  if (!response.ok) {
    let message = `Local service HTTP ${response.status}`;
    try { message = (await response.json() as { error: string }).error; } catch { /* Keep an actionable HTTP status. */ }
    throw new ApiError(message, response.status, response.status === 401 ? 'unauthenticated' : 'request');
  }
  return response.json() as Promise<T>;
}
export async function uploadMaterial(projectId: string, file: File): Promise<{ id: string; preview: string | null }> {
  if (file.size > 10_000_000) throw new Error('Material limit: 10 MB / 附件上限：10 MB');
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader(); reader.onerror = reject; reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.readAsDataURL(file);
  });
  return api(`/projects/${projectId}/materials`, 'POST', { name: file.name, base64 });
}

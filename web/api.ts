let csrf = '';
export async function initializeSession(): Promise<void> {
  const token = new URLSearchParams(location.hash.slice(1)).get('token');
  const response = token
    ? await fetch('/api/v1/session', { method: 'POST', headers: { 'x-openlab-bootstrap': token } })
    : await fetch('/api/v1/session');
  if (!response.ok) throw new Error('Open the launch link printed by npm start to connect this browser. / 请使用 npm start 输出的启动链接。');
  csrf = (await response.json() as { csrf: string }).csrf;
  history.replaceState(null, '', location.pathname + location.search);
}
export const csrfToken = () => csrf;
export async function api<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch('/api/v1' + path, { method, headers: { 'content-type': 'application/json', 'x-openlab-csrf': csrf }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  if (!response.ok) {
    let message = `Local service HTTP ${response.status}`;
    try { message = (await response.json() as { error: string }).error; } catch { /* Keep an actionable HTTP status. */ }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}
export async function uploadMaterial(projectId: string, file: File): Promise<void> {
  if (file.size > 10_000_000) throw new Error('Material limit: 10 MB / 附件上限：10 MB');
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader(); reader.onerror = reject; reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.readAsDataURL(file);
  });
  await api(`/projects/${projectId}/materials`, 'POST', { name: file.name, base64 });
}

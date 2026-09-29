import type { QueryRequest, QueryResult, ChartSpec } from '@vd/shared';

const API_BASE =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) ||
  (typeof process !== 'undefined' && process.env?.VITE_API_URL) ||
  'http://localhost:3001';

export async function fetchSchema() {
  const res = await fetch(`${API_BASE}/api/schema`);
  if (!res.ok) throw new Error(`Failed to fetch schema: ${res.statusText}`);
  return res.json();
}

export async function fetchQuery(queryReq: QueryRequest): Promise<QueryResult> {
  const res = await fetch(`${API_BASE}/api/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(queryReq),
  });

  return res.json();
}

export async function fetchVoiceToken(): Promise<{ token: string; ws_url_base: string }> {
  const res = await fetch(`${API_BASE}/api/voice-token`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || `Voice token error: ${res.statusText}`);
  }
  return res.json();
}

export async function exportMetabase(
  title: string,
  charts: ChartSpec[]
): Promise<{ ok: boolean; url?: string; error?: string }> {
  const res = await fetch(`${API_BASE}/api/export/metabase`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dashboard_title: title, charts }),
  });

  return res.json();
}

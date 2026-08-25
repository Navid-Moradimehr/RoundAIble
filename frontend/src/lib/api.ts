import type { RunEvent, WorkflowPayload } from './types';

// Empty base = same origin (Vite dev proxy forwards /api → localhost:4000).
// Override with VITE_API_URL for a split deployment.
export const API_BASE: string = import.meta.env.VITE_API_URL || '';

export async function apiHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/health`);
    return res.ok;
  } catch {
    return false;
  }
}

export interface StartRunResult {
  runId?: string;
  error?: string;
}

/** Kick off a run. API keys travel in a dedicated header, never in the graph. */
export async function startRun(
  workflow: WorkflowPayload,
  keys: Record<string, string>
): Promise<StartRunResult> {
  try {
    const res = await fetch(`${API_BASE}/api/workflows/${encodeURIComponent(workflow.id)}/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(Object.keys(keys).length > 0 ? { 'x-roundaible-keys': JSON.stringify(keys) } : {}),
      },
      body: JSON.stringify({ workflow }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: data?.error || `HTTP ${res.status}` };
    return { runId: data.runId };
  } catch {
    return { error: 'Backend unreachable. Start it with `npm run dev` (backend).' };
  }
}

/** Subscribe to a run's SSE stream. Returns an unsubscribe function. */
export function openRunStream(
  runId: string,
  onEvent: (event: RunEvent) => void,
  onEnd: () => void
): () => void {
  const source = new EventSource(`${API_BASE}/api/runs/${encodeURIComponent(runId)}/events`);
  source.onmessage = (msg) => {
    try {
      const event = JSON.parse(msg.data) as RunEvent | { type: 'end' };
      if (event.type === 'end') {
        source.close();
        onEnd();
        return;
      }
      onEvent(event);
    } catch {
      // ignore malformed frames
    }
  };
  source.onerror = () => {
    // The backend closes the stream when the run finishes; EventSource fires
    // an error afterwards. Only surface it while we still expect events.
    if (source.readyState === EventSource.CLOSED) {
      onEnd();
    }
  };
  return () => source.close();
}

export async function fetchProviders(): Promise<import('./types').ProviderDef[] | null> {
  try {
    const res = await fetch(`${API_BASE}/api/providers`);
    if (!res.ok) return null;
    const data = await res.json();
    return Array.isArray(data.providers) ? data.providers : null;
  } catch {
    return null;
  }
}

export async function fetchLocalModels(): Promise<string[]> {
  try {
    const res = await fetch(`${API_BASE}/api/local/models`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.models) ? data.models : [];
  } catch {
    return [];
  }
}

import type { StoredApiKey } from './types';

const KEYS_V2 = 'roundaible_api_keys_v2';
const WORKFLOWS_V2 = 'roundaible_workflows_v2';

export function loadApiKeys(): StoredApiKey[] {
  try {
    const raw = localStorage.getItem(KEYS_V2);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveApiKeys(keys: StoredApiKey[]) {
  localStorage.setItem(KEYS_V2, JSON.stringify(keys));
}

export interface StoredWorkflow {
  id: string;
  name: string;
  nodes: unknown[];
  edges: unknown[];
}

export function loadWorkflows(): { workflows: StoredWorkflow[]; activeId: string | null } | null {
  try {
    const raw = localStorage.getItem(WORKFLOWS_V2);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.workflows)) return null;
    return parsed;
  } catch {
    return null;
  }
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;

/** Debounced autosave — avoids hammering localStorage during node drags. */
export function saveWorkflowsDebounced(workflows: StoredWorkflow[], activeId: string) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(WORKFLOWS_V2, JSON.stringify({ workflows, activeId }));
    } catch {
      // storage full or blocked — non-fatal for an MVP
    }
  }, 400);
}

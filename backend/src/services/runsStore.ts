import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RunEvent, ExecutionStatus } from '../services/workflowEngine.js';

export interface RunRecord {
  id: string;
  workflowId: string;
  workflowName: string;
  status: 'running' | 'completed' | 'failed';
  createdAt: string;
  events: RunEvent[];
  result?: ExecutionStatus;
}

// Default to <backend>/.data/runs regardless of process CWD, so the app can
// be launched from anywhere (npx, launcher scripts) and still find its data.
const DEFAULT_RUNS_DIR = fileURLToPath(new URL('../../.data/runs', import.meta.url));
const RUNS_DIR = path.resolve(process.env.RUNS_DIR || DEFAULT_RUNS_DIR);

function persist(record: RunRecord) {
  try {
    if (!fs.existsSync(RUNS_DIR)) fs.mkdirSync(RUNS_DIR, { recursive: true });
    fs.writeFileSync(path.join(RUNS_DIR, `${record.id}.json`), JSON.stringify(record));
  } catch (err) {
    console.error('Failed to persist run:', err instanceof Error ? err.message : err);
  }
}

export class RunsStore {
  private runs = new Map<string, RunRecord>();

  create(workflowId: string, workflowName: string): RunRecord {
    const id = `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const record: RunRecord = {
      id,
      workflowId,
      workflowName,
      status: 'running',
      createdAt: new Date().toISOString(),
      events: [],
    };
    this.runs.set(id, record);
    return record;
  }

  append(runId: string, event: RunEvent) {
    const record = this.runs.get(runId);
    if (!record) return;
    record.events.push(event);
    if (event.type === 'run_completed') {
      record.status = 'completed';
      record.result = event.status;
      persist(record);
    } else if (event.type === 'run_failed') {
      record.status = 'failed';
      persist(record);
    }
  }

  get(runId: string): RunRecord | undefined {
    return this.runs.get(runId);
  }

  /** Recent runs, newest first. */
  list(limit = 20): Array<Pick<RunRecord, 'id' | 'workflowName' | 'status' | 'createdAt'>> {
    return [...this.runs.values()]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit)
      .map(({ id, workflowName, status, createdAt }) => ({ id, workflowName, status, createdAt }));
  }
}

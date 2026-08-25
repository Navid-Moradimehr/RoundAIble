import { Router, Request, Response } from 'express';
import { WorkflowEngine } from '../services/workflowEngine.js';
import { RunsStore } from '../services/runsStore.js';
import { PROVIDERS, OLLAMA_BASE_URL } from '../services/providers.js';
import type { WorkflowPayload } from '../services/workflowEngine.js';

const router = Router();
const engine = new WorkflowEngine();
const runs = new RunsStore();

// Simple concurrency guard: an MVP-friendly way to avoid piling up
// long-running executions on a single local server.
const MAX_CONCURRENT_RUNS = Number(process.env.MAX_CONCURRENT_RUNS || 3);
let activeRuns = 0;

router.post('/workflows/:id/execute', (req: Request, res: Response) => {
  const workflow = req.body?.workflow as WorkflowPayload | undefined;
  if (!workflow || !workflow.id) {
    res.status(400).json({ error: 'workflow object is required in body' });
    return;
  }
  if (workflow.id !== req.params.id) {
    res.status(400).json({ error: 'workflow ID mismatch' });
    return;
  }

  // API keys arrive out-of-band in a dedicated header, never inside the graph.
  let keyHeader: Record<string, string> = {};
  try {
    keyHeader = JSON.parse(req.header('x-roundaible-keys') || '{}');
  } catch {
    res.status(400).json({ error: 'x-roundaible-keys header must be valid JSON' });
    return;
  }

  if (activeRuns >= MAX_CONCURRENT_RUNS) {
    res.status(429).json({ error: 'Too many concurrent runs. Wait for one to finish.' });
    return;
  }

  const record = runs.create(workflow.id, workflow.name || 'Untitled Workflow');
  res.status(202).json({ runId: record.id });

  activeRuns++;
  engine
    .executeWorkflow(workflow, {
      resolveKey: (keyId) => keyHeader[keyId],
      onEvent: (event) => {
        runs.append(record.id, event);
        if (event.type === 'run_completed' || event.type === 'run_failed') activeRuns--;
      },
    })
    .catch((err) => {
      activeRuns--;
      console.error('Run crashed:', err instanceof Error ? err.message : err);
    });
});

// Server-Sent Events stream of a run's lifecycle. Replays stored events so a
// client that connects late still sees the full history.
router.get('/runs/:id/events', (req: Request, res: Response) => {
  const record = runs.get(req.params.id);
  if (!record) {
    res.status(404).json({ error: 'Run not found' });
    return;
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write('retry: 2000\n\n');

  let closed = false;
  const send = (event: unknown) => {
    if (!closed) res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  for (const event of record.events) send(event);

  if (record.status !== 'running') {
    send({ type: 'end' });
    res.end();
    return;
  }

  // Tail new events by polling the store — simple and dependency-free.
  let cursor = record.events.length;
  const interval = setInterval(() => {
    const current = runs.get(record.id);
    if (!current) {
      cleanup();
      return;
    }
    while (cursor < current.events.length) send(current.events[cursor++]);
    if (current.status !== 'running') {
      send({ type: 'end' });
      cleanup();
    }
  }, 400);

  function cleanup() {
    if (closed) return;
    closed = true;
    clearInterval(interval);
    res.end();
  }

  req.on('close', cleanup);
});

router.get('/runs/:id/result', (req: Request, res: Response) => {
  const record = runs.get(req.params.id);
  if (!record) {
    res.status(404).json({ error: 'Run not found' });
    return;
  }
  if (record.status === 'running') {
    res.status(409).json({ error: 'Run still in progress', status: record.status });
    return;
  }
  res.json(record.result ?? { status: record.status, errors: ['No result recorded'] });
});

router.get('/runs', (_req: Request, res: Response) => {
  res.json(runs.list());
});

router.get('/providers', (_req: Request, res: Response) => {
  res.json({
    providers: PROVIDERS.map(({ id, label, kind, requiresKey, models, docsUrl }) => ({
      id,
      label,
      kind,
      requiresKey,
      models,
      docsUrl,
    })),
  });
});

router.get('/local/models', async (_req: Request, res: Response) => {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, { signal: AbortSignal.timeout(3000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = (await response.json()) as { models?: Array<{ name: string }> };
    res.json({ models: data.models?.map((m) => m.name) ?? [] });
  } catch {
    res.json({ models: [], error: 'Ollama is not reachable at ' + OLLAMA_BASE_URL });
  }
});

export default router;

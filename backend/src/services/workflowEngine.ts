import { NodeModel } from '../models/Workflow.js';
import { LlmClient, LlmRequest } from './llmClient.js';
import {
  buildCodeGenPrompt,
  buildPeerReviewPrompt,
  buildRevisionPrompt,
  buildSelfReviewPrompt,
  buildCriticPrompt,
  CodegenContext,
} from './prompts.js';
import { parseCriticResponse } from './scoreParser.js';
import { getProvider, isValidBaseUrl } from './providers.js';

export interface ExecutionResult {
  nodeId: string;
  output: unknown;
  timestamp: Date;
  duration: number;
}

export interface CodeFile {
  filename: string;
  content: string;
}

export interface CodeResult {
  code_id: string;
  agent_id: string;
  codes: CodeFile[];
  description: string;
  scores: number[];
  avgScore: number | null;
  rationales: string[];
  critiques: string[];
}

export interface LiveChatMessage {
  role: 'reasoning' | 'critic' | 'system';
  sender: string;
  content: string;
  timestamp: string;
}

export interface ExecutionStatus {
  workflowId: string;
  status: 'running' | 'completed' | 'failed';
  progress: number;
  results: ExecutionResult[];
  errors: string[];
  codeResults?: CodeResult[];
  liveChatMessages?: LiveChatMessage[];
  winner?: string;
  scores?: Record<string, number[]>;
  rationales?: Record<string, string[]>;
  unranked?: boolean;
}

export interface WorkflowPayload {
  id: string;
  name?: string;
  nodes: NodeModel[];
  edges: Array<{ id: string; source: string; target: string; sourceHandle?: string; targetHandle?: string }>;
  data?: { reasoningRounds?: number };
}

export type RunEvent =
  | { type: 'run_started'; runId: string; workflowName: string }
  | { type: 'node_started'; nodeId: string; label: string }
  | { type: 'node_completed'; nodeId: string; label: string; durationMs: number }
  | { type: 'agent_message'; role: LiveChatMessage['role']; sender: string; content: string; timestamp: string }
  | { type: 'run_progress'; progress: number }
  | { type: 'run_completed'; status: ExecutionStatus }
  | { type: 'run_failed'; errors: string[] };

export interface ExecuteOptions {
  resolveKey(keyId: string): string | undefined;
  onEvent(event: RunEvent): void;
}

const MAX_CONCURRENT_AGENTS = 4;

function emit(opts: ExecuteOptions, status: ExecutionStatus, msg: Omit<LiveChatMessage, 'timestamp'>) {
  const message: LiveChatMessage = { ...msg, timestamp: new Date().toISOString() };
  (status.liveChatMessages ||= []).push(message);
  opts.onEvent({ type: 'agent_message', ...message });
}

async function mapPool<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

interface AgentNodeData {
  label?: string;
  providerId?: string;
  model?: string;
  baseUrl?: string;
  apiKeyId?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutSec?: number;
  [key: string]: unknown;
}

export class WorkflowEngine {
  constructor(private llm: LlmClient = new LlmClient()) {}

  validate(workflow: WorkflowPayload): string[] {
    const errors: string[] = [];
    const activeNodes = workflow.nodes.filter((n) => !n.data?.isCommented);

    const inputNode = activeNodes.find((n) => n.type === 'inputNode');
    if (!inputNode) {
      errors.push('Input node is missing. Add an input node to begin.');
    } else {
      const d = inputNode.data as any;
      const inputType = d?.inputType || 'new-code';
      if (inputType === 'new-code' && !(d?.prompt || '').trim()) {
        errors.push('Input node: prompt is empty.');
      }
      if (inputType === 'modify-code') {
        if (!(d?.existingCode || '').trim()) errors.push('Input node: existing code is empty.');
        if (!(d?.modificationRequest || '').trim()) errors.push('Input node: modification request is empty.');
      }
      if (inputType === 'fix-bug') {
        if (!(d?.existingCode || '').trim()) errors.push('Input node: existing code is empty.');
        if (!(d?.errorMessage || '').trim()) errors.push('Input node: error message is empty.');
      }
    }

    for (const node of activeNodes) {
      if (node.type !== 'reasoningAgentNode' && node.type !== 'criticNode') continue;
      const d = node.data as AgentNodeData;
      const name = d?.label || node.id;
      const provider = getProvider(d?.providerId || '');
      if (!provider) {
        errors.push(`${name}: no provider selected.`);
        continue;
      }
      if (!d?.model) {
        errors.push(`${name}: no model selected.`);
      }
      if (provider.requiresKey && !d?.apiKeyId) {
        errors.push(`${name}: ${provider.label} requires an API key.`);
      }
      if (provider.id === 'custom') {
        if (!d?.baseUrl) errors.push(`${name}: custom provider requires a base URL.`);
        else if (!isValidBaseUrl(d.baseUrl)) errors.push(`${name}: base URL must be a valid http(s) URL.`);
      }
    }

    const activeRoundaible = activeNodes.filter((n) => n.type === 'roundaibleNode');
    if (activeRoundaible.length === 0) errors.push('No RoundAIble node found.');
    return errors;
  }

  async executeWorkflow(workflow: WorkflowPayload, opts: ExecuteOptions): Promise<ExecutionStatus> {
    const status: ExecutionStatus = {
      workflowId: workflow.id,
      status: 'running',
      progress: 0,
      results: [],
      errors: [],
    };

    const validationErrors = this.validate(workflow);
    if (validationErrors.length > 0) {
      status.status = 'failed';
      status.errors = validationErrors;
      opts.onEvent({ type: 'run_failed', errors: validationErrors });
      return status;
    }

    try {
      const activeNodes = workflow.nodes.filter((n) => !n.data?.isCommented);
      const inputNode = activeNodes.find((n) => n.type === 'inputNode')!;
      const reasoningNodes = activeNodes.filter((n) => n.type === 'reasoningAgentNode');
      const criticNodes = activeNodes.filter((n) => n.type === 'criticNode');

      const input = inputNode.data as any;
      const ctx: CodegenContext = {
        inputType: input.inputType || 'new-code',
        userPrompt: input.prompt || '',
        existingCode: input.existingCode || '',
        modificationRequest: input.modificationRequest || '',
        errorMessage: input.errorMessage || '',
        additionalContext: input.additionalContext || '',
      };
      const reasoningRounds = Math.min(5, Math.max(1, workflow.data?.reasoningRounds ?? input.rounds ?? 1));

      // ---- Step 1: initial generation (parallel with concurrency cap) ----
      let agentResults = await this.runAgents(reasoningNodes, (node) =>
        this.callLlm(node, buildCodeGenPrompt(ctx), opts)
      );
      for (const r of agentResults) {
        emit(opts, status, {
          role: 'reasoning',
          sender: r.agent_id,
          content:
            r.codes.map((c) => `${c.filename}:\n${c.content}`).join('\n\n') +
            '\n' +
            (r.description || ''),
        });
      }

      // ---- Step 2: multi-round refinement ----
      for (let round = 2; round <= reasoningRounds; round++) {
        if (reasoningNodes.length === 1) {
          const prev = agentResults[0];
          const updated = await this.runAgents([reasoningNodes[0]], () =>
            this.callLlm(reasoningNodes[0], buildSelfReviewPrompt(ctx.userPrompt, prev.codes, prev.description), opts)
          );
          agentResults = updated;
          emit(opts, status, {
            role: 'system',
            sender: 'RoundAIble',
            content: `Round ${round}: self-review completed.`,
          });
        } else {
          agentResults = await mapPool(reasoningNodes, MAX_CONCURRENT_AGENTS, async (node) => {
            const me = (node.data as AgentNodeData).label || this.defaultAgentId(node);
            const peers = agentResults
              .filter((r) => r.agent_id !== me)
              .map((r) => ({ agentId: r.agent_id, codes: r.codes, description: r.description }));
            return this.callLlm(node, buildPeerReviewPrompt(ctx.userPrompt, peers), opts);
          });
          // Revision round based on collected feedback
          agentResults = await mapPool(reasoningNodes, MAX_CONCURRENT_AGENTS, async (node) => {
            const me = (node.data as AgentNodeData).label || this.defaultAgentId(node);
            const mine = agentResults.find((r) => r.agent_id === me);
            const feedbacks = agentResults
              .filter((r) => r.agent_id !== me)
              .map((r) => r.description || '')
              .filter(Boolean);
            return this.callLlm(
              node,
              buildRevisionPrompt(
                ctx.userPrompt,
                mine ? mine.codes.map((c) => `Filename: ${c.filename}\n${c.content}`).join('\n') : '',
                feedbacks
              ),
              opts
            );
          });
          emit(opts, status, {
            role: 'system',
            sender: 'RoundAIble',
            content: `Round ${round}: peer review and revision completed.`,
          });
        }
        for (const r of agentResults) {
          emit(opts, status, {
            role: 'reasoning',
            sender: r.agent_id,
            content: `(round ${round}) ${r.codes.map((c) => c.filename).join(', ')}\n${r.description || ''}`,
          });
        }
      }

      // ---- Step 3: assemble submissions ----
      const finalSubmissions = agentResults.map((r, i) => ({
        code_id: `code_${i + 1}`,
        agent_id: r.agent_id,
        codes: r.codes,
        description: r.description,
        error: r.error,
      }));
      const failedSubmissions = finalSubmissions.filter((s) => s.error);

      // ---- Step 4: critique & rank ----
      const scoreMap: Record<string, number[]> = {};
      const rationaleMap: Record<string, string[]> = {};
      let anyCritiqueSucceeded = false;

      const scorable = finalSubmissions.filter((s) => !s.error);
      for (const criticNode of criticNodes) {
        const criticName = (criticNode.data as AgentNodeData).label || this.defaultAgentId(criticNode);
        opts.onEvent({
          type: 'node_started',
          nodeId: criticNode.id,
          label: `Critic: ${criticName}`,
        });
        const startedAt = Date.now();
        try {
          const prompt = buildCriticPrompt(
            ctx,
            scorable.map((s, idx) => ({
              index: idx + 1,
              agentId: s.agent_id,
              content: s.codes.map((c) => c.content).join('\n\n'),
            }))
          );
          const raw = await this.callLlmRaw(criticNode, prompt, opts);
          const parsed = parseCriticResponse(raw, scorable.length);
          if (parsed.parseMode === 'none') {
            status.errors.push(`Critic "${criticName}" returned an unparseable evaluation.`);
            emit(opts, status, {
              role: 'system',
              sender: 'RoundAIble',
              content: `⚠️ Critic "${criticName}" did not return usable scores.`,
            });
          } else {
            anyCritiqueSucceeded = true;
            Object.entries(parsed.scores).forEach(([codeId, score]) => {
              const submission = scorable[parseInt(codeId.replace('code_', ''), 10) - 1];
              const displayId = submission?.code_id || codeId;
              (scoreMap[displayId] ||= []).push(score);
              const rationale = parsed.rationales[codeId];
              const critique = parsed.critiques[codeId];
              if (rationale) (rationaleMap[displayId] ||= []).push(rationale);
              emit(opts, status, {
                role: 'critic',
                sender: `${criticName}`,
                content: `${submission?.agent_id || displayId} → Score: ${score}\nFeedback: ${critique}`,
              });
            });
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          status.errors.push(`Critic "${criticName}" failed: ${msg}`);
        }
        opts.onEvent({
          type: 'node_completed',
          nodeId: criticNode.id,
          label: `Critic: ${criticName}`,
          durationMs: Date.now() - startedAt,
        });
      }

      const failedIds = new Set(failedSubmissions.map((s) => s.code_id));
      const codeResults: CodeResult[] = finalSubmissions.map((s) => {
        const scores = scoreMap[s.code_id] || [];
        const avgScore =
          scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
        return {
          code_id: s.code_id,
          agent_id: s.agent_id,
          codes: s.codes,
          description: s.error ? `Error: ${s.error}` : s.description,
          scores,
          avgScore,
          rationales: rationaleMap[s.code_id] || [],
          critiques: rationaleMap[s.code_id] || [],
        };
      });

      let winner = '';
      if (anyCritiqueSucceeded) {
        let best = -1;
        for (const cr of codeResults) {
          if (cr.avgScore !== null && !failedIds.has(cr.code_id) && cr.avgScore > best) {
            best = cr.avgScore;
            winner = cr.code_id;
          }
        }
      }

      status.unranked = !anyCritiqueSucceeded;

      status.codeResults = codeResults;
      status.winner = winner;
      status.scores = scoreMap;
      status.rationales = rationaleMap;
      status.progress = 100;
      status.status = 'completed';

      if (status.unranked) {
        emit(opts, status, {
          role: 'system',
          sender: 'RoundAIble',
          content:
            codeResults.length <= 1
              ? 'Completed. Single submission — nothing to rank.'
              : 'Completed without scoring (no critic succeeded). Results are unranked.',
        });
      } else if (winner) {
        const win = codeResults.find((c) => c.code_id === winner);
        emit(opts, status, {
          role: 'system',
          sender: 'RoundAIble',
          content: `🏆 Winner: ${win?.agent_id || winner} (avg score ${win?.avgScore?.toFixed(2)})`,
        });
      }

      opts.onEvent({ type: 'run_completed', status });
      return status;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      status.status = 'failed';
      status.errors.push(message);
      opts.onEvent({ type: 'run_failed', errors: status.errors });
      return status;
    }
  }

  private defaultAgentId(node: NodeModel): string {
    const d = node.data as AgentNodeData;
    return `${d.providerId || 'unknown'}:${d.model || '?'}`;
  }

  private async runAgents(
    nodes: NodeModel[],
    call: (node: NodeModel) => Promise<{ agent_id: string; codes: CodeFile[]; description: string; error?: string }>
  ): Promise<Array<{ agent_id: string; codes: CodeFile[]; description: string; error?: string }>> {
    return mapPool(nodes, MAX_CONCURRENT_AGENTS, (node) => call(node));
  }

  private buildLlmRequest(node: NodeModel, prompt: string, opts: ExecuteOptions): LlmRequest {
    const d = node.data as AgentNodeData;
    const apiKey = d.apiKeyId ? opts.resolveKey(d.apiKeyId) : undefined;
    return {
      providerId: d.providerId || '',
      model: d.model || '',
      prompt,
      apiKey,
      baseUrl: d.baseUrl,
      temperature: typeof d.temperature === 'number' ? d.temperature : 0.7,
      maxTokens: typeof d.maxTokens === 'number' ? d.maxTokens : 4096,
      timeoutMs: typeof d.timeoutSec === 'number' ? d.timeoutSec * 1000 : undefined,
    };
  }

  /** Full agent call: LLM request + response parsing into codes/description. */
  private async callLlm(
    node: NodeModel,
    prompt: string,
    opts: ExecuteOptions
  ): Promise<{ agent_id: string; codes: CodeFile[]; description: string; error?: string }> {
    const d = node.data as AgentNodeData;
    const agentId = d.label || this.defaultAgentId(node);
    const label = `Agent: ${agentId}`;
    opts.onEvent({ type: 'node_started', nodeId: node.id, label });
    const startedAt = Date.now();
    try {
      const response = await this.callLlmRaw(node, prompt, opts);
      const parsed = parseAgentResponse(response);
      opts.onEvent({
        type: 'node_completed',
        nodeId: node.id,
        label,
        durationMs: Date.now() - startedAt,
      });
      return { agent_id: agentId, ...parsed };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      opts.onEvent({
        type: 'node_completed',
        nodeId: node.id,
        label,
        durationMs: Date.now() - startedAt,
      });
      return { agent_id: agentId, codes: [], description: '', error: message };
    }
  }

  private async callLlmRaw(node: NodeModel, prompt: string, opts: ExecuteOptions): Promise<string> {
    const req = this.buildLlmRequest(node, prompt, opts);
    const res = await this.llm.generate(req);
    return res.content;
  }
}

/** Parse the `--- Filename: ... --- Description:` convention used in prompts. */
export function parseAgentResponse(response: string): { codes: CodeFile[]; description: string } {
  const codes: CodeFile[] = [];
  const lines = response.split(/\r?\n/);

  let i = 0;
  while (i < lines.length) {
    if (!/^---+\s*$/.test(lines[i])) {
      i++;
      continue;
    }
    const fnMatch = lines[i + 1]?.match(/^\s*Filename:\s*(.+)\s*$/i);
    if (!fnMatch) {
      i++;
      continue;
    }
    const filename = fnMatch[1].trim();
    const buffer: string[] = [];
    let j = i + 2;
    while (j < lines.length && !/^---+\s*$/.test(lines[j])) {
      buffer.push(lines[j]);
      j++;
    }
    if (j >= lines.length) break; // unterminated block — stop scanning
    let content = buffer.join('\n').trim();
    content = content.replace(/^```[a-zA-Z0-9]*\s*\n?/, '').replace(/\n?```\s*$/, '');
    if (content) codes.push({ filename, content });
    // Resume AT the closing delimiter: consecutive blocks share it.
    i = j;
  }

  const descIdx = response.lastIndexOf('Description:');
  const description =
    descIdx !== -1 ? response.slice(descIdx + 'Description:'.length).trim() : '';

  if (codes.length === 0 && response.trim()) {
    // Fallback: first fenced code block anywhere, else the raw response
    const fence = response.match(/```[a-zA-Z0-9]*\s*\n([\s\S]*?)\n```/);
    const content = fence ? fence[1] : response.trim();
    codes.push({ filename: 'main.py', content });
  }
  return { codes, description };
}

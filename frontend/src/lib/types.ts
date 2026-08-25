export type ProviderType = 'openai-compatible' | 'anthropic' | 'google' | 'ollama';

export interface ModelDef {
  id: string;
  label: string;
}

export interface ProviderDef {
  id: string;
  label: string;
  type: ProviderType;
  kind: 'cloud' | 'local';
  requiresKey: boolean;
  models: ModelDef[];
  docsUrl?: string;
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
  results: unknown[];
  errors: string[];
  codeResults?: CodeResult[];
  liveChatMessages?: LiveChatMessage[];
  winner?: string;
  scores?: Record<string, number[]>;
  rationales?: Record<string, string[]>;
  unranked?: boolean;
}

export type RunEvent =
  | { type: 'run_started'; runId: string; workflowName: string }
  | { type: 'node_started'; nodeId: string; label: string }
  | { type: 'node_completed'; nodeId: string; label: string; durationMs: number }
  | {
      type: 'agent_message';
      role: LiveChatMessage['role'];
      sender: string;
      content: string;
      timestamp: string;
    }
  | { type: 'run_progress'; progress: number }
  | { type: 'run_completed'; status: ExecutionStatus }
  | { type: 'run_failed'; errors: string[] };

export interface InputNodeData {
  [key: string]: unknown;
  label?: string;
  inputType?: 'new-code' | 'modify-code' | 'fix-bug';
  prompt?: string;
  existingCode?: string;
  modificationRequest?: string;
  errorMessage?: string;
  additionalContext?: string;
  rounds?: number;
  isCommented?: boolean;
}

export interface AgentNodeData {
  [key: string]: unknown;
  label?: string;
  providerId?: string;
  model?: string;
  baseUrl?: string;
  apiKeyId?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutSec?: number;
  /** Derived from the provider catalog for rendering; not sent to backend. */
  isLocal?: boolean;
  status?: 'running' | 'done' | 'error';
  isCommented?: boolean;
}

export interface RoundaibleNodeData {
  [key: string]: unknown;
  label?: string;
  isCommented?: boolean;
}

export type NodeData = InputNodeData & AgentNodeData & RoundaibleNodeData;

export interface StoredApiKey {
  id: string;
  providerId: string;
  name: string;
  key: string;
}

export interface WorkflowPayload {
  id: string;
  name?: string;
  nodes: Array<{ id: string; type: string; position: { x: number; y: number }; data: NodeData }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    sourceHandle?: string | null;
    targetHandle?: string | null;
  }>;
  data?: { reasoningRounds?: number };
}

export interface NodeModel {
  id: string;
  type: 'inputNode' | 'reasoningAgentNode' | 'criticNode' | 'roundaibleNode';
  data: NodeData;
  position: { x: number; y: number };
}

export interface InputNodeData {
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
  label?: string;
  providerId?: string;
  model?: string;
  baseUrl?: string;
  apiKeyId?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutSec?: number;
  isCommented?: boolean;
}

export interface RoundaibleNodeData {
  label?: string;
  isCommented?: boolean;
}

export type NodeData = InputNodeData & AgentNodeData & RoundaibleNodeData;

export interface EdgeModel {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface Workflow {
  id: string;
  name?: string;
  nodes: NodeModel[];
  edges: EdgeModel[];
  data?: {
    reasoningRounds?: number;
  };
}

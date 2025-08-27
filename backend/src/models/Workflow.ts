export interface Workflow {
  id: string;
  name: string;
  nodes: NodeModel[];
  edges: EdgeModel[];
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface NodeModel {
  id: string;
  type: 'inputNode' | 'reasoningAgentNode' | 'criticNode' | 'roundaibleNode';
  data: any;
  position: { x: number; y: number };
  isCommented?: boolean;
}

export interface EdgeModel {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
} 
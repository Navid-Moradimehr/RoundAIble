export interface TemplateNode {
  id: string;
  type: 'inputNode' | 'reasoningAgentNode' | 'criticNode' | 'roundaibleNode';
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

export interface TemplateEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

export interface WorkflowTemplate {
  name: string;
  nodes: TemplateNode[];
  edges: TemplateEdge[];
}

const edge = (
  source: string,
  target: string,
  sourceHandle: string,
  targetHandle: string
): TemplateEdge => ({
  id: `e_${source}_${target}_${targetHandle}`,
  source,
  target,
  sourceHandle,
  targetHandle,
});

export const DEFAULT_TEMPLATE: WorkflowTemplate = {
  name: 'Default Workflow',
  nodes: [
    {
      id: 'input_1',
      type: 'inputNode',
      position: { x: -350, y: 180 },
      data: { label: 'Input Node', inputType: 'new-code', prompt: '' },
    },
    { id: 'roundaible_1', type: 'roundaibleNode', position: { x: 60, y: 180 }, data: {} },
    {
      id: 'reason_cloud_1',
      type: 'reasoningAgentNode',
      position: { x: -350, y: 0 },
      data: { label: 'Cloud Agent', providerId: 'openai', model: 'gpt-4o-mini' },
    },
    {
      id: 'reason_local_1',
      type: 'reasoningAgentNode',
      position: { x: -120, y: 0 },
      data: { label: 'Local Agent', providerId: 'ollama', model: 'qwen3:8b' },
    },
    {
      id: 'critic_cloud_1',
      type: 'criticNode',
      position: { x: 60, y: 380 },
      data: { label: 'Critic A', providerId: 'openai', model: 'gpt-4o-mini' },
    },
    {
      id: 'critic_local_1',
      type: 'criticNode',
      position: { x: -230, y: 380 },
      data: { label: 'Critic B', providerId: 'ollama', model: 'qwen3:8b' },
    },
  ],
  edges: [
    edge('input_1', 'roundaible_1', 'output', 'input'),
    edge('reason_cloud_1', 'roundaible_1', 'output', 'reasoning'),
    edge('reason_local_1', 'roundaible_1', 'output', 'reasoning'),
    edge('roundaible_1', 'critic_cloud_1', 'critic', 'input'),
    edge('roundaible_1', 'critic_local_1', 'critic', 'input'),
  ],
};

function clone(template: WorkflowTemplate, name: string): WorkflowTemplate {
  return JSON.parse(JSON.stringify({ ...template, name }));
}

export const EXAMPLE_WORKFLOWS: WorkflowTemplate[] = [
  clone(DEFAULT_TEMPLATE, 'Competitive + Critique'),
  {
    name: 'Simple Generation (single agent)',
    nodes: [
      {
        id: 'input_1',
        type: 'inputNode',
        position: { x: -200, y: 150 },
        data: { label: 'Input Node', inputType: 'new-code', prompt: '' },
      },
      { id: 'roundaible_1', type: 'roundaibleNode', position: { x: 150, y: 150 }, data: {} },
      {
        id: 'reason_cloud_1',
        type: 'reasoningAgentNode',
        position: { x: -200, y: -30 },
        data: { label: 'Solo Agent', providerId: 'openai', model: 'gpt-4o-mini' },
      },
    ],
    edges: [
      edge('input_1', 'roundaible_1', 'output', 'input'),
      edge('reason_cloud_1', 'roundaible_1', 'output', 'reasoning'),
    ],
  },
  {
    name: 'Bug Fix Duel',
    nodes: [
      {
        id: 'input_1',
        type: 'inputNode',
        position: { x: -300, y: 170 },
        data: { label: 'Buggy Code', inputType: 'fix-bug', existingCode: '', errorMessage: '' },
      },
      { id: 'roundaible_1', type: 'roundaibleNode', position: { x: 80, y: 170 }, data: {} },
      {
        id: 'reason_cloud_1',
        type: 'reasoningAgentNode',
        position: { x: -320, y: 0 },
        data: { label: 'Fixer Cloud', providerId: 'anthropic', model: 'claude-sonnet-4-5' },
      },
      {
        id: 'reason_local_1',
        type: 'reasoningAgentNode',
        position: { x: -100, y: 0 },
        data: { label: 'Fixer Local', providerId: 'ollama', model: 'qwen2.5-coder:7b' },
      },
      {
        id: 'critic_cloud_1',
        type: 'criticNode',
        position: { x: 80, y: 370 },
        data: { label: 'Bug Judge', providerId: 'google', model: 'gemini-2.5-flash' },
      },
    ],
    edges: [
      edge('input_1', 'roundaible_1', 'output', 'input'),
      edge('reason_cloud_1', 'roundaible_1', 'output', 'reasoning'),
      edge('reason_local_1', 'roundaible_1', 'output', 'reasoning'),
      edge('roundaible_1', 'critic_cloud_1', 'critic', 'input'),
    ],
  },
];

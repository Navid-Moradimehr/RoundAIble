import type { NodeData } from './types';

export interface RfNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: NodeData;
}

export interface RfEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

const INPUT_REQUIRED_FIELDS: Record<string, Array<[field: string, message: string]>> = {
  'new-code': [['prompt', 'prompt is empty']],
  'modify-code': [
    ['existingCode', 'existing code is empty'],
    ['modificationRequest', 'modification request is empty'],
  ],
  'fix-bug': [
    ['existingCode', 'existing code is empty'],
    ['errorMessage', 'error message is empty'],
  ],
};

export function validateWorkflow(
  nodes: RfNode[],
  edges: RfEdge[]
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const active = nodes.filter((n) => !n.data?.isCommented);

  const inputs = active.filter((n) => n.type === 'inputNode');
  if (inputs.length !== 1) {
    errors.push(inputs.length === 0 ? 'Add an Input node.' : 'Only one active Input node allowed.');
  } else {
    const d = inputs[0].data;
    const inputType = d.inputType || 'new-code';
    for (const [field, message] of INPUT_REQUIRED_FIELDS[inputType] || []) {
      if (!(String(d[field] ?? '')).trim()) errors.push(`Input node: ${message}.`);
    }
  }

  const roundaibleCount = active.filter((n) => n.type === 'roundaibleNode').length;
  if (roundaibleCount === 0) errors.push('Add a RoundAIble node.');
  if (roundaibleCount > 1) errors.push('Only one active RoundAIble node allowed.');

  for (const node of active) {
    if (node.type !== 'reasoningAgentNode' && node.type !== 'criticNode') continue;
    const name = node.data.label || node.id;
    if (!node.data.providerId) errors.push(`${name}: select a provider.`);
    if (!node.data.model) errors.push(`${name}: select a model.`);
    if (node.data.providerId && !node.data.model) {
      // covered above
    }
    if (node.data.providerId?.startsWith('custom')) {
      if (!(node.data.baseUrl || '').trim()) errors.push(`${name}: custom provider needs a base URL.`);
    }
  }

  // Every active node must be wired to the RoundAIble node.
  const roundaibleIds = new Set(active.filter((n) => n.type === 'roundaibleNode').map((n) => n.id));
  if (roundaibleIds.size > 0) {
    const connected = new Set<string>([...roundaibleIds]);
    for (const edge of edges) {
      const s = active.find((n) => n.id === edge.source);
      const t = active.find((n) => n.id === edge.target);
      if (s && t && (roundaibleIds.has(edge.source) || roundaibleIds.has(edge.target))) {
        connected.add(edge.source);
        connected.add(edge.target);
      }
    }
    const orphaned = active.filter((n) => !connected.has(n.id));
    if (orphaned.length > 0) {
      errors.push(
        `Not connected to RoundAIble: ${orphaned
          .map((n) => n.data.label || n.id)
          .join(', ')}. Connect them or comment them out.`
      );
    }
  }

  return { isValid: errors.length === 0, errors };
}

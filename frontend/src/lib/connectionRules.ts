/**
 * Connection rules: edges must involve a RoundAIble orchestrator node.
 *  - Input node → RoundAIble "input" port
 *  - Reasoning agent → RoundAIble "reasoning" port
 *  - RoundAIble "critic" port → Critic node
 */
export function canConnect(
  sourceId: string,
  targetId: string,
  sourceHandle: string | null,
  targetHandle: string | null
): boolean {
  const typeOf = (id: string) => id.split('_')[0];

  if (typeOf(sourceId) === 'roundaible' || typeOf(targetId) === 'roundaible') {
    const roundaibleIsSource = typeOf(sourceId) === 'roundaible';
    const roundaibleHandle = roundaibleIsSource ? sourceHandle : targetHandle;
    const otherId = roundaibleIsSource ? targetId : sourceId;
    const otherType = typeOf(otherId);

    if (roundaibleHandle === 'input') return otherType === 'input';
    if (roundaibleHandle === 'reasoning') return otherType === 'reason';
    if (roundaibleHandle === 'critic') return otherType === 'critic';
    return false;
  }

  return false;
}

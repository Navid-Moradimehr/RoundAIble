interface NodePaletteProps {
  onAdd: (type: string, data?: Record<string, unknown>) => void;
}

export default function NodePalette({ onAdd }: NodePaletteProps) {
  const item =
    'w-full rounded-lg border border-gray-300 bg-white px-2 py-2 text-xs font-medium text-gray-700 transition-colors hover:border-blue-400 hover:bg-blue-50';
  return (
    <aside className="flex h-full w-[150px] shrink-0 flex-col gap-2 border-l border-gray-200 bg-gray-50 p-2">
      <div className="text-xs font-bold text-gray-600">Node Palette</div>
      <button className={item} onClick={() => onAdd('inputNode', { label: 'Input' })}>
        📥 Input
      </button>
      <button
        className={item}
        onClick={() => onAdd('reasoningAgentNode', { label: 'Cloud Agent', providerId: 'openai', model: 'gpt-4o-mini' })}
      >
        🔌 Reasoning (Cloud)
      </button>
      <button
        className={item}
        onClick={() =>
          onAdd('reasoningAgentNode', {
            label: 'Local Agent',
            providerId: 'ollama',
            model: 'qwen3:8b',
            isLocal: true,
          })
        }
      >
        💻 Reasoning (Local)
      </button>
      <button
        className={item}
        onClick={() => onAdd('criticNode', { label: 'Critic A', providerId: 'openai', model: 'gpt-4o-mini' })}
      >
        🔍 Critic (Cloud)
      </button>
      <button
        className={item}
        onClick={() =>
          onAdd('criticNode', {
            label: 'Critic B',
            providerId: 'ollama',
            model: 'qwen3:8b',
            isLocal: true,
          })
        }
      >
        🔍 Critic (Local)
      </button>
      <button className={item} onClick={() => onAdd('roundaibleNode', {})}>
        ⭕ RoundAIble
      </button>

      <div className="mt-auto rounded-md bg-blue-50 p-2 text-[10px] leading-snug text-blue-800">
        Double-click a node to configure it. Right-click for comment/duplicate/delete.
      </div>
    </aside>
  );
}

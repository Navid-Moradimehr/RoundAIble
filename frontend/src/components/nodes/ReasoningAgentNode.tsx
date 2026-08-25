import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { AgentNodeData } from '../../lib/types';

const CLOUD = {
  gradient: 'linear-gradient(135deg,#9c27b0,#7b1fa2)',
  border: '#6a1b9a',
};
const LOCAL = {
  gradient: 'linear-gradient(135deg,#00897b,#00695c)',
  border: '#004d40',
};

function AgentNodeShell({
  data,
  icon,
  fallbackLabel,
  subtitle,
  children,
}: {
  data: AgentNodeData;
  icon: string;
  fallbackLabel: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const isLocal = Boolean(data.isLocal);
  const palette = isLocal ? LOCAL : CLOUD;
  return (
    <div className={`relative flex h-20 w-[150px] items-center justify-center ${data.status === 'running' ? 'animate-pulse' : ''}`}>
      {children}
      <div
        className={`flex h-full w-full flex-col items-center justify-center rounded-xl px-1 text-center font-bold text-white shadow-md ${
          data.isCommented ? 'border-2 border-dashed border-gray-400 bg-gray-100 text-gray-400' : ''
        } ${data.status === 'error' ? 'ring-2 ring-red-500' : ''}`}
        style={
          data.isCommented
            ? undefined
            : {
                background: palette.gradient,
                border: `2px solid ${palette.border}`,
              }
        }
        title="Double-click to configure"
      >
        <div className="mb-0.5 text-base leading-none">
          {data.status === 'running' ? '⏳' : data.status === 'error' ? '❌' : icon}
        </div>
        <div className="text-[11px] leading-tight">{data.label || fallbackLabel}</div>
        <div className="mt-0.5 text-[9px] opacity-80">
          {String(data.model || subtitle)}
        </div>
      </div>
      {data.isCommented && (
        <span className="absolute -right-2 -top-2 text-xs">💬</span>
      )}
    </div>
  );
}

function ReasoningAgentNodeInner({ data }: { data: AgentNodeData }) {
  return (
    <AgentNodeShell
      data={data}
      icon={data.isLocal ? '💻' : '🔌'}
      fallbackLabel="Reasoning"
      subtitle="select model"
    >
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="!z-10 !h-3.5 !w-3.5 !rotate-45 !rounded-sm !border-[3px] !border-white !bg-green-500"
      />
    </AgentNodeShell>
  );
}

const ReasoningAgentNode = memo(ReasoningAgentNodeInner);
export default ReasoningAgentNode;

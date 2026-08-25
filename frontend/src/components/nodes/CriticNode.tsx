import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { AgentNodeData } from '../../lib/types';

function CriticNodeInner({ data }: { data: AgentNodeData }) {
  const isLocal = Boolean(data.isLocal);
  return (
    <div className={`relative flex h-20 w-[150px] items-center justify-center ${data.status === 'running' ? 'animate-pulse' : ''}`}>
      <Handle
        type="target"
        position={Position.Top}
        id="input"
        className="!z-10 !h-3.5 !w-3.5 !rounded-sm !border-[3px] !border-white !bg-orange-400"
      />
      <div
        className={`flex h-full w-full flex-col items-center justify-center rounded-xl px-1 text-center font-bold text-white shadow-md ${
          data.isCommented ? 'border-2 border-dashed border-gray-400 bg-gray-100 text-gray-400' : ''
        } ${data.status === 'error' ? 'ring-2 ring-red-500' : ''}`}
        style={
          data.isCommented
            ? undefined
            : {
                background: isLocal
                  ? 'linear-gradient(135deg,#ef6c00,#e65100)'
                  : 'linear-gradient(135deg,#f44336,#d32f2f)',
                border: `2px solid ${isLocal ? '#bf360c' : '#b71c1c'}`,
              }
        }
        title="Double-click to configure"
      >
        <div className="mb-0.5 text-base leading-none">
          {data.status === 'running' ? '⏳' : data.status === 'error' ? '❌' : '🔍'}
        </div>
        <div className="text-[11px] leading-tight">{data.label || 'Critic'}</div>
        <div className="mt-0.5 text-[9px] opacity-80">{String(data.model || 'select model')}</div>
      </div>
      {data.isCommented && (
        <span className="absolute -right-2 -top-2 text-xs">💬</span>
      )}
    </div>
  );
}

const CriticNode = memo(CriticNodeInner);
export default CriticNode;

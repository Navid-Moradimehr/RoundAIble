import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { RoundaibleNodeData } from '../../lib/types';

function RoundAIbleNodeInner({ data }: { data: RoundaibleNodeData }) {
  return (
    <div className="relative flex h-24 w-[150px] items-center justify-center">
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="!z-10 !h-3.5 !w-3.5 !rounded-full !border-[3px] !border-white !bg-blue-500"
      />
      <Handle
        type="target"
        position={Position.Top}
        id="reasoning"
        className="!z-10 !h-3.5 !w-3.5 !rotate-45 !rounded-sm !border-[3px] !border-white !bg-green-500"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="critic"
        className="!z-10 !h-3.5 !w-3.5 !rounded-sm !border-[3px] !border-white !bg-orange-400"
      />
      <div
        className={`flex h-full w-full items-center justify-center rounded-xl px-2 text-center text-base font-bold shadow-lg ${
          data.isCommented
            ? 'border-2 border-dashed border-gray-400 bg-gray-100 text-gray-400'
            : 'border-2 border-blue-900 text-white'
        }`}
        style={
          data.isCommented ? undefined : { background: 'linear-gradient(135deg,#1976d2,#1565c0)' }
        }
      >
        {data.label || 'RoundAIble'}
      </div>
      {data.isCommented && (
        <span className="absolute -right-2 -top-2 text-xs">💬</span>
      )}
    </div>
  );
}

const RoundAIbleNode = memo(RoundAIbleNodeInner);
export default RoundAIbleNode;

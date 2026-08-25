import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { InputNodeData } from '../../lib/types';

function InputNodeInner({ data }: { data: InputNodeData }) {
  return (
    <div className="relative flex h-16 w-[130px] items-center justify-center">
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        className="!z-10 !h-3.5 !w-3.5 !rounded-full !border-[3px] !border-white !bg-blue-500"
      />
      <div
        className={`flex h-full w-full items-center justify-center rounded-lg text-sm font-bold text-white shadow ${
          data.isCommented
            ? 'border-2 border-dashed border-gray-400 bg-gray-100 text-gray-400'
            : 'border-2 border-green-800'
        }`}
        style={
          data.isCommented ? undefined : { background: 'linear-gradient(135deg,#4caf50,#45a049)' }
        }
        title="Double-click to configure"
      >
        {data.label || 'Input'}
      </div>
      {data.isCommented && (
        <span className="absolute -right-2 -top-2 text-xs">💬</span>
      )}
    </div>
  );
}

const InputNode = memo(InputNodeInner);
export default InputNode;

import React from 'react';
import { Handle, Position } from 'reactflow';

export type ReasoningAgentVariant = 'api' | 'huggingface' | 'local';

interface ReasoningAgentNodeProps {
  data: {
    label?: string;
    variant?: ReasoningAgentVariant;
    providerModel?: string;
    isCommented?: boolean;
    [key: string]: any;
  };
}

const icons: Record<ReasoningAgentVariant, React.ReactNode> = {
  api: <span role="img" aria-label="API" style={{ fontSize: 22 }}>🌐</span>,
  huggingface: <span role="img" aria-label="HuggingFace" style={{ fontSize: 22 }}>🤗</span>,
  local: <span role="img" aria-label="Local" style={{ fontSize: 22 }}>💻</span>,
};

const colors: Record<ReasoningAgentVariant, string> = {
  api: '#2196f3',
  huggingface: '#ff9800',
  local: '#9c27b0',
};

const ReasoningAgentNode: React.FC<ReasoningAgentNodeProps> = ({ data }) => {
  const variant = data.variant || 'api';
  const color = colors[variant];
  const icon = icons[variant];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        borderRadius: 12,
        border: data.isCommented ? '2px dashed #999' : `2px solid ${color}`,
        background: data.isCommented ? '#f5f5f5' : `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
        minWidth: 120,
        minHeight: 48,
        padding: '8px 16px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        position: 'relative',
        opacity: data.isCommented ? 0.6 : 1
      }}
    >
      {/* Output Handle (Right) - Green circle to match RoundAIble's top port */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        style={{
          width: 14,
          height: 14,
          background: '#4caf50',
          border: '3px solid #fff',
          borderRadius: '50%',
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 10
        }}
      />
      
      <span style={{ marginRight: 12 }}>{icon}</span>
      <div>
        <div style={{ fontWeight: 'bold', color: data.isCommented ? '#999' : 'white', fontSize: 16 }}>
          {data.label || 'Reasoning'}
        </div>
        {data.variant && (
          <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '2px' }}>
            {data.variant}
          </div>
        )}
        {data.providerModel && (
          <div style={{ 
            fontSize: '9px', 
            opacity: 0.9,
            maxWidth: '80px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            marginTop: '2px'
          }}>
            {data.providerModel}
          </div>
        )}
      </div>
      {data.isCommented && <span style={{ position: 'absolute', top: -8, right: -8, fontSize: '12px' }}>💬</span>}
    </div>
  );
};

export default ReasoningAgentNode;

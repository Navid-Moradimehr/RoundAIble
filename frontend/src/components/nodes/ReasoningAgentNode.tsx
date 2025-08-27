import React from 'react';
import { Handle, Position } from 'reactflow';

export type ReasoningAgentVariant = 'api' | 'huggingface' | 'local';

interface ReasoningAgentNodeProps {
  data: {
    label?: string;
    variant?: ReasoningAgentVariant;
    model?: string;
    hfModel?: string;
    localModel?: string;
    isCommented?: boolean;
    [key: string]: any;
  };
}

const ReasoningAgentNode: React.FC<ReasoningAgentNodeProps> = ({ data }) => {
  const getVariantColor = () => {
    switch (data.variant) {
      case 'api':
        return 'linear-gradient(135deg, #9c27b0 0%, #7b1fa2 100%)';
      case 'huggingface':
        return 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)';
      case 'local':
        return 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)';
      default:
        return 'linear-gradient(135deg, #9c27b0 0%, #7b1fa2 100%)';
    }
  };

  const getVariantBorder = () => {
    switch (data.variant) {
      case 'api':
        return '#6a1b9a';
      case 'huggingface':
        return '#e65100';
      case 'local':
        return '#2e7d32';
      default:
        return '#6a1b9a';
    }
  };

  const getVariantIcon = () => {
    switch (data.variant) {
      case 'api':
        return '🔌';
      case 'huggingface':
        return '🤗';
      case 'local':
        return '💻';
      default:
        return '🔌';
    }
  };

  return (
    <div style={{ 
      width: 140, 
      height: 80, 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      position: 'relative',
      opacity: data.isCommented ? 0.6 : 1
    }}>
      {/* Output Handle (Right) - Green diamond */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        style={{
          width: 14,
          height: 14,
          background: '#4caf50',
          border: '3px solid #fff',
          borderRadius: '2px',
          right: -7,
          top: '50%',
          transform: 'translateY(-50%) rotate(45deg)',
          zIndex: 10
        }}
      />
      
      <div style={{ 
        width: '100%', 
        height: '100%', 
        background: data.isCommented ? '#f5f5f5' : getVariantColor(),
        border: data.isCommented ? '2px dashed #999' : `2px solid ${getVariantBorder()}`,
        borderRadius: 10,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 'bold',
        color: data.isCommented ? '#999' : 'white',
        fontSize: 12,
        boxShadow: '0 3px 10px rgba(0,0,0,0.12)',
        textAlign: 'center',
        padding: '4px'
      }}>
        <div style={{ fontSize: '16px', marginBottom: '2px' }}>
          {getVariantIcon()}
        </div>
        <div style={{ fontSize: '11px', lineHeight: '1.2' }}>
          {data.label || 'Reasoning'}
        </div>
        <div style={{ fontSize: '9px', opacity: 0.8, marginTop: '2px' }}>
          {data.variant || 'api'}
        </div>
      </div>
      {data.isCommented && <span style={{ position: 'absolute', top: -8, right: -8, fontSize: '12px' }}>💬</span>}
    </div>
  );
};

export default ReasoningAgentNode; 
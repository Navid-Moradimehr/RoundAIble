import React from 'react';
import { Handle, Position } from 'reactflow';

interface RoundAIbleNodeProps {
  data: {
    label?: string;
    isCommented?: boolean;
    [key: string]: any;
  };
}

const RoundAIbleNode: React.FC<RoundAIbleNodeProps> = ({ data }) => {
  return (
    <div style={{ 
      width: 150, 
      height: 100, 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      position: 'relative',
      opacity: data.isCommented ? 0.6 : 1
    }}>
      {/* Input Handle (Left) - Blue circle */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        style={{
          width: 14,
          height: 14,
          background: '#2196f3',
          border: '3px solid #fff',
          borderRadius: '50%',
          left: -7,
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 10
        }}
      />
      
      {/* Reasoning Handle (Top) - Green diamond */}
      <Handle
        type="target"
        position={Position.Top}
        id="reasoning"
        style={{
          width: 14,
          height: 14,
          background: '#4caf50',
          border: '3px solid #fff',
          borderRadius: '2px',
          top: -7,
          left: '50%',
          transform: 'translateX(-50%) rotate(45deg)',
          zIndex: 10
        }}
      />
      
      {/* Critic Handle (Bottom) - Orange square */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="critic"
        style={{
          width: 14,
          height: 14,
          background: '#ff9800',
          border: '3px solid #fff',
          borderRadius: '2px',
          bottom: -7,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10
        }}
      />
      
      <div style={{ 
        width: '100%', 
        height: '100%', 
        background: data.isCommented ? '#f5f5f5' : 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
        border: data.isCommented ? '2px dashed #999' : '2px solid #0d47a1',
        borderRadius: 12,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 'bold',
        color: data.isCommented ? '#999' : 'white',
        fontSize: 16,
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        textAlign: 'center',
        padding: '8px'
      }}>
        {data.label || 'RoundAIble'}
      </div>
      {data.isCommented && <span style={{ position: 'absolute', top: -8, right: -8, fontSize: '12px' }}>💬</span>}
    </div>
  );
};

export default RoundAIbleNode; 
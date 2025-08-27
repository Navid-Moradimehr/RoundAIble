import React from 'react';
import { Handle, Position } from 'reactflow';

interface CriticNodeProps {
  data: {
    label?: string;
    variant?: string;
    model?: string;
    hfModel?: string;
    localModel?: string;
    isCommented?: boolean;
    [key: string]: any;
  };
}

const CriticNode: React.FC<CriticNodeProps> = ({ data }) => {
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
      {/* Input Handle (Top) - Orange square */}
      <Handle
        type="target"
        position={Position.Top}
        id="input"
        style={{
          width: 14,
          height: 14,
          background: '#ff9800',
          border: '3px solid #fff',
          borderRadius: '2px',
          top: -7,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10
        }}
      />
      
      <div style={{ 
        width: '100%', 
        height: '100%', 
        background: data.isCommented ? '#f5f5f5' : 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)',
        border: data.isCommented ? '2px dashed #999' : '2px solid #c62828',
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
          🔍
        </div>
        <div style={{ fontSize: '11px', lineHeight: '1.2' }}>
          {data.label || 'Critic'}
        </div>
        <div style={{ fontSize: '9px', opacity: 0.8, marginTop: '2px' }}>
          Review
        </div>
      </div>
      {data.isCommented && <span style={{ position: 'absolute', top: -8, right: -8, fontSize: '12px' }}>💬</span>}
    </div>
  );
};

export default CriticNode; 
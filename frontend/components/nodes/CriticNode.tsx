import React from 'react';
import { Handle, Position } from 'reactflow';

interface CriticNodeProps {
  data: {
    label?: string;
    variant?: string;
    providerModel?: string;
    isCommented?: boolean;
    [key: string]: any;
  };
}

const CriticNode: React.FC<CriticNodeProps> = ({ data }) => {
  return (
    <div style={{ 
      width: 110, 
      height: 95, 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      position: 'relative',
      opacity: data.isCommented ? 0.6 : 1
    }}>
      {/* Input Handle (Top) - Red circle to match RoundAIble's bottom port */}
      <Handle
        type="target"
        position={Position.Top}
        id="input"
        style={{
          width: 14,
          height: 14,
          background: '#f44336',
          border: '3px solid #fff',
          borderRadius: '50%',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10
        }}
      />
      
      <svg width="110" height="95" viewBox="0 0 110 95">
        <polygon
          points="55,5 105,27.5 105,67.5 55,90 5,67.5 5,27.5"
          fill={data.isCommented ? '#f5f5f5' : '#d1b3ff'}
          stroke={data.isCommented ? '#999' : '#7e57c2'}
          strokeWidth="4"
          strokeDasharray={data.isCommented ? '5,5' : 'none'}
        />
        <g transform="translate(35,35)">
          <text x="20" y="18" textAnchor="middle" fontSize="28" fill={data.isCommented ? '#999' : '#7e57c2'}>🎯</text>
        </g>
      </svg>
      <div style={{ 
        position: 'absolute', 
        fontWeight: 'bold', 
        color: data.isCommented ? '#999' : '#7e57c2', 
        fontSize: 12, 
        left: 0, 
        right: 0, 
        textAlign: 'center', 
        top: 60 
      }}>
        {data.label || 'Critic'}
        {data.variant && (
          <div style={{ fontSize: '9px', opacity: 0.8, marginTop: '2px' }}>
            {data.variant}
          </div>
        )}
      </div>
      {data.isCommented && <span style={{ position: 'absolute', top: -8, right: -8, fontSize: '12px' }}>💬</span>}
    </div>
  );
};

export default CriticNode;

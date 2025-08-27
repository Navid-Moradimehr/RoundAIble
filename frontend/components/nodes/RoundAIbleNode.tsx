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
    <div
      style={{
        width: 140,
        height: 140,
        borderRadius: '50%',
        background: data.isCommented ? '#f5f5f5' : 'radial-gradient(circle at 60% 40%, #e0c097 60%, #b08d57 100%)',
        border: data.isCommented ? '4px dashed #999' : '4px solid #8d5524',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 'bold',
        fontSize: 22,
        color: data.isCommented ? '#999' : '#4e2e0e',
        boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
        margin: 'auto',
        position: 'relative',
        opacity: data.isCommented ? 0.6 : 1
      }}
    >
      {/* Left port - for input nodes (blue circle) */}
      <Handle 
        type="target" 
        position={Position.Left} 
        id="input" 
        style={{ 
          width: 16,
          height: 16,
          background: '#2196f3',
          border: '3px solid #fff',
          borderRadius: '50%',
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 10
        }} 
      />
      
      {/* Top port - for reasoning agents (green circle) */}
      <Handle 
        type="target" 
        position={Position.Top} 
        id="reasoning" 
        style={{ 
          width: 16,
          height: 16,
          background: '#4caf50',
          border: '3px solid #fff',
          borderRadius: '50%',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10
        }} 
      />
      
      {/* Bottom port - for critic nodes (red circle) */}
      <Handle 
        type="source" 
        position={Position.Bottom} 
        id="critic" 
        style={{ 
          width: 16,
          height: 16,
          background: '#f44336',
          border: '3px solid #fff',
          borderRadius: '50%',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10
        }} 
      />
      
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '28px', marginBottom: '4px' }}>🔄</div>
        <div>{data.label || 'RoundAIble'}</div>
        <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '2px' }}>
          Multi-Agent System
        </div>
      </div>
      {data.isCommented && <span style={{ position: 'absolute', top: -8, right: -8, fontSize: '12px' }}>💬</span>}
    </div>
  );
};

export default RoundAIbleNode;

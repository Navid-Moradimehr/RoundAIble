import React from 'react';
import { Handle, Position } from 'reactflow';

interface InputNodeProps {
  data: {
    label?: string;
    inputType?: string;
    prompt?: string;
    existingCode?: string;
    modificationRequest?: string;
    errorMessage?: string;
    additionalContext?: string;
    rounds?: number;
    tagged?: string;
    knowCompetitors?: string;
    isCommented?: boolean;
    [key: string]: any;
  };
}

const InputNode: React.FC<InputNodeProps> = ({ data }) => {
  return (
    <div style={{ 
      width: 120, 
      height: 60, 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      position: 'relative',
      opacity: data.isCommented ? 0.6 : 1
    }}>
      {/* Output Handle (Right) - Blue circle to match RoundAIble's left port */}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        style={{
          width: 14,
          height: 14,
          background: '#2196f3',
          border: '3px solid #fff',
          borderRadius: '50%',
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 10
        }}
      />
      
      <div style={{ 
        width: '100%', 
        height: '100%', 
        background: data.isCommented ? '#f5f5f5' : 'linear-gradient(135deg, #4caf50 0%, #45a049 100%)',
        border: data.isCommented ? '2px dashed #999' : '2px solid #2e7d32',
        borderRadius: 8,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 'bold',
        color: data.isCommented ? '#999' : 'white',
        fontSize: 14,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        {data.label || 'Input'}
      </div>
      {data.isCommented && <span style={{ position: 'absolute', top: -8, right: -8, fontSize: '12px' }}>💬</span>}
    </div>
  );
};

export default InputNode; 
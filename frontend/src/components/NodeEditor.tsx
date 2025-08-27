import React, { useState, useCallback, useRef, useEffect } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Handle,
  Position,
} from "reactflow";
import type {
  Node,
  Edge as EdgeType,
  NodeMouseHandler,
  NodeChange,
  EdgeChange,
  NodeProps,
  Connection,
} from "reactflow";
import "reactflow/dist/style.css";
import InputNode from './nodes/InputNode';
import RoundAIbleNode from './nodes/RoundAIbleNode';
import ReasoningAgentNode from './nodes/ReasoningAgentNode';
import type { ReasoningAgentVariant } from './nodes/ReasoningAgentNode';
import CriticNode from './nodes/CriticNode';
import './NodeEditor.css'; // (Assume you have or will create a CSS file for layout)
import RoundaibleResultsPanel from './RoundaibleResultsPanel';
import JSZip from 'jszip';

// Backend communication utilities
const checkBackendHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch('http://localhost:4000/api/health', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response.ok;
  } catch (error) {
    console.error('Backend health check failed:', error);
    return false;
  }
};

// Port shape types for connection validation
type PortShape = 'diamond' | 'circle' | 'square' | 'pointer';

// Custom handle components with different shapes
const DiamondHandle = ({ position, type, id, style }: any) => {
  console.log('💎 DiamondHandle created:', { position, type, id });
  return (
    <Handle
      type={type}
      position={position}
      id={id}
      style={{
        ...style,
        width: 12,
        height: 12,
        background: '#1976d2',
        border: '2px solid #fff',
        transform: 'rotate(45deg)',
      }}
    />
  );
};

const CircleHandle = ({ position, type, id, style }: any) => {
  console.log('🔵 CircleHandle created:', { position, type, id });
  return (
    <Handle
      type={type}
      position={position}
      id={id}
      style={{
        ...style,
        width: 12,
        height: 12,
        background: '#4caf50',
        border: '2px solid #fff',
        borderRadius: '50%',
      }}
    />
  );
};

const SquareHandle = ({ position, type, id, style }: any) => {
  console.log('⬜ SquareHandle created:', { position, type, id });
  return (
    <Handle
      type={type}
      position={position}
      id={id}
      style={{
        ...style,
        width: 12,
        height: 12,
        background: '#ff9800',
        border: '2px solid #fff',
        borderRadius: '2px',
      }}
    />
  );
};

const PointerHandle = ({ position, type, id, style }: any) => {
  console.log('➡️ PointerHandle created:', { position, type, id });
  return (
    <Handle
      type={type}
      position={position}
      id={id}
      style={{
        ...style,
        width: 0,
        height: 0,
        background: 'transparent',
        border: '6px solid transparent',
        borderLeftColor: '#e91e63',
        borderRight: 'none',
        transform: 'translateX(3px)',
      }}
    />
  );
};

// Port validation function
const canConnect = (source: string, target: string, sourceHandle: string | null, targetHandle: string | null): boolean => {
  console.log('🔍 Connection validation:', { source, target, sourceHandle, targetHandle });
  
  // Extract node types from IDs
  const sourceType = source.split('_')[0];
  const targetType = target.split('_')[0];
  
    console.log('🔍 Node types:', { sourceType, targetType });
  console.log('🔍 Source starts with input_:', source.startsWith('input_'));
  console.log('🔍 Target starts with input_:', target.startsWith('input_'));
  console.log('🔍 Source starts with reason_:', source.startsWith('reason_'));
  console.log('🔍 Target starts with reason_:', target.startsWith('reason_'));
  console.log('🔍 Source starts with critic_:', source.startsWith('critic_'));
  console.log('🔍 Target starts with critic_:', target.startsWith('critic_'));
  console.log('🔍 Source starts with roundaible_:', source.startsWith('roundaible_'));
  console.log('🔍 Target starts with roundaible_:', target.startsWith('roundaible_'));
  
  // RoundAIble node has specific port rules
  if (sourceType === 'roundaible' || targetType === 'roundaible') {
    const roundaibleId = sourceType === 'roundaible' ? source : target;
    const otherId = sourceType === 'roundaible' ? target : source;
    const roundaibleHandle = sourceType === 'roundaible' ? sourceHandle : targetHandle;
    const otherHandle = sourceType === 'roundaible' ? targetHandle : sourceHandle;
    
    console.log('🔍 RoundAIble connection:', { roundaibleId, otherId, roundaibleHandle, otherHandle });
    console.log('🔍 RoundAIble handle check:', roundaibleHandle === 'input');
    console.log('🔍 Other ID starts with input_:', otherId.startsWith('input_'));
    
    // RoundAIble left port (input) - only connects to input nodes
    if (roundaibleHandle === 'input' && otherId.startsWith('input_')) {
      console.log('✅ Valid: Input → RoundAIble left (input)');
      return true;
    }
    
    // RoundAIble top port (reasoning) - only connects to reasoning agents
    if (roundaibleHandle === 'reasoning' && otherId.startsWith('reason_')) {
      console.log('✅ Valid: Reasoning Agent → RoundAIble top (reasoning)');
      return true;
    }
    
    // RoundAIble bottom port (critic) - only connects to critic nodes
    if (roundaibleHandle === 'critic' && otherId.startsWith('critic_')) {
      console.log('✅ Valid: RoundAIble bottom (critic) → Critic');
      return true;
    }
    
    console.log('❌ Invalid connection attempt - no matching rule');
    return false;
  }
  
  console.log('❌ No valid connection pattern found - not a RoundAIble connection');
  return false;
};

const outputResults = [
  {
    agent: 'GPT-4',
    codes: [
      { filename: 'main.py', content: 'print("Hello from GPT-4!")' },
      { filename: 'utils.py', content: '# Utility functions' },
    ],
    description: 'A Python solution using print.',
    score: 9.5,
  },
  {
    agent: 'Claude',
    codes: [
      { filename: 'main.py', content: 'print("Hello from Claude!")' }],
    description: 'A simple Python print.',
    score: 8.7,
  },
];
const liveChatMessages = [
  { sender: 'GPT-4', role: 'reasoning', content: 'Here is my code...', timestamp: '10:01:00' },
  { sender: 'Claude', role: 'reasoning', content: 'My approach is different...', timestamp: '10:01:05' },
  { sender: 'Critic 1', role: 'critic', content: 'GPT-4 code is modular.', timestamp: '10:01:10' },
  { sender: 'Critic 2', role: 'critic', content: 'Claude code is concise.', timestamp: '10:01:12' },
];

const initialNodes: Node[] = [
  { id: 'input_1', type: 'inputNode', position: { x: 0, y: 200 }, data: { label: 'Input Node' } },
  { id: 'roundaible_1', type: 'roundaibleNode', position: { x: 300, y: 200 }, data: {} },
  { id: 'reason_api_1', type: 'reasoningAgentNode', position: { x: 300, y: 0 }, data: { label: 'API Reasoning', variant: 'api' as ReasoningAgentVariant } },
  { id: 'reason_hf_1', type: 'reasoningAgentNode', position: { x: 500, y: 0 }, data: { label: 'HuggingFace Reasoning', variant: 'huggingface' as ReasoningAgentVariant } },
  { id: 'reason_local_1', type: 'reasoningAgentNode', position: { x: 400, y: 100 }, data: { label: 'Local Reasoning', variant: 'local' as ReasoningAgentVariant } },
  { id: 'critic_1', type: 'criticNode', position: { x: 300, y: 400 }, data: { label: 'Critic 1' } },
  { id: 'critic_2', type: 'criticNode', position: { x: 500, y: 400 }, data: { label: 'Critic 2' } },
];
const initialEdges: EdgeType[] = [
  { id: 'e1', source: 'input_1', target: 'roundaible_1', sourceHandle: 'output', targetHandle: 'input' },
  { id: 'e2', source: 'reason_api_1', target: 'roundaible_1', sourceHandle: 'output', targetHandle: 'reasoning' },
  { id: 'e3', source: 'reason_hf_1', target: 'roundaible_1', sourceHandle: 'output', targetHandle: 'reasoning' },
  { id: 'e4', source: 'reason_local_1', target: 'roundaible_1', sourceHandle: 'output', targetHandle: 'reasoning' },
  { id: 'e5', source: 'roundaible_1', target: 'critic_1', sourceHandle: 'critic', targetHandle: 'input' },
  { id: 'e6', source: 'roundaible_1', target: 'critic_2', sourceHandle: 'critic', targetHandle: 'input' },
];

// Node components with proper port system
// Use imported node components directly
const InputNodeComponent = InputNode;
const RoundAIbleNodeComponent = RoundAIbleNode;
const ReasoningAgentNodeComponent = ReasoningAgentNode;
const CriticNodeComponent = CriticNode;

const nodeTypes = {
  inputNode: InputNodeComponent,
  roundaibleNode: RoundAIbleNodeComponent,
  reasoningAgentNode: ReasoningAgentNodeComponent,
  criticNode: CriticNodeComponent,
};

// Type for node edit data
type NodeEditData = {
  label?: string;
  [key: string]: any;
};

// ErrorBoundary for modal content
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }
  componentDidCatch(error: any, info: any) {
    // Optionally log error
  }
  render() {
    if (this.state.hasError) {
      return <div style={{ color: 'red', fontWeight: 'bold' }}>Error: {this.state.error?.message || 'Something went wrong.'}</div>;
    }
    return this.props.children;
  }
}

// Render config UI for each node type
function renderNodeConfig(
  node: Node, 
  editData: NodeEditData, 
  setEditData: (d: NodeEditData) => void,
  apiKeyFunctions: {
    getProviderFromModel: (modelValue: string) => string;
    getApiKeysForProvider: (provider: string) => Array<{id: string, name: string, key: string}>;
    openApiKeyModal: (provider: string, editingKey?: {id: string, name: string, key: string}) => void;
    deleteApiKey: (provider: string, keyId: string) => void;
  }
) {
  if (!node) return null;
  const type = node.type;
  // All nodes with a label can edit their name
  const canEditLabel = type && ['inputNode', 'reasoningAgentNode', 'criticNode', 'roundaibleNode'].includes(type);
  // Ensure label is always a string for the input value
  return <>
    {canEditLabel && (
      <div className="mb-3">
        <label className="form-label">Node Name</label>
        <input
          className="form-control"
          value={String(editData.label ?? '')}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditData({ ...editData, label: e.target.value })}
        />
      </div>
    )}
    {/* Existing config fields below, per node type */}
    {type === 'inputNode' && <>
      <div className="mb-3">
        <label className="form-label">Input Type</label>
        <select 
          className="form-select" 
          value={editData.inputType || 'new-code'} 
          onChange={e => setEditData({ ...editData, inputType: e.target.value })}
        >
          <option value="new-code">🆕 New Code Request</option>
          <option value="modify-code">✏️ Code Modification</option>
          <option value="fix-bug">🐛 Bug Fix</option>
        </select>
      </div>
      
      {/* New Code Request Fields */}
      {editData.inputType === 'new-code' && (
        <div className="mb-3">
          <label className="form-label">Prompt</label>
          <textarea 
            className="form-control" 
            placeholder="Describe the code you want to create (e.g., 'Create a Python function to sort a list')"
            value={editData.prompt || ''} 
            onChange={e => setEditData({ ...editData, prompt: e.target.value })} 
          />
        </div>
      )}
      
      {/* Code Modification Fields */}
      {editData.inputType === 'modify-code' && (
        <>
          <div className="mb-3">
            <label className="form-label">Existing Code</label>
            <textarea 
              className="form-control" 
              placeholder="Paste your existing code here..."
              rows={6}
              value={editData.existingCode || ''} 
              onChange={e => setEditData({ ...editData, existingCode: e.target.value })} 
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Modification Request</label>
            <textarea 
              className="form-control" 
              placeholder="Describe what modifications you want (e.g., 'Add error handling', 'Optimize performance')"
              value={editData.modificationRequest || ''} 
              onChange={e => setEditData({ ...editData, modificationRequest: e.target.value })} 
            />
          </div>
        </>
      )}
      
      {/* Bug Fix Fields */}
      {editData.inputType === 'fix-bug' && (
        <>
          <div className="mb-3">
            <label className="form-label">Existing Code</label>
            <textarea 
              className="form-control" 
              placeholder="Paste your code with the bug here..."
              rows={6}
              value={editData.existingCode || ''} 
              onChange={e => setEditData({ ...editData, existingCode: e.target.value })} 
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Error Message</label>
            <textarea 
              className="form-control" 
              placeholder="Paste the error message you're getting..."
              value={editData.errorMessage || ''} 
              onChange={e => setEditData({ ...editData, errorMessage: e.target.value })} 
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Additional Context (Optional)</label>
            <textarea 
              className="form-control" 
              placeholder="Any additional context about the bug or expected behavior..."
              value={editData.additionalContext || ''} 
              onChange={e => setEditData({ ...editData, additionalContext: e.target.value })} 
            />
          </div>
        </>
      )}
      
      {/* Common Fields for All Types */}
      <div className="mb-3">
        <label className="form-label">Reasoning Rounds</label>
        <input 
          type="number" 
          min={1} 
          max={5} 
          className="form-control" 
          value={editData.rounds || 1} 
          onChange={e => setEditData({ ...editData, rounds: Number(e.target.value) })} 
        />
      </div>
      <div className="mb-3">
        <label className="form-label">Tag Code Origins?</label>
        <select className="form-select" value={editData.tagged || 'No'} onChange={e => setEditData({ ...editData, tagged: e.target.value })}>
          <option>No</option>
          <option>Yes</option>
        </select>
      </div>
      <div className="mb-3">
        <label className="form-label">Should Agents Know Competitors?</label>
        <select className="form-select" value={editData.knowCompetitors || 'No'} onChange={e => setEditData({ ...editData, knowCompetitors: e.target.value })}>
          <option>No</option>
          <option>Yes</option>
        </select>
      </div>
    </>}
    {type === 'reasoningAgentNode' && (() => {
      // Determine variant: 'api', 'huggingface', or 'local'
      const variant = node.data?.variant || 'api';
      if (variant === 'api') {
        return <>
          <div className="mb-3">
            <label className="form-label">LLM Provider & Model</label>
            <select className="form-select" value={editData.providerModel || ''} onChange={e => setEditData({ ...editData, providerModel: e.target.value })}>
              <optgroup label="OpenAI">
                
                <option value="openai:gpt-4o-mini">GPT-4o Mini</option>
                <option value="openai:gpt-4o">GPT-4o</option>
                <option value="openai:gpt-4">GPT-4</option>
                <option value="openai:gpt-3.5-turbo">GPT-3.5 Turbo</option>
              </optgroup>
              <optgroup label="Anthropic">
                <option value="anthropic:claude-3">Claude 3</option>
                <option value="anthropic:claude-2">Claude 2</option>
              </optgroup>
              <optgroup label="Google">
                <option value="google:gemini-1.5">Gemini 1.5</option>
                <option value="google:gemini-1.0">Gemini 1.0</option>
                <option value="google:gemini-pro">Gemini Pro</option>
                <option value="google:gemini-flash">Gemini Flash</option>
              </optgroup>
              <optgroup label="Grok">
                <option value="grok:grok-1">Grok-1</option>
                <option value="grok:grok-3">Grok-3</option>
                <option value="grok:grok-3-mini">Grok-3-mini</option>
              </optgroup>
              <optgroup label="Perplexity">
                <option value="perplexity:online">Perplexity (Online)</option>
              </optgroup>
              <optgroup label="Qwen">
                <option value="qwen:qwen-1.5">Qwen 1.5</option>
              </optgroup>
              <optgroup label="Deepseek">
                <option value="deepseek:deepseek-coder">Deepseek Coder</option>
              </optgroup>
            </select>
          </div>
          <div className="mb-3">
            <label className="form-label">API Key</label>
            <select 
              className="form-select" 
              value={editData.apiKeyId || ''} 
              onChange={e => setEditData({ ...editData, apiKeyId: e.target.value })}
            >
              <option value="">Select API Key</option>
              <option value="add_new">➕ Add New API Key</option>
              {(() => {
                const provider = String(apiKeyFunctions.getProviderFromModel(editData.providerModel ?? 'openai') ?? 'openai');
                const providerKeys = apiKeyFunctions.getApiKeysForProvider(provider);
                return providerKeys.map((key: {id: string, name: string, key: string}) => (
                  <option key={key.id} value={key.id}>
                    🔑 {key.name}
                  </option>
                ));
              })()}
            </select>
            {editData.apiKeyId === 'add_new' && (
              <button 
                type="button"
                className="btn btn-primary btn-sm mt-2"
                onClick={() => {
                  const provider = String(apiKeyFunctions.getProviderFromModel(editData.providerModel ?? 'openai') ?? 'openai');
                  apiKeyFunctions.openApiKeyModal(provider);
                  setEditData({ ...editData, apiKeyId: '' });
                }}
              >
                Open API Key Manager
              </button>
            )}
            {editData.apiKeyId && editData.apiKeyId !== 'add_new' && (() => {
              const provider = String(apiKeyFunctions.getProviderFromModel(editData.providerModel ?? 'openai') ?? 'openai');
              const providerKeys = apiKeyFunctions.getApiKeysForProvider(provider);
              const selectedKey = providerKeys.find((k: {id: string, name: string, key: string}) => k.id === editData.apiKeyId);
              return selectedKey ? (
                <div className="mt-2 d-flex align-items-center gap-2">
                  <span className="text-muted small">
                    Selected: {selectedKey.name} ({'•'.repeat(8)})
                  </span>
                  <button 
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => apiKeyFunctions.openApiKeyModal(provider, { ...selectedKey, id: String(selectedKey.id ?? '') })}
                  >
                    ✏️ Edit
                  </button>
                  <button 
                    type="button"
                    className="btn btn-outline-danger btn-sm"
                    onClick={() => apiKeyFunctions.deleteApiKey(provider, String(selectedKey.id ?? ''))}
                  >
                    🗑️ Delete
                  </button>
                </div>
              ) : null;
            })()}
          </div>
          <div className="mb-3">
            <label className="form-label">Temperature</label>
            <input type="number" min={0} max={1} step={0.01} className="form-control" value={editData.temperature ?? 0.7} onChange={e => setEditData({ ...editData, temperature: Number(e.target.value) })} />
          </div>
          <div className="mb-3">
            <label className="form-label">Timeout (seconds)</label>
            <input type="number" min={60} className="form-control" value={editData.timeout || 60} onChange={e => setEditData({ ...editData, timeout: Number(e.target.value) })} />
          </div>
          <div className="mb-3">
            <label className="form-label">Model Name (optional)</label>
            <input className="form-control" value={editData.modelName || ''} onChange={e => setEditData({ ...editData, modelName: e.target.value })} />
          </div>
        </>;
      } else if (variant === 'huggingface') {
        return <>
          <div className="mb-3">
            <label className="form-label">HuggingFace Model</label>
            <select className="form-select" value={editData.hfModel || ''} onChange={e => setEditData({ ...editData, hfModel: e.target.value })}>
              {/* Only open-source, non-restricted models */}
              <option value="mistralai/Mistral-7B-v0.3">Mistral 7B</option>
              <option value="mistralai/Mixtral-8x7B-v0.1">Mixtral 8x7B</option>
              <option value="bigscience/bloom">Bloom 176B</option>
              <option value="google/gemma-7b">Gemma 7B</option>
              <option value="deepseek-ai/deepseek-coder-6.7b-base">DeepSeek Coder 6.7B</option>
              <option value="deepseek-ai/deepseek-coder-33b-base">DeepSeek Coder 33B</option>
              <option value="Qwen/Qwen1.5-7B">Qwen1.5 7B</option>
              <option value="Qwen/Qwen1.5-14B">Qwen1.5 14B</option>
              <option value="OpenThinker/OpenThinker-32B">OpenThinker 32B</option>
              <option value="Qwen/Qwen1.5-72B">Qwen1.5 72B</option>
              <option value="mistralai/Mixtral-8x22B">Mixtral 8x22B</option>
              {/* Add more open models as needed */}
            </select>
          </div>
          <div className="mb-3">
            <label className="form-label">HuggingFace API Key</label>
            <input type="password" className="form-control" value={editData.hfApiKey || ''} onChange={e => setEditData({ ...editData, hfApiKey: e.target.value })} />
          </div>
          <div className="mb-3">
            <label className="form-label">Temperature</label>
            <input type="number" min={0} max={1} step={0.01} className="form-control" value={editData.temperature ?? 0.7} onChange={e => setEditData({ ...editData, temperature: Number(e.target.value) })} />
          </div>
          <div className="mb-3">
            <label className="form-label">Timeout (seconds)</label>
            <input type="number" min={60} className="form-control" value={editData.timeout || 60} onChange={e => setEditData({ ...editData, timeout: Number(e.target.value) })} />
          </div>
        </>;
      } else if (variant === 'local') {
        return <>
          <div className="mb-3">
            <label className="form-label">Ollama Model</label>
            <select className="form-select" value={editData.localModel || ''} onChange={e => setEditData({ ...editData, localModel: e.target.value })}>
              <option value="qwen3:4b">Qwen3 4B</option>
              <option value="qwen3:8b">Qwen3 8B</option>
              <option value="qwen3:14b">Qwen3 14B</option>
              <option value="qwen3:30b-a3b">Qwen3 30B (MoE)</option>
              <option value="qwen3:32b">Qwen3 32B</option>
              <option value="gemma3n:e4b">Gemma 3n E4B</option>
              <option value="gemma3:4b">Gemma3 4B</option>
              <option value="gemma3:8b">Gemma3 8B</option>
              <option value="gemma3:12b">Gemma3 12B</option>
              <option value="deepseek-coder:6.7b">DeepSeek Coder 6.7B</option>
              <option value="deepseek-coder:33b">DeepSeek Coder 33B</option>
              <option value="mistral:7b">Mistral 7B</option>
              <option value="mistral:8x7b">Mixtral 8x7B</option>
              <option value="openthinker2:32b">OpenThinker2 32B</option>
              <option value="qwen2.5:14b">Qwen2.5 14B</option>
            </select>
          </div>
          <div className="mb-3">
            <label className="form-label">Model Name (optional)</label>
            <input className="form-control" value={editData.modelName || ''} onChange={e => setEditData({ ...editData, modelName: e.target.value })} />
          </div>
          <div className="mb-3">
            <label className="form-label">Temperature</label>
            <input type="number" min={0} max={1} step={0.01} className="form-control" value={editData.temperature ?? 0.7} onChange={e => setEditData({ ...editData, temperature: Number(e.target.value) })} />
          </div>
          <div className="mb-3">
            <label className="form-label">Timeout (seconds)</label>
            <input type="number" min={60} className="form-control" value={editData.timeout || 60} onChange={e => setEditData({ ...editData, timeout: Number(e.target.value) })} />
          </div>
        </>;
      }
      return null;
    })()}
    {type === 'criticNode' && (() => {
      // Determine variant: 'api', 'huggingface', or 'local'
      const variant = node.data?.variant || 'api';
      
      if (variant === 'api') {
        return <>
          <div className="mb-3">
            <label className="form-label">LLM Provider & Model</label>
            <select className="form-select" value={editData.providerModel || ''} onChange={e => setEditData({ ...editData, providerModel: e.target.value })}>
              <optgroup label="OpenAI">
                
                <option value="openai:gpt-4o-mini">GPT-4o Mini</option>
                <option value="openai:gpt-4o">GPT-4o</option>
                <option value="openai:gpt-4">GPT-4</option>
                <option value="openai:gpt-3.5-turbo">GPT-3.5 Turbo</option>
              </optgroup>
              <optgroup label="Anthropic">
                <option value="anthropic:claude-3">Claude 3</option>
                <option value="anthropic:claude-2">Claude 2</option>
              </optgroup>
              <optgroup label="Google">
                <option value="google:gemini-1.5">Gemini 1.5</option>
                <option value="google:gemini-1.0">Gemini 1.0</option>
                <option value="google:gemini-pro">Gemini Pro</option>
                <option value="google:gemini-flash">Gemini Flash</option>
              </optgroup>
              <optgroup label="Grok">
                <option value="grok:grok-1">Grok-1</option>
                <option value="grok:grok-3">Grok-3</option>
                <option value="grok:grok-3-mini">Grok-3-mini</option>
              </optgroup>
              <optgroup label="Perplexity">
                <option value="perplexity:online">Perplexity (Online)</option>
              </optgroup>
              <optgroup label="Qwen">
                <option value="qwen:qwen-1.5">Qwen 1.5</option>
              </optgroup>
              <optgroup label="Deepseek">
                <option value="deepseek:deepseek-coder">Deepseek Coder</option>
              </optgroup>
            </select>
          </div>
          <div className="mb-3">
            <label className="form-label">API Key</label>
            <select 
              className="form-select" 
              value={editData.apiKeyId || ''} 
              onChange={e => setEditData({ ...editData, apiKeyId: e.target.value })}
            >
              <option value="">Select API Key</option>
              <option value="add_new">➕ Add New API Key</option>
              {(() => {
                const provider = String(apiKeyFunctions.getProviderFromModel(editData.providerModel ?? 'openai') ?? 'openai');
                const providerKeys = apiKeyFunctions.getApiKeysForProvider(provider);
                return providerKeys.map((key: {id: string, name: string, key: string}) => (
                  <option key={key.id} value={key.id}>
                    🔑 {key.name}
                  </option>
                ));
              })()}
            </select>
            {editData.apiKeyId === 'add_new' && (
              <button 
                type="button"
                className="btn btn-primary btn-sm mt-2"
                onClick={() => {
                  const provider = String(apiKeyFunctions.getProviderFromModel(editData.providerModel ?? 'openai') ?? 'openai');
                  apiKeyFunctions.openApiKeyModal(provider);
                  setEditData({ ...editData, apiKeyId: '' });
                }}
              >
                Open API Key Manager
              </button>
            )}
            {editData.apiKeyId && editData.apiKeyId !== 'add_new' && (() => {
              const provider = String(apiKeyFunctions.getProviderFromModel(editData.providerModel ?? 'openai') ?? 'openai');
              const providerKeys = apiKeyFunctions.getApiKeysForProvider(provider);
              const selectedKey = providerKeys.find((k: {id: string, name: string, key: string}) => k.id === editData.apiKeyId);
              return selectedKey ? (
                <div className="mt-2 d-flex align-items-center gap-2">
                  <span className="text-muted small">
                    Selected: {selectedKey.name} ({'•'.repeat(8)})
                  </span>
                  <button 
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => apiKeyFunctions.openApiKeyModal(provider, { ...selectedKey, id: String(selectedKey.id ?? '') })}
                  >
                    ✏️ Edit
                  </button>
                  <button 
                    type="button"
                    className="btn btn-outline-danger btn-sm"
                    onClick={() => apiKeyFunctions.deleteApiKey(provider, String(selectedKey.id ?? ''))}
                  >
                    🗑️ Delete
                  </button>
                </div>
              ) : null;
            })()}
          </div>
          <div className="mb-3">
            <label className="form-label">Temperature</label>
            <input type="number" min={0} max={1} step={0.01} className="form-control" value={editData.temperature ?? 0.7} onChange={e => setEditData({ ...editData, temperature: Number(e.target.value) })} />
          </div>
          <div className="mb-3">
            <label className="form-label">Timeout (seconds)</label>
            <input type="number" min={60} className="form-control" value={editData.timeout || 60} onChange={e => setEditData({ ...editData, timeout: Number(e.target.value) })} />
          </div>
          <div className="mb-3">
            <label className="form-label">Model Name (optional)</label>
            <input className="form-control" value={editData.modelName || ''} onChange={e => setEditData({ ...editData, modelName: e.target.value })} />
          </div>
        </>;
      } else if (variant === 'huggingface') {
        return <>
          <div className="mb-3">
            <label className="form-label">HuggingFace Model</label>
            <select className="form-select" value={editData.hfModel || ''} onChange={e => setEditData({ ...editData, hfModel: e.target.value })}>
              {/* Only open-source, non-restricted models */}
              <option value="mistralai/Mistral-7B-v0.3">Mistral 7B</option>
              <option value="mistralai/Mixtral-8x7B-v0.1">Mixtral 8x7B</option>
              <option value="bigscience/bloom">Bloom 176B</option>
              <option value="google/gemma-7b">Gemma 7B</option>
              <option value="deepseek-ai/deepseek-coder-6.7b-base">DeepSeek Coder 6.7B</option>
              <option value="deepseek-ai/deepseek-coder-33b-base">DeepSeek Coder 33B</option>
              <option value="Qwen/Qwen1.5-7B">Qwen1.5 7B</option>
              <option value="Qwen/Qwen1.5-14B">Qwen1.5 14B</option>
              <option value="OpenThinker/OpenThinker-32B">OpenThinker 32B</option>
              <option value="Qwen/Qwen1.5-72B">Qwen1.5 72B</option>
              <option value="mistralai/Mixtral-8x22B">Mixtral 8x22B</option>
              {/* Add more open models as needed */}
            </select>
          </div>
          <div className="mb-3">
            <label className="form-label">HuggingFace API Key</label>
            <input type="password" className="form-control" value={editData.hfApiKey || ''} onChange={e => setEditData({ ...editData, hfApiKey: e.target.value })} />
          </div>
          <div className="mb-3">
            <label className="form-label">Temperature</label>
            <input type="number" min={0} max={1} step={0.01} className="form-control" value={editData.temperature ?? 0.7} onChange={e => setEditData({ ...editData, temperature: Number(e.target.value) })} />
          </div>
          <div className="mb-3">
            <label className="form-label">Timeout (seconds)</label>
            <input type="number" min={60} className="form-control" value={editData.timeout || 60} onChange={e => setEditData({ ...editData, timeout: Number(e.target.value) })} />
          </div>
        </>;
      } else if (variant === 'local') {
        return <>
          <div className="mb-3">
            <label className="form-label">Ollama Model</label>
            <select className="form-select" value={editData.localModel || ''} onChange={e => setEditData({ ...editData, localModel: e.target.value })}>
              <option value="qwen3:4b">Qwen3 4B</option>
              <option value="qwen3:8b">Qwen3 8B</option>
              <option value="qwen3:14b">Qwen3 14B</option>
              <option value="qwen3:30b-a3b">Qwen3 30B (MoE)</option>
              <option value="qwen3:32b">Qwen3 32B</option>
              <option value="gemma3n:e4b">Gemma 3n E4B</option>
              <option value="gemma3:4b">Gemma3 4B</option>
              <option value="gemma3:8b">Gemma3 8B</option>
              <option value="gemma3:12b">Gemma3 12B</option>
              <option value="deepseek-coder:6.7b">DeepSeek Coder 6.7B</option>
              <option value="deepseek-coder:33b">DeepSeek Coder 33B</option>
              <option value="mistral:7b">Mistral 7B</option>
              <option value="mistral:8x7b">Mixtral 8x7B</option>
              <option value="openthinker2:32b">OpenThinker2 32B</option>
              <option value="qwen2.5:14b">Qwen2.5 14B</option>
            </select>
          </div>
          <div className="mb-3">
            <label className="form-label">Model Name (optional)</label>
            <input className="form-control" value={editData.modelName || ''} onChange={e => setEditData({ ...editData, modelName: e.target.value })} />
          </div>
          <div className="mb-3">
            <label className="form-label">Temperature</label>
            <input type="number" min={0} max={1} step={0.01} className="form-control" value={editData.temperature ?? 0.7} onChange={e => setEditData({ ...editData, temperature: Number(e.target.value) })} />
          </div>
          <div className="mb-3">
            <label className="form-label">Timeout (seconds)</label>
            <input type="number" min={60} className="form-control" value={editData.timeout || 60} onChange={e => setEditData({ ...editData, timeout: Number(e.target.value) })} />
          </div>
        </>;
      }
      return null;
    })()}
    {type === 'outputNode' && <></>}
    {type === 'liveChatNode' && <></>}
    {type === 'roundaibleNode' && <div className="text-muted">No configuration needed for RoundAIble Node.</div>}
    {type && !['inputNode', 'reasoningAgentNode', 'criticNode', 'outputNode', 'liveChatNode', 'roundaibleNode'].includes(type) && <div className="text-muted">No configuration available for this node.</div>}
  </>;
}

export default function NodeEditor() {
  // Add CSS animation for running state
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0% { opacity: 1; }
        50% { opacity: 0.7; }
        100% { opacity: 1; }
      }
    `;
    document.head.appendChild(style);
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);

  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<EdgeType[]>(initialEdges);
  const [modalNodeId, setModalNodeId] = useState<string | null>(null);
  const [editData, setEditData] = useState<NodeEditData>({});

  // API Key Management State
  const [apiKeys, setApiKeys] = useState<{[provider: string]: Array<{id: string, name: string, key: string}>}>({});
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKeyModalData, setApiKeyModalData] = useState<{
    provider: string;
    keyName: string;
    keyValue: string;
    isEditing: boolean;
    editingId?: string;
  }>({
    provider: '',
    keyName: '',
    keyValue: '',
    isEditing: false
  });

  // Workflow management state
  const [workflows, setWorkflows] = useState<Array<{
    id: string;
    name: string;
    nodes: Node[];
    edges: EdgeType[];
    isActive: boolean;
  }>>([
    {
      id: 'workflow_1',
      name: 'Default Workflow',
      nodes: initialNodes,
      edges: initialEdges,
      isActive: true
    }
  ]);
  const [activeWorkflowId, setActiveWorkflowId] = useState<string>('workflow_1');

  // Node commenting state
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [contextMenuPosition, setContextMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const [contextMenuNodeId, setContextMenuNodeId] = useState<string | null>(null);

  const [roundaibleResult, setRoundaibleResult] = useState<any>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Add state for error messages
  const [backendErrors, setBackendErrors] = useState<string[]>([]);

  // Add state for selected node highlighting
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Add state for workflow execution status
  const [isWorkflowRunning, setIsWorkflowRunning] = useState<boolean>(false);

  // Backend connection state
  const [backendStatus, setBackendStatus] = useState<string>('checking');
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);

  // Copy/paste state
  const [copiedNode, setCopiedNode] = useState<Node | null>(null);
  const [pasteOffset, setPasteOffset] = useState({ x: 20, y: 20 });
  
  // Multi-select functionality (simplified - just for visual feedback)
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set());

  // Undo/redo state
  const [history, setHistory] = useState<Array<{ nodes: Node[]; edges: EdgeType[] }>>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isUndoRedoAction, setIsUndoRedoAction] = useState(false);

  // Initialize history with current state
  useEffect(() => {
    if (history.length === 0) {
      setHistory([{ nodes: [...nodes], edges: [...edges] }]);
      setHistoryIndex(0);
    }
  }, []); // Only run once on mount

  // Backend connection functions
  const checkBackendConnection = async () => {
    try {
      const isConnected = await checkBackendHealth();
      setIsBackendConnected(isConnected);
      setBackendStatus(isConnected ? 'connected' : 'disconnected');
      console.log('🔗 Backend connection status:', isConnected);
    } catch (error) {
      console.error('❌ Error checking backend connection:', error);
      setIsBackendConnected(false);
      setBackendStatus('error');
    }
  };

  const getBackendStatus = async () => {
    try {
      const response = await fetch('http://localhost:4000/api/health');
      if (response.ok) {
        const status = await response.text();
        console.log('🔗 Backend status:', status);
        return status;
      } else {
        return 'Backend is not responding properly';
      }
    } catch (error) {
      console.error('❌ Error getting backend status:', error);
      return 'Backend is not available. Please start the backend server first.';
    }
  };

  // Check backend connection on component mount
  useEffect(() => {
    checkBackendConnection();
    
    // Check connection every 30 seconds
    const interval = setInterval(checkBackendConnection, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Save current state to history
  const saveToHistory = useCallback(() => {
    if (isUndoRedoAction) {
      setIsUndoRedoAction(false);
      return;
    }
    
    const currentState = { nodes: [...nodes], edges: [...edges] };
    
    // Remove any future history if we're not at the end
    const newHistory = history.slice(0, historyIndex + 1);
    
    // Add current state to history
    setHistory([...newHistory, currentState]);
    setHistoryIndex(newHistory.length);
    
    // Limit history to 50 states to prevent memory issues
    if (newHistory.length >= 50) {
      setHistory(prev => prev.slice(1));
      setHistoryIndex(prev => prev - 1);
    }
  }, [nodes, edges, history, historyIndex, isUndoRedoAction]);

  // Undo function
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setIsUndoRedoAction(true);
      const previousState = history[historyIndex - 1];
      setNodes(previousState.nodes);
      setEdges(previousState.edges);
      setHistoryIndex(historyIndex - 1);
      console.log('↶ Undo performed');
    }
  }, [history, historyIndex]);

  // Redo function
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setIsUndoRedoAction(true);
      const nextState = history[historyIndex + 1];
      setNodes(nextState.nodes);
      setEdges(nextState.edges);
      setHistoryIndex(historyIndex + 1);
      console.log('↷ Redo performed');
    }
  }, [history, historyIndex]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((nds) => applyNodeChanges(changes, nds));
      // Save to history after node changes
      setTimeout(() => saveToHistory(), 0);
    },
    [saveToHistory]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges((eds) => applyEdgeChanges(changes, eds));
      // Save to history after edge changes
      setTimeout(() => saveToHistory(), 0);
    },
    [saveToHistory]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      console.log('🔌 Connection attempt:', connection);
      console.log('🔌 Connection details:', {
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
        sourceHandleId: connection.sourceHandle,
        targetHandleId: connection.targetHandle
      });
      
      if (connection.source && connection.target) {
        const canConnectNodes = canConnect(
          connection.source,
          connection.target,
          connection.sourceHandle,
          connection.targetHandle
        );
        
        console.log('🔌 Validation result:', canConnectNodes);
        
        if (canConnectNodes) {
          console.log('✅ Connection allowed, adding edge');
          setEdges((eds) => addEdge(connection, eds));
          setConnectionError(null);
        } else {
          console.log('❌ Connection not allowed between these nodes/ports');
          setConnectionError('❌ This connection is not allowed. Check the port shapes and connection rules.');
        }
      } else {
        console.log('❌ Missing source or target in connection');
      }
    },
    []
  );

  const onConnectStart = useCallback((event: any, params: any) => {
    console.log('🔌 Connect start:', params);
  }, []);

  const onConnectEnd = useCallback((event: any) => {
    console.log('🔌 Connect end:', event);
  }, []);

  const onNodeClick: NodeMouseHandler = useCallback((event, node) => {
    setSelectedNodeId(node.id);
    console.log("Node clicked:", node.id);
  }, []);

  const onNodeDoubleClick: NodeMouseHandler = useCallback((event, node) => {
    setModalNodeId(node.id);
    
    // Initialize editData with defaults
    let initialData = node.data || {};
    
    if (node.type === 'inputNode' && !initialData.inputType) {
      initialData = { ...initialData, inputType: 'new-code' };
    }
    
    // Set defaults for critic and reasoning nodes
    if ((node.type === 'criticNode' || node.type === 'reasoningAgentNode')) {
      if (!initialData.variant) {
        initialData.variant = 'api';
      }
      
      if (initialData.variant === 'api' && !initialData.providerModel) {
        initialData.providerModel = 'openai:gpt-4o-mini';
      } else if (initialData.variant === 'huggingface' && !initialData.hfModel) {
        initialData.hfModel = 'mistralai/Mistral-7B-v0.3';
      } else if (initialData.variant === 'local' && !initialData.localModel) {
        initialData.localModel = 'gemma3:4b';
      }
    }
    
    setEditData(initialData);
  }, []);

  const onNodeMouseEnter: NodeMouseHandler = useCallback((event, node) => {
    setHoveredNodeId(node.id);
  }, []);

  const onNodeMouseLeave: NodeMouseHandler = useCallback((event, node) => {
    setHoveredNodeId(null);
  }, []);

  const onNodeContextMenu: NodeMouseHandler = useCallback((event, node) => {
    event.preventDefault();
    setContextMenuPosition({ x: event.clientX, y: event.clientY });
    setContextMenuNodeId(node.id);
  }, []);

  // Keyboard event handlers for copy/paste
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Check if user is in an input field, textarea, or contenteditable element
    const target = event.target as HTMLElement;
    const isInInputField = target.tagName === 'INPUT' || 
                          target.tagName === 'TEXTAREA' || 
                          target.contentEditable === 'true' ||
                          target.closest('input, textarea, [contenteditable]');
    
    if (isInInputField) {
      // Don't interfere with normal text input operations
      return;
    }
    
    if (event.ctrlKey || event.metaKey) {
      if (event.key === 'c' && selectedNodeId) {
        event.preventDefault();
        const nodeToCopy = nodes.find(n => n.id === selectedNodeId);
        if (nodeToCopy) {
          setCopiedNode({ ...nodeToCopy });
          console.log('📋 Node copied:', nodeToCopy.id);
        }
      } else if (event.key === 'v' && copiedNode) {
        event.preventDefault();
        
        // Generate proper ID with prefix
        const idPrefix = copiedNode.type === 'inputNode' ? 'input' : 
                        copiedNode.type === 'reasoningAgentNode' ? 'reason' :
                        copiedNode.type === 'criticNode' ? 'critic' :
                        copiedNode.type === 'roundaibleNode' ? 'roundaible' : copiedNode.type;
        
        // Generate unique name
        const baseName = copiedNode.data?.label || copiedNode.type;
        const existingNames = nodes.map(n => n.data?.label).filter(Boolean);
        let uniqueName = baseName;
        let counter = 1;
        while (existingNames.includes(uniqueName)) {
          uniqueName = `${baseName} ${counter}`;
          counter++;
        }
        
        const newNode = {
          ...copiedNode,
          id: `${idPrefix}_${Date.now()}`,
          position: {
            x: copiedNode.position.x + pasteOffset.x,
            y: copiedNode.position.y + pasteOffset.y
          },
          data: { 
            ...copiedNode.data,
            label: uniqueName
          }
        };
        setNodes(nds => [...nds, newNode]);
        setSelectedNodeId(newNode.id);
        setPasteOffset(prev => ({ x: prev.x + 20, y: prev.y + 20 }));
        console.log('📋 Node pasted:', newNode.id, 'with name:', uniqueName);
      } else if (event.key === 'z') {
        event.preventDefault();
        undo();
      } else if (event.key === 'y') {
        event.preventDefault();
        redo();
      }
    } else if (event.key === 'Escape') {
      setSelectedNodeId(null);
      setSelectedNodes(new Set());
    }
  }, [selectedNodeId, copiedNode, pasteOffset, nodes, setNodes, undo, redo]);

  // Add keyboard event listeners
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Find the node to show in modal
  const modalNode = nodes.find(n => n.id === modalNodeId);

  // Save config changes
  function saveNodeConfig(id: string | null) {
    if (!id) return;
    
    // Check for duplicate node names
    if (editData.label && isNodeNameExists(editData.label, id)) {
      alert(`❌ A node with the name "${editData.label}" already exists. Please choose a different name.`);
      return;
    }

    // Ensure criticNode and reasoningAgentNode always have correct variant and providerModel
    const node = nodes.find(n => n.id === id);
    let newData = { ...editData };
    if (node && (node.type === 'criticNode' || node.type === 'reasoningAgentNode')) {
      if (editData.providerModel || newData.variant === 'api') {
        newData.variant = 'api';
        newData.providerModel = editData.providerModel || newData.providerModel || 'openai:gpt-4o-mini';
      } else if (editData.hfModel || newData.variant === 'huggingface') {
        newData.variant = 'huggingface';
        newData.hfModel = editData.hfModel || newData.hfModel || 'mistralai/Mistral-7B-v0.3';
      } else if (editData.localModel || newData.variant === 'local') {
        newData.variant = 'local';
        newData.localModel = editData.localModel || newData.localModel || 'gemma3:4b';
      }
    }
    setNodes(nds => nds.map(n => n.id === id ? { ...n, data: newData } : n));
    setModalNodeId(null);
  }

  // Helper to get next available number for a node type
  const getNextNodeNumber = (type: string, variant?: string) => {
    const existing = nodes.filter(n => n.type === type);
    
    if (type === 'criticNode' || type === 'reasoningAgentNode') {
      // For critic and reasoning nodes, count by variant
      const existingSameVariant = existing.filter(n => n.data.variant === variant);
      return existingSameVariant.length + 1;
    }
    
    // For other nodes, count all of the same type
    return existing.length + 1;
  };

  // Helper to check if a node name already exists
  const isNodeNameExists = (name: string, excludeNodeId?: string) => {
    return nodes.some(n => 
      n.data.label === name && 
      (!excludeNodeId || n.id !== excludeNodeId)
    );
  };

  // Helper to generate a unique node name
  const generateUniqueNodeName = (type: string, variant?: string, baseName: string = '') => {
    let label = baseName;
    
    if (!label) {
      if (type === 'criticNode') {
        const variantName = variant === 'api' ? 'API' : variant === 'huggingface' ? 'HuggingFace' : 'Local';
        label = `Critic (${variantName})`;
      } else if (type === 'reasoningAgentNode') {
        const variantName = variant === 'api' ? 'API' : variant === 'huggingface' ? 'HuggingFace' : 'Local';
        label = `Reasoning (${variantName})`;
      } else if (type === 'inputNode') {
        label = 'Input Node';
      } else if (type === 'roundaibleNode') {
        label = 'RoundAIble';
      }
    }
    
    // Check if the base name already exists
    if (!isNodeNameExists(label)) {
      return label;
    }
    
    // Add numbering to make it unique
    let counter = 1;
    let uniqueName = `${label} ${counter}`;
    
    while (isNodeNameExists(uniqueName)) {
      counter++;
      uniqueName = `${label} ${counter}`;
    }
    
    return uniqueName;
  };

  const addNode = (type: string, data: any = {}) => {
    let label = data.label || '';
    
    // Generate unique name if not provided or if it conflicts
    if (!label || isNodeNameExists(label)) {
      label = generateUniqueNodeName(type, data.variant, label);
    }
    
    // Set default input type for new input nodes
    if (type === 'inputNode' && !data.inputType) {
      data.inputType = 'new-code';
    }
    
    // Create ID with proper prefix for validation
    let idPrefix = '';
    if (type === 'inputNode') idPrefix = 'input';
    else if (type === 'roundaibleNode') idPrefix = 'roundaible';
    else if (type === 'reasoningAgentNode') idPrefix = 'reason';
    else if (type === 'criticNode') idPrefix = 'critic';
    else idPrefix = type;
    
    const id = `${idPrefix}_${Date.now()}`;
    setNodes(nds => [...nds, { id, type, position: { x: 100 + Math.random() * 400, y: 100 + Math.random() * 400 }, data: { ...data, label } }]);
  };

  // Workflow button handlers
  const handleSaveWorkflow = () => {
    console.log('💾 Save Workflow clicked');
    
    // Validate workflow before saving
    const validation = validateWorkflow(nodes, edges);
    if (!validation.isValid) {
      const shouldSaveAnyway = window.confirm(
        `Workflow validation failed:\n\n${validation.errors.join('\n')}\n\nDo you want to save anyway?`
      );
      if (!shouldSaveAnyway) {
        return;
      }
    }
    
    const workflowData = {
      nodes,
      edges,
      timestamp: new Date().toISOString()
    };
    const dataStr = JSON.stringify(workflowData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `workflow_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    if (validation.isValid) {
      console.log('✅ Workflow saved successfully');
    } else {
      console.log('⚠️ Workflow saved with validation warnings');
    }
  };

  const handleLoadWorkflow = () => {
    console.log('📂 Load Workflow clicked');
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const workflowData = JSON.parse(e.target?.result as string);
            if (workflowData.nodes && workflowData.edges) {
              setNodes(workflowData.nodes);
              setEdges(workflowData.edges);
              
              // Validate loaded workflow
              const validation = validateWorkflow(workflowData.nodes, workflowData.edges);
              if (!validation.isValid) {
                alert(`⚠️ Loaded workflow has validation issues:\n\n${validation.errors.join('\n')}\n\nYou may need to fix these issues before running the workflow.`);
              } else {
                console.log('✅ Workflow loaded successfully');
              }
            } else {
              console.error('❌ Invalid workflow file format');
              alert('❌ Invalid workflow file format. Please select a valid workflow file.');
            }
          } catch (error) {
            console.error('❌ Error parsing workflow file:', error);
            alert('❌ Error parsing workflow file. Please check the file format.');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleStartWorkflow = () => {
    console.log('▶️ Start Workflow clicked');
    console.log('Current nodes:', nodes);
    console.log('Current edges:', edges);

    // Pre-submission validation for required fields
    const validationErrors: string[] = [];
    let inputNode = nodes.find(n => n.type === 'inputNode');
    if (!inputNode) {
      validationErrors.push('Input node is missing. Please add an input node to begin the workflow.');
    } else {
      const inputType = inputNode.data?.inputType || 'new-code';
      
      if (inputType === 'new-code') {
        if (!inputNode.data?.prompt || inputNode.data.prompt.trim() === '') {
          validationErrors.push('Input node prompt is missing or empty. Please provide a prompt for new code generation.');
        }
      } else if (inputType === 'modify-code') {
        if (!inputNode.data?.existingCode || inputNode.data.existingCode.trim() === '') {
          validationErrors.push('Input node existing code is missing or empty. Please provide the code to modify.');
        }
        if (!inputNode.data?.modificationRequest || inputNode.data.modificationRequest.trim() === '') {
          validationErrors.push('Input node modification request is missing or empty. Please describe what modifications you want.');
        }
      } else if (inputType === 'fix-bug') {
        if (!inputNode.data?.existingCode || inputNode.data.existingCode.trim() === '') {
          validationErrors.push('Input node existing code is missing or empty. Please provide the code with the bug.');
        }
        if (!inputNode.data?.errorMessage || inputNode.data.errorMessage.trim() === '') {
          validationErrors.push('Input node error message is missing or empty. Please provide the error message you are getting.');
        }
      }
    }
    for (const node of nodes) {
      if ((node.type === 'reasoningAgentNode' || node.type === 'criticNode')) {
        if (node.data.variant === 'api' && !node.data.providerModel) {
          validationErrors.push(`${node.data.label || node.id}: API model selected but providerModel is missing.`);
        }
        if (node.data.variant === 'huggingface' && !node.data.hfModel) {
          validationErrors.push(`${node.data.label || node.id}: HuggingFace model selected but hfModel is missing.`);
        }
        if (node.data.variant === 'local' && !node.data.localModel) {
          validationErrors.push(`${node.data.label || node.id}: Local model selected but localModel is missing.`);
        }
      }
    }
    if (validationErrors.length > 0) {
      alert(`❌ Workflow validation failed:\n\n${validationErrors.join('\n')}`);
      return;
    }
    
    // Debug: Check critic node specifically
    const criticNode = nodes.find(n => n.type === 'criticNode');
    const roundaibleNode = nodes.find(n => n.type === 'roundaibleNode');
    const criticEdge = edges.find(e => e.source === 'roundaible_1' && e.target === 'critic_1');
    
    console.log('🔍 Debug critic connection:', {
      criticNode: criticNode ? { id: criticNode.id, data: criticNode.data } : null,
      roundaibleNode: roundaibleNode ? { id: roundaibleNode.id, data: roundaibleNode.data } : null,
      criticEdge: criticEdge ? { source: criticEdge.source, target: criticEdge.target } : null,
      allEdges: edges.map(e => ({ source: e.source, target: e.target }))
    });
    
    // Validate workflow before execution
    const validation = validateWorkflow(nodes, edges);
    console.log('🔍 Validation result:', validation);
    
    if (!validation.isValid) {
      alert(`Workflow validation failed:\n\n${validation.errors.join('\n')}`);
      return;
    }
    
    // Before execution, resolve API keys and set reasoningRounds
    const updatedNodes = nodes.map(node => {
      if ((node.type === 'reasoningAgentNode' || node.type === 'criticNode') && node.data?.variant === 'api') {
        // Find the actual API key from apiKeyId
        const provider = getProviderFromModel(node.data.providerModel ?? 'openai') ?? 'openai';
        const providerKeys = getApiKeysForProvider(provider);
        const selectedKey = providerKeys.find((k) => k.id === node.data.apiKeyId);
        return {
          ...node,
          data: {
            ...node.data,
            apiKey: selectedKey ? selectedKey.key : '',
          },
        };
      }
      return node;
    });
    inputNode = updatedNodes.find(n => n.type === 'inputNode');
    const reasoningRounds = inputNode && inputNode.data && inputNode.data.rounds ? inputNode.data.rounds : 1;
    // Execute the workflow with updated nodes and reasoningRounds
    executeWorkflow(updatedNodes, edges, reasoningRounds);
  };

  // Workflow execution logic
  const executeWorkflow = async (workflowNodes: Node[], workflowEdges: EdgeType[], reasoningRounds: number) => {
    try {
      console.log('🚀 Starting workflow execution...');
      setIsWorkflowRunning(true);
      
      // Prepare workflow object for backend
      const workflowIdStr = (activeWorkflowId ?? '').toString();
      const workflow = {
        id: workflowIdStr !== '' ? workflowIdStr : `workflow_${Date.now()}`,
        name: workflows.find(w => w.id === workflowIdStr)?.name ?? 'Untitled Workflow',
        nodes: workflowNodes,
        edges: workflowEdges,
        data: { reasoningRounds },
      };
      let backendSuccess = false;
      let backendResults: any = null;
      
      // Check if backend is connected before attempting to use it
      if (!isBackendConnected) {
        console.log('⚠️ Backend not connected, skipping backend execution');
        throw new Error('Backend not connected');
      }
      
      try {
        // POST to backend
        const response = await fetch(`http://localhost:4000/api/workflows/${workflow.id}/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workflow })
        });
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.executionStatus) {
            backendSuccess = true;
            backendResults = data.executionStatus;
            console.log('✅ Backend workflow execution result:', backendResults);
            // Use the data directly from backendResults as it's already in the correct format
            const codeResults = backendResults.codeResults || [];
            const liveChatMessages = backendResults.liveChatMessages || [];
            const winner = backendResults.winner || '';
            const scores = backendResults.scores || {};
            const rationales = backendResults.rationales || {};
            
            console.log('🚀 Frontend: Setting roundaibleResult with:', {
              codeResults: codeResults.length,
              liveChatMessages: liveChatMessages.length,
              winner,
              scores,
              rationales
            });
            
            setRoundaibleResult({ codeResults, liveChatMessages, winner, scores, rationales });
            // Map backend results to output nodes
            const updatedNodes = workflowNodes.map(node => {
              if (node.type === 'outputNode') {
                const result = backendResults.results.find((r: any) => r.nodeId === node.id);
                return {
                  ...node,
                  data: {
                    ...node.data,
                    results: result ? [result.output] : []
                  }
                };
              }
              return node;
            });
            setNodes(updatedNodes);
            alert(`✅ Workflow executed via backend!\n\nProcessed ${backendResults.results.length} nodes.\nCheck console for detailed results.`);
            return;
          }
        } else {
          const err = await response.text();
          console.error('❌ Backend error:', err);
        }
      } catch (err) {
        console.error('❌ Backend unreachable or error:', err);
      }
      // Fallback: local simulation
      alert('⚠️ Backend unavailable or failed. Running local simulation.');
      // ... existing local simulation code below ...
      // Filter out commented nodes
      const activeNodes = workflowNodes.filter(node => node.data.isCommented !== true);
      const activeEdges = workflowEdges.filter(edge => 
        activeNodes.some(n => n.id === edge.source) && activeNodes.some(n => n.id === edge.target)
      );
      console.log(`📊 Active nodes: ${activeNodes.length}/${workflowNodes.length}`);
      // Find start nodes (nodes with no incoming edges)
      const startNodes = activeNodes.filter(node => {
        return !activeEdges.some(edge => edge.target === node.id);
      });
      if (startNodes.length === 0) {
        alert('❌ No start nodes found! Add an Input node to begin the workflow.');
        return;
      }
      console.log('📍 Start nodes:', startNodes.map(n => n.data.label));
      // Create a map of node outputs for tracking
      const nodeOutputs = new Map<string, any>();
      const processedNodes = new Set<string>();
      // Process nodes in topological order
      const processNode = async (nodeId: string): Promise<any> => {
        if (processedNodes.has(nodeId)) {
          return nodeOutputs.get(nodeId);
        }
        const node = activeNodes.find(n => n.id === nodeId);
        if (!node) {
          throw new Error(`Node ${nodeId} not found`);
        }
        console.log(`🔄 Processing node: ${node.data.label} (${node.type})`);
        // Get input data from connected nodes
        const inputEdges = activeEdges.filter(edge => edge.target === nodeId);
        const inputs: any[] = [];
        for (const edge of inputEdges) {
          const inputData = await processNode(edge.source);
          inputs.push(inputData);
        }
        // Execute node based on type
        let output: any;
        switch (node.type) {
          case 'inputNode':
            output = await executeInputNode(node, inputs);
            break;
          case 'reasoningAgentNode':
            output = await executeReasoningNode(node, inputs);
            break;
          case 'criticNode':
            output = await executeCriticNode(node, inputs);
            break;
          case 'outputNode':
            output = await executeOutputNode(node, inputs);
            break;
          case 'liveChatNode':
            output = await executeLiveChatNode(node, inputs);
            break;
          case 'roundaibleNode':
            output = await executeRoundaibleNode(node, inputs);
            break;
          default:
            output = { error: `Unknown node type: ${node.type}` };
        }
        // Store output and mark as processed
        nodeOutputs.set(nodeId, output);
        processedNodes.add(nodeId);
        console.log(`✅ Node ${node.data.label} completed with output:`, output);
        return output;
      };
      // Process all start nodes
      const results = await Promise.all(startNodes.map(node => processNode(node.id)));
      console.log('🎉 Workflow execution completed!');
      console.log('📊 Final results:', results);
      // Update output nodes with results
      const updatedNodes = workflowNodes.map(node => {
        if (node.type === 'outputNode') {
          return {
            ...node,
            data: {
              ...node.data,
              results: nodeOutputs.get(node.id) || []
            }
          };
        }
        return node;
      });
      setNodes(updatedNodes);
      // Show success message
      alert(`✅ Workflow executed locally!\n\nProcessed ${processedNodes.size} nodes.\nCheck console for detailed results.`);
    } catch (error) {
      console.error('❌ Workflow execution failed:', error);
      alert(`❌ Workflow execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsWorkflowRunning(false);
    }
  };

  // Node execution functions
  const executeInputNode = async (node: Node, inputs: any[]): Promise<any> => {
    console.log('📥 Executing Input Node');
    
    const inputType = node.data?.inputType || 'new-code';
    console.log(`📥 Input type: ${inputType}`);
    
    let structuredData: any = {
      type: 'input',
      inputType: inputType,
      timestamp: new Date().toISOString()
    };
    
    // Structure data based on input type
    switch (inputType) {
      case 'new-code':
        structuredData = {
          ...structuredData,
          prompt: node.data?.prompt || '',
          description: 'New code generation request'
        };
        break;
        
      case 'modify-code':
        structuredData = {
          ...structuredData,
          existingCode: node.data?.existingCode || '',
          modificationRequest: node.data?.modificationRequest || '',
          description: 'Code modification request'
        };
        break;
        
      case 'fix-bug':
        structuredData = {
          ...structuredData,
          existingCode: node.data?.existingCode || '',
          errorMessage: node.data?.errorMessage || '',
          additionalContext: node.data?.additionalContext || '',
          description: 'Bug fix request'
        };
        break;
        
      default:
        structuredData = {
          ...structuredData,
          prompt: node.data?.prompt || '',
          description: 'Default input'
        };
    }
    
    // Add common configuration
    structuredData.config = {
      rounds: node.data?.rounds || 1,
      tagged: node.data?.tagged || 'No',
      knowCompetitors: node.data?.knowCompetitors || 'No'
    };
    
    console.log('📥 Structured input data:', structuredData);
    
    return structuredData;
  };

  const executeReasoningNode = async (node: Node, inputs: any[]): Promise<any> => {
    console.log('🧠 Executing Reasoning Node');
    const input = inputs[0] || { data: 'No input provided' };
    
    // Simulate reasoning process
    const reasoningResult = {
      type: 'reasoning',
      input: input.data,
      analysis: `Analyzed: "${input.data}"`,
      conclusion: 'This is a sample reasoning conclusion.',
      confidence: 0.85,
      timestamp: new Date().toISOString()
    };
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return reasoningResult;
  };

  const executeCriticNode = async (node: Node, inputs: any[]): Promise<any> => {
    console.log('🔍 Executing Critic Node');
    const input = inputs[0] || { analysis: 'No analysis provided' };
    const variant = node.data?.variant || 'api';
    
    console.log(`🔍 Critic variant: ${variant}`);
    
    // Simulate critique process based on variant
    let feedback = 'This analysis appears reasonable but could be more detailed.';
    let score = 7.5;
    let suggestions = ['Add more context', 'Consider alternative viewpoints'];
    
    if (variant === 'api') {
      feedback = 'API-based critique: This analysis shows good structure but lacks depth in technical implementation.';
      score = 8.2;
      suggestions = ['Provide more code examples', 'Include error handling', 'Add performance considerations'];
    } else if (variant === 'huggingface') {
      feedback = 'HuggingFace-based critique: The approach is solid but could benefit from more recent model considerations.';
      score = 7.8;
      suggestions = ['Consider newer model architectures', 'Add model comparison', 'Include fine-tuning strategies'];
    } else if (variant === 'local') {
      feedback = 'Local model critique: Good foundational approach, suitable for offline development.';
      score = 7.0;
      suggestions = ['Optimize for local resources', 'Consider model size constraints', 'Add caching strategies'];
    }
    
    const critiqueResult = {
      type: 'critique',
      variant: variant,
      input: input.analysis,
      feedback: feedback,
      score: score,
      suggestions: suggestions,
      timestamp: new Date().toISOString()
    };
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    return critiqueResult;
  };

  const executeOutputNode = async (node: Node, inputs: any[]): Promise<any> => {
    console.log('📤 Executing Output Node');
    
    const results = inputs.map((input, index) => ({
      id: index + 1,
      type: input.type || 'unknown',
      content: input.analysis || input.data || input.feedback || 'No content',
      timestamp: input.timestamp || new Date().toISOString()
    }));
    
    return {
      type: 'output',
      results,
      winner: results.length > 0 ? results[0].type : 'none',
      timestamp: new Date().toISOString()
    };
  };

  const executeLiveChatNode = async (node: Node, inputs: any[]): Promise<any> => {
    console.log('💬 Executing Live Chat Node');
    
    const messages = inputs.map((input, index) => ({
      id: index + 1,
      role: 'assistant',
      content: input.analysis || input.feedback || input.data || 'Processing...',
      timestamp: new Date().toISOString()
    }));
    
    return {
      type: 'liveChat',
      messages,
      timestamp: new Date().toISOString()
    };
  };

  const executeRoundaibleNode = async (node: Node, inputs: any[]): Promise<any> => {
    console.log('🔄 Executing RoundAIble Node');
    
    // Simulate RoundAIble processing
    const roundaibleResult = {
      type: 'roundaible',
      input: inputs,
      processedData: 'RoundAIble processed data',
      iterations: 3,
      timestamp: new Date().toISOString()
    };
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    return roundaibleResult;
  };

  const handleFitView = () => {
    console.log('🔍 Fit View clicked');
    // This will be handled by ReactFlow's fitView prop
    // You can also use a ref to call fitView() method
  };

  const handleClearWorkflow = () => {
    console.log('🗑️ Clear Workflow clicked');
    if (window.confirm('Are you sure you want to clear the entire workflow? This action cannot be undone.')) {
      const template = getDefaultWorkflowTemplate();
      setNodes(template.nodes);
      setEdges(template.edges);
      console.log('✅ Workflow cleared and reset to default template');
    }
  };

  // Workflow management functions
  const handleCreateNewWorkflow = () => {
    console.log('🆕 Create New Workflow clicked');
    const template = getDefaultWorkflowTemplate();
    const newWorkflowId = `workflow_${Date.now()}`;
    const newWorkflow = {
      id: newWorkflowId,
      name: `Workflow ${workflows.length + 1}`,
      nodes: template.nodes,
      edges: template.edges,
      isActive: false
    };
    
    console.log('🔍 Template details:', {
      nodes: template.nodes.map(n => ({ id: n.id, type: n.type, isCommented: n.data.isCommented })),
      edges: template.edges.map(e => ({ source: e.source, target: e.target }))
    });
    
    setWorkflows(prev => prev.map(w => ({ ...w, isActive: false })).concat(newWorkflow));
    setActiveWorkflowId(newWorkflowId);
    setNodes(template.nodes);
    setEdges(template.edges);
    console.log('✅ New workflow created with default template:', newWorkflowId);
  };

  const handleSwitchWorkflow = (workflowId: string) => {
    console.log('🔄 Switching to workflow:', workflowId);
    const workflow = workflows.find(w => w.id === workflowId);
    if (workflow) {
      setActiveWorkflowId(workflowId);
      setNodes(workflow.nodes);
      setEdges(workflow.edges);
      setWorkflows(prev => prev.map(w => ({ ...w, isActive: w.id === workflowId })));
      console.log('✅ Switched to workflow:', workflow.name);
    }
  };

  const handleRenameWorkflow = (workflowId: string, newName: string) => {
    setWorkflows(prev => prev.map(w => 
      w.id === workflowId ? { ...w, name: newName } : w
    ));
  };

  const handleDeleteWorkflow = (workflowId: string) => {
    if (window.confirm('Are you sure you want to delete this workflow? This action cannot be undone.')) {
      const newWorkflows = workflows.filter(w => w.id !== workflowId);
      if (newWorkflows.length > 0) {
        const newActiveWorkflow = newWorkflows[0];
        setWorkflows(newWorkflows.map(w => ({ ...w, isActive: w.id === newActiveWorkflow.id })));
        setActiveWorkflowId(newActiveWorkflow.id);
        setNodes(newActiveWorkflow.nodes);
        setEdges(newActiveWorkflow.edges);
      } else {
        // Create a new empty workflow if all are deleted
        handleCreateNewWorkflow();
      }
      console.log('✅ Workflow deleted:', workflowId);
    }
  };

  // Node commenting functions
  const handleNodeComment = (nodeId: string) => {
    setNodes(prev => prev.map(node => 
      node.id === nodeId 
        ? { ...node, data: { ...node.data, isCommented: !node.data.isCommented } }
        : node
    ));
    setContextMenuPosition(null);
    setContextMenuNodeId(null);
  };

  const handleNodeDuplicate = (nodeId: string) => {
    const nodeToDuplicate = nodes.find(n => n.id === nodeId);
    if (nodeToDuplicate) {
      // Generate new ID with correct prefix
      let idPrefix = '';
      const nodeType = nodeToDuplicate.type || '';
      if (nodeType === 'inputNode') idPrefix = 'input';
      else if (nodeType === 'roundaibleNode') idPrefix = 'roundaible';
      else if (nodeType === 'reasoningAgentNode') idPrefix = 'reason';
      else if (nodeType === 'criticNode') idPrefix = 'critic';
      else idPrefix = nodeType;
      const newNodeId = `${idPrefix}_${Date.now()}`;
      const originalLabel = nodeToDuplicate.data.label || '';
      const uniqueLabel = generateUniqueNodeName(
        String(nodeToDuplicate.type), 
        nodeToDuplicate.data.variant, 
        originalLabel
      );
      const newNode = {
        ...nodeToDuplicate,
        id: newNodeId,
        position: {
          x: nodeToDuplicate.position.x + 50,
          y: nodeToDuplicate.position.y + 50
        },
        data: { 
          ...nodeToDuplicate.data, 
          label: uniqueLabel,
          isCommented: false 
        }
      };
      setNodes((prev: Node[]) => [...prev, newNode]);
    }
    setContextMenuPosition(null);
    setContextMenuNodeId(null);
  };

  const handleNodeDelete = (nodeId: string) => {
    if (window.confirm('Are you sure you want to delete this node?')) {
      setNodes(prev => prev.filter(n => n.id !== nodeId));
      setEdges(prev => prev.filter(e => e.source !== nodeId && e.target !== nodeId));
    }
    setContextMenuPosition(null);
    setContextMenuNodeId(null);
  };

  // API Key Management Functions
  const openApiKeyModal = (provider: string, editingKey?: {id: string, name: string, key: string}) => {
    if (editingKey) {
      setApiKeyModalData({
        provider,
        keyName: editingKey.name,
        keyValue: editingKey.key,
        isEditing: true,
        editingId: editingKey.id
      });
    } else {
      setApiKeyModalData({
        provider,
        keyName: '',
        keyValue: '',
        isEditing: false
      });
    }
    setShowApiKeyModal(true);
  };

  const saveApiKey = () => {
    if (!apiKeyModalData.keyName.trim() || !apiKeyModalData.keyValue.trim()) {
      alert('Please enter both a name and API key value.');
      return;
    }

    const provider = apiKeyModalData.provider;
    const newKey = {
      id: apiKeyModalData.isEditing ? apiKeyModalData.editingId! : `key_${Date.now()}`,
      name: apiKeyModalData.keyName.trim(),
      key: apiKeyModalData.keyValue.trim()
    };

    setApiKeys(prev => {
      const providerKeys = prev[provider] || [];
      if (apiKeyModalData.isEditing) {
        // Update existing key
        const updatedKeys = providerKeys.map(k => 
          k.id === apiKeyModalData.editingId ? newKey : k
        );
        return { ...prev, [provider]: updatedKeys };
      } else {
        // Add new key
        return { ...prev, [provider]: [...providerKeys, newKey] };
      }
    });

    // Save to localStorage (temporary until backend)
    const allKeys = { ...apiKeys, [provider]: apiKeyModalData.isEditing ? 
      (apiKeys[provider] || []).map(k => k.id === apiKeyModalData.editingId ? newKey : k) :
      [...(apiKeys[provider] || []), newKey]
    };
    localStorage.setItem('roundaible_api_keys', JSON.stringify(allKeys));

    setShowApiKeyModal(false);
    setApiKeyModalData({ provider: '', keyName: '', keyValue: '', isEditing: false });
  };

  const deleteApiKey = (provider: string, keyId: string) => {
    if (window.confirm('Are you sure you want to delete this API key?')) {
      setApiKeys(prev => {
        const updatedKeys = prev[provider]?.filter(k => k.id !== keyId) || [];
        const newState = { ...prev, [provider]: updatedKeys };
        
        // Update localStorage
        localStorage.setItem('roundaible_api_keys', JSON.stringify(newState));
        
        return newState;
      });
    }
  };

  const getProviderFromModel = (modelValue: string): string => {
    const parts = modelValue.split(':');
    return parts[0] || '';
  };

  const getApiKeysForProvider = (provider: string) => {
    return apiKeys[provider] || [];
  };

  // Load API keys from localStorage on component mount
  React.useEffect(() => {
    const savedKeys = localStorage.getItem('roundaible_api_keys');
    if (savedKeys) {
      try {
        const parsedKeys = JSON.parse(savedKeys);
        setApiKeys(parsedKeys);
      } catch (error) {
        console.error('Error loading API keys from localStorage:', error);
      }
    }
  }, []);

  // Default workflow template
  const getDefaultWorkflowTemplate = () => ({
    nodes: [
      { id: 'input_1', type: 'inputNode', position: { x: 0, y: 200 }, data: { label: 'Input Node', inputType: 'new-code', isCommented: false } },
      { id: 'roundaible_1', type: 'roundaibleNode', position: { x: 300, y: 200 }, data: { isCommented: false } },
      { id: 'reason_api_1', type: 'reasoningAgentNode', position: { x: 300, y: 0 }, data: { label: 'API Reasoning', variant: 'api' as ReasoningAgentVariant, providerModel: 'openai:gpt-4o-mini', isCommented: false } },
      { id: 'reason_hf_1', type: 'reasoningAgentNode', position: { x: 500, y: 0 }, data: { label: 'HuggingFace Reasoning', variant: 'huggingface' as ReasoningAgentVariant, hfModel: 'mistralai/Mistral-7B-v0.3', isCommented: false } },
      { id: 'reason_local_1', type: 'reasoningAgentNode', position: { x: 400, y: 100 }, data: { label: 'Local Reasoning', variant: 'local' as ReasoningAgentVariant, localModel: 'gemma3:4b', isCommented: false } },
      { id: 'critic_api_1', type: 'criticNode', position: { x: 300, y: 400 }, data: { label: 'API Critic', variant: 'api', providerModel: 'openai:gpt-4o-mini', isCommented: false } },
      { id: 'critic_hf_1', type: 'criticNode', position: { x: 500, y: 400 }, data: { label: 'HuggingFace Critic', variant: 'huggingface', hfModel: 'mistralai/Mistral-7B-v0.3', isCommented: false } },
      { id: 'critic_local_1', type: 'criticNode', position: { x: 400, y: 500 }, data: { label: 'Local Critic', variant: 'local', localModel: 'gemma3:4b', isCommented: false } },
    ],
    edges: [
      { id: 'e1', source: 'input_1', target: 'roundaible_1', sourceHandle: 'output', targetHandle: 'input' },
      { id: 'e2', source: 'reason_api_1', target: 'roundaible_1', sourceHandle: 'output', targetHandle: 'reasoning' },
      { id: 'e3', source: 'reason_hf_1', target: 'roundaible_1', sourceHandle: 'output', targetHandle: 'reasoning' },
      { id: 'e4', source: 'reason_local_1', target: 'roundaible_1', sourceHandle: 'output', targetHandle: 'reasoning' },
      { id: 'e5', source: 'roundaible_1', target: 'critic_api_1', sourceHandle: 'critic', targetHandle: 'input' },
      { id: 'e6', source: 'roundaible_1', target: 'critic_hf_1', sourceHandle: 'critic', targetHandle: 'input' },
      { id: 'e9', source: 'roundaible_1', target: 'critic_local_1', sourceHandle: 'critic', targetHandle: 'input' },
    ]
  });

  // Workflow validation functions
  const validateWorkflow = (nodes: Node[], edges: EdgeType[]): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    // Get active nodes (not commented out)
    const activeNodes = nodes.filter(node => node.data.isCommented !== true);
    
    console.log('🔍 Validation - Active nodes:', activeNodes.map(n => ({ id: n.id, type: n.type, isCommented: n.data.isCommented })));
    
    // Check for duplicate non-critic/reasoning nodes
    const nodeTypeCounts: { [key: string]: number } = {};
    const allowedMultipleTypes = ['criticNode', 'reasoningAgentNode'];
    
    activeNodes.forEach(node => {
      const nodeType = node.type as string;
      if (!allowedMultipleTypes.includes(nodeType)) {
        nodeTypeCounts[nodeType] = (nodeTypeCounts[nodeType] || 0) + 1;
        if (nodeTypeCounts[nodeType] > 1) {
          errors.push(`Multiple active ${nodeType} nodes found. Please comment out or delete duplicate nodes.`);
        }
      }
    });
    
    // Check for missing API keys in reasoning/critic nodes
    for (const node of activeNodes) {
      if ((node.type === 'reasoningAgentNode' || node.type === 'criticNode')) {
        const variant = node.data?.variant || 'api';
        
        if (variant === 'api') {
          // Check if provider model is selected
          if (!node.data?.providerModel) {
            errors.push(`${node.data?.label || node.id}: API model is not selected.`);
          } else {
            // Check if API key is selected
            if (!node.data?.apiKeyId) {
              errors.push(`${node.data?.label || node.id}: API key is missing for API model.`);
            }
          }
        }
        
        if (variant === 'huggingface') {
          // Check if HF model is selected
          if (!node.data?.hfModel) {
            errors.push(`${node.data?.label || node.id}: HuggingFace model is not selected.`);
          } else {
            // Check if HF API key is provided
            if (!node.data?.hfApiKey) {
              errors.push(`${node.data?.label || node.id}: HuggingFace API key is missing for HuggingFace model.`);
            }
          }
        }
        
        if (variant === 'local') {
          // Check if local model is selected
          if (!node.data?.localModel) {
            errors.push(`${node.data?.label || node.id}: Local model is not selected.`);
          }
        }
      }
    }
    
    // Check if all active nodes are connected to RoundAIble
    const roundaibleNodes = activeNodes.filter(node => node.type === 'roundaibleNode');
    if (roundaibleNodes.length === 0) {
      errors.push('No RoundAIble node found in the workflow.');
    } else {
      const connectedNodeIds = new Set<string>();
      
      // Add RoundAIble nodes themselves
      roundaibleNodes.forEach(node => connectedNodeIds.add(node.id));
      
      // Add nodes connected to RoundAIble (both as source and target)
      edges.forEach(edge => {
        const roundaibleIds = roundaibleNodes.map(rn => rn.id);
        if (roundaibleIds.includes(edge.source) || roundaibleIds.includes(edge.target)) {
          connectedNodeIds.add(edge.source);
          connectedNodeIds.add(edge.target);
          console.log(`🔗 Connection found: ${edge.source} -> ${edge.target}`);
        }
      });
      
      console.log('🔍 Validation debug:', {
        activeNodes: activeNodes.map(n => ({ id: n.id, type: n.type, label: n.data.label })),
        roundaibleNodes: roundaibleNodes.map(n => n.id),
        connectedNodeIds: Array.from(connectedNodeIds),
        edges: edges.map(e => ({ source: e.source, target: e.target }))
      });
      
      // Check for disconnected active nodes
      const disconnectedNodes = activeNodes.filter(node => !connectedNodeIds.has(node.id));
      if (disconnectedNodes.length > 0) {
        const nodeLabels = disconnectedNodes.map(node => node.data.label || node.id).join(', ');
        errors.push(`The following nodes have no connection to RoundAIble: ${nodeLabels}. Please connect them or comment them out.`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  };



  return (
    <div 
      style={{ width: "100vw", height: "100vh", display: 'flex', flexDirection: 'column' }}
      onClick={() => {
        setContextMenuPosition(null);
        setContextMenuNodeId(null);
      }}
    >
      {/* Fixed Header for Workflow Buttons */}
      <div style={{ width: '100%', background: '#fff', borderBottom: '1.5px solid #e0e0e0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', padding: '0 0 0 0', zIndex: 100, position: 'fixed', top: 0, left: 0, height: 70, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="workflow-actions" style={{ flexDirection: 'row', gap: 8, margin: '0 0 0 32px' }}>
          <button className="action-btn new" onClick={handleCreateNewWorkflow} style={{ fontSize: '12px', padding: '6px 10px' }}><span role="img" aria-label="New">🆕</span> New</button>
          <button className="action-btn save" onClick={handleSaveWorkflow} style={{ fontSize: '12px', padding: '6px 10px' }}><span role="img" aria-label="Save">💾</span> Save</button>
          <button className="action-btn load" onClick={handleLoadWorkflow} style={{ fontSize: '12px', padding: '6px 10px' }}><span role="img" aria-label="Load">📂</span> Load</button>
          <button 
            className="action-btn start" 
            onClick={handleStartWorkflow} 
            disabled={isWorkflowRunning}
            style={{ 
              fontSize: '12px', 
              padding: '6px 10px',
              opacity: isWorkflowRunning ? 0.5 : 1,
              cursor: isWorkflowRunning ? 'not-allowed' : 'pointer'
            }}
          >
            <span role="img" aria-label="Start">
              {isWorkflowRunning ? '⏳' : '▶️'}
            </span>
            {isWorkflowRunning ? 'Running...' : 'Start'}
          </button>

          {/* Backend Status Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 16 }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 4, 
              padding: '4px 8px', 
              borderRadius: '4px', 
              fontSize: '11px',
              fontWeight: 'bold',
              backgroundColor: backendStatus === 'connected' ? '#e8f5e8' : backendStatus === 'checking' ? '#fff3cd' : '#f8d7da',
              color: backendStatus === 'connected' ? '#155724' : backendStatus === 'checking' ? '#856404' : '#721c24',
              border: `1px solid ${backendStatus === 'connected' ? '#c3e6cb' : backendStatus === 'checking' ? '#ffeaa7' : '#f5c6cb'}`
            }}>
              <span role="img" aria-label="Backend Status">
                {backendStatus === 'connected' ? '🟢' : backendStatus === 'checking' ? '🟡' : '🔴'}
              </span>
              Backend: {backendStatus === 'connected' ? 'Connected' : backendStatus === 'checking' ? 'Checking...' : 'Disconnected'}
            </div>
            <button 
              onClick={async () => {
                setBackendStatus('checking');
                await checkBackendConnection();
                const status = await getBackendStatus();
                console.log('🔗 Detailed backend status:', status);
                alert(`Backend Status: ${status}`);
              }}
              style={{ 
                fontSize: '10px', 
                padding: '2px 6px', 
                borderRadius: '3px', 
                border: '1px solid #ccc',
                background: '#f8f9fa',
                cursor: 'pointer'
              }}
              title="Check backend connection"
            >
              🔄
            </button>
          </div>

          <button 
            className="action-btn" 
            onClick={() => {
              const template = getDefaultWorkflowTemplate();
              console.log('🧪 Test template:', template);
              setNodes(template.nodes);
              setEdges(template.edges);
            }}
            style={{ background: '#ff9800', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
          >
            🧪 Test
          </button>
          <button 
            className="action-btn" 
            onClick={() => {
              const validation = validateWorkflow(nodes, edges);
              console.log('🔍 Manual validation test:', validation);
              alert(`Validation result: ${validation.isValid ? 'VALID' : 'INVALID'}\n\nErrors: ${validation.errors.join('\n')}`);
            }}
            style={{ background: '#9c27b0', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
          >
            🔍 Validate
          </button>
          <button 
            className="action-btn" 
            onClick={() => {
              const template = getDefaultWorkflowTemplate();
              const validation = validateWorkflow(template.nodes, template.edges);
              console.log('🧪 Template validation test:', validation);
              alert(`Template validation: ${validation.isValid ? 'VALID' : 'INVALID'}\n\nErrors: ${validation.errors.join('\n')}`);
            }}
            style={{ background: '#4caf50', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
          >
            🧪 Template
          </button>
          <button 
            className="action-btn" 
            onClick={() => {
              // Test critic node specifically
              const criticNode = nodes.find(n => n.type === 'criticNode');
              const roundaibleNode = nodes.find(n => n.type === 'roundaibleNode');
              const criticEdge = edges.find(e => e.source === 'roundaible_1' && e.target === 'critic_1');
              
              console.log('🔍 Critic node test:', {
                criticNode: criticNode ? { id: criticNode.id, data: criticNode.data } : null,
                roundaibleNode: roundaibleNode ? { id: roundaibleNode.id, data: roundaibleNode.data } : null,
                criticEdge: criticEdge ? { source: criticEdge.source, target: criticEdge.target } : null,
                allEdges: edges.map(e => ({ source: e.source, target: e.target }))
              });
              
              alert(`Critic Node: ${criticNode ? 'Found' : 'Not found'}\nRoundAIble Node: ${roundaibleNode ? 'Found' : 'Not found'}\nCritic Edge: ${criticEdge ? 'Found' : 'Not found'}`);
            }}
            style={{ background: '#e91e63', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
          >
            🔍 Critic
          </button>
          

          <button
            className="action-btn export"
            onClick={() => {
              // Find selected agent node
              const selectedNode = nodes.find(n => n.id === selectedNodeId && (n.type === 'reasoningAgentNode' || n.type === 'criticNode'));
              if (!selectedNode) {
                alert('Please select a reasoning or critic agent node to export its code.');
                return;
              }
              // Find code result for this agent
              const agentLabel = selectedNode.data.label;
              const codeResult = roundaibleResult?.codeResults?.find((r: any) => r.agent === agentLabel);
              if (!codeResult || !codeResult.codes) {
                alert('No code result found for the selected agent.');
                return;
              }
              // Prepare zip file
              const zip = new JSZip();
              codeResult.codes.forEach((file: any) => {
                zip.file(file.filename, file.content);
              });
              zip.generateAsync({ type: 'blob' }).then((content: Blob) => {
                // Save As dialog
                const a = document.createElement('a');
                a.href = URL.createObjectURL(content);
                a.download = `${agentLabel.replace(/\s+/g, '_')}_code.zip`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(a.href);
              });
            }}
            style={{ fontSize: '12px', padding: '6px 10px' }}
          >
            <span role="img" aria-label="Export">📤</span> Export
          </button>
          
          {/* Beta Expiration Notice */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: '500',
            backgroundColor: '#fff3cd',
            color: '#856404',
            border: '1px solid #ffeaa7',
            marginLeft: '8px'
          }}>
            <span role="img" aria-label="Beta">🧪</span>
            Beta expires Aug 24, 2025
          </div>
          

        </div>
        
        {/* Validation Status Indicator */}
        <div style={{ marginRight: '32px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {(() => {
            if (isWorkflowRunning) {
              return (
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: '500',
                  backgroundColor: '#fff3e0',
                  color: '#f57c00',
                  border: '1px solid #ff9800',
                  animation: 'pulse 2s infinite'
                }}>
                  <span role="img" aria-label="Running">
                    ⚡
                  </span>
                  Running...
                </div>
              );
            }
            
            const validation = validateWorkflow(nodes, edges);
            return (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: '500',
                backgroundColor: validation.isValid ? '#e8f5e8' : '#ffeaea',
                color: validation.isValid ? '#2e7d32' : '#d32f2f',
                border: `1px solid ${validation.isValid ? '#4caf50' : '#f44336'}`
              }}>
                <span role="img" aria-label={validation.isValid ? 'Valid' : 'Invalid'}>
                  {validation.isValid ? '✅' : '⚠️'}
                </span>
                {validation.isValid ? 'Valid' : `${validation.errors.length} Issue${validation.errors.length !== 1 ? 's' : ''}`}
              </div>
            );
          })()}
        </div>
      </div>
      {/* Main Content: Workflow Panel, ReactFlow and Node Palette */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'row', width: '100%', height: '100%', marginTop: 70 }}>
        {/* Workflow Panel on the left */}
        <div className="workflow-panel" style={{ width: 160, background: '#f5f5f5', borderRight: '1px solid #e0e0e0', padding: '8px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '6px', color: '#333' }}>Workflows</div>
          {workflows.map(workflow => (
            <div
              key={workflow.id}
              style={{
                padding: '4px 6px',
                background: workflow.isActive ? '#e3f2fd' : '#fff',
                border: workflow.isActive ? '2px solid #1976d2' : '1px solid #ddd',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '12px',
                minHeight: 32,
                gap: 2
              }}
              onClick={() => handleSwitchWorkflow(workflow.id)}
            >
              <span style={{ color: workflow.isActive ? '#1976d2' : '#333', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 80 }}>
                {workflow.name}
              </span>
              <div style={{ display: 'flex', gap: '2px' }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const newName = prompt('Enter new name:', workflow.name);
                    if (newName) handleRenameWorkflow(workflow.id, newName);
                  }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', padding: 0, width: 18, height: 18 }}
                >
                  ✏️
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteWorkflow(workflow.id);
                  }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', padding: 0, width: 18, height: 18 }}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
        
        {/* ReactFlow Canvas */}
        <div style={{ flex: 1, position: 'relative', height: '100%' }}>
          <ReactFlow
            nodes={nodes.map(n => n.id === selectedNodeId ? { ...n, style: { ...(n.style || {}), boxShadow: '0 0 0 3px #1976d2', zIndex: 10 } } : n)}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onConnectStart={onConnectStart}
            onConnectEnd={onConnectEnd}
            onNodeClick={onNodeClick}
            onNodeDoubleClick={onNodeDoubleClick}
            onNodeMouseEnter={onNodeMouseEnter}
            onNodeMouseLeave={onNodeMouseLeave}
            onNodeContextMenu={onNodeContextMenu}
            nodeTypes={nodeTypes}
            fitView
          >
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>
          
          {/* Node Context Menu */}
          {contextMenuPosition && contextMenuNodeId && (
            <div
              style={{
                position: 'fixed',
                left: contextMenuPosition.x,
                top: contextMenuPosition.y,
                background: '#fff',
                border: '1px solid #ddd',
                borderRadius: '6px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                zIndex: 1000,
                minWidth: '150px',
                padding: '4px 0'
              }}
            >
              <button
                onClick={() => handleNodeComment(String(contextMenuNodeId || ''))}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '14px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
              >
                💬 {nodes.find(n => n.id === (contextMenuNodeId || ''))?.data.isCommented ? 'Uncomment' : 'Comment'}
              </button>
              <button
                onClick={() => handleNodeDuplicate(String(contextMenuNodeId || ''))}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '14px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
              >
                📋 Duplicate
              </button>
              <button
                onClick={() => {
                  const nodeToCopy = nodes.find(n => n.id === contextMenuNodeId);
                  if (nodeToCopy) {
                    setCopiedNode({ ...nodeToCopy });
                    console.log('📋 Node copied via context menu:', nodeToCopy.id);
                    setContextMenuPosition(null);
                    setContextMenuNodeId(null);
                  }
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '14px'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
              >
                📋 Copy
              </button>
              {copiedNode && (
                <button
                  onClick={() => {
                    // Generate proper ID with prefix
                    const idPrefix = copiedNode.type === 'inputNode' ? 'input' : 
                                    copiedNode.type === 'reasoningAgentNode' ? 'reason' :
                                    copiedNode.type === 'criticNode' ? 'critic' :
                                    copiedNode.type === 'roundaibleNode' ? 'roundaible' : copiedNode.type;
                    
                    // Generate unique name
                    const baseName = copiedNode.data?.label || copiedNode.type;
                    const existingNames = nodes.map(n => n.data?.label).filter(Boolean);
                    let uniqueName = baseName;
                    let counter = 1;
                    while (existingNames.includes(uniqueName)) {
                      uniqueName = `${baseName} ${counter}`;
                      counter++;
                    }
                    
                    const newNode = {
                      ...copiedNode,
                      id: `${idPrefix}_${Date.now()}`,
                      position: {
                        x: copiedNode.position.x + pasteOffset.x,
                        y: copiedNode.position.y + pasteOffset.y
                      },
                      data: { 
                        ...copiedNode.data,
                        label: uniqueName
                      }
                    };
                    setNodes(nds => [...nds, newNode]);
                    setSelectedNodeId(newNode.id);
                    setPasteOffset(prev => ({ x: prev.x + 20, y: prev.y + 20 }));
                    console.log('📋 Node pasted via context menu:', newNode.id, 'with name:', uniqueName);
                    setContextMenuPosition(null);
                    setContextMenuNodeId(null);
                  }}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#f5f5f5'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                >
                  📋 Paste
                </button>
              )}
              <button
                onClick={() => handleNodeDelete(String(contextMenuNodeId || ''))}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '14px',
                  color: '#d32f2f'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#ffebee'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
              >
                🗑️ Delete
              </button>
            </div>
          )}
          
          {/* Node Hover Tooltip */}
          {hoveredNodeId && (
            <div
              style={{
                position: 'absolute',
                left: '10px',
                top: '10px',
                background: 'rgba(0,0,0,0.8)',
                color: '#fff',
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                zIndex: 1000,
                pointerEvents: 'none'
              }}
            >
              Right-click for options
            </div>
          )}
          {/* Modal for Output/LiveChat and config expanded view */}
          {modalNodeId && modalNode && (
            <div style={{
              position: 'fixed', left: 0, top: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.18)', zIndex: 1000,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }} onClick={() => setModalNodeId(null)}>
              <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 4px 24px rgba(0,0,0,0.18)', padding: 24, minWidth: 340, maxWidth: 600, maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                <ErrorBoundary>
                  {/* Only render config form for valid node types */}
                    <form onSubmit={e => { e.preventDefault(); saveNodeConfig(modalNode.id); }}>
                      {renderNodeConfig(modalNode, editData, setEditData, {
                        getProviderFromModel,
                        getApiKeysForProvider,
                        openApiKeyModal,
                        deleteApiKey
                      })}
                      <div style={{ textAlign: 'right', marginTop: 12 }}>
                        <button type="submit" className="btn btn-primary me-2">Save</button>
                        <button type="button" className="btn btn-secondary" onClick={() => setModalNodeId(null)}>Cancel</button>
                      </div>
                    </form>
                </ErrorBoundary>
              </div>
            </div>
          )}
        </div>
        {/* Node Palette and Results Panel side by side */}
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', height: '100%', minWidth: 410 }}>
          {/* Node Palette */}
          <div className="side-panel" style={{ width: 160, background: '#f7f8fa', borderLeft: '1px solid #e0e0e0', padding: '8px 6px 6px 6px', display: 'flex', flexDirection: 'column', gap: 12, boxShadow: '2px 0 8px rgba(0,0,0,0.03)', zIndex: 10, height: '100%' }}>
          <div className="palette">
              <div className="palette-title" style={{ fontSize: '13px', marginBottom: 6 }}>Node Palette</div>
              <button className="palette-btn" style={{ fontSize: '12px', padding: '6px 0' }} onClick={() => addNode('inputNode', { label: 'Input Node' })}>Input</button>
              <button className="palette-btn" style={{ fontSize: '12px', padding: '6px 0' }} onClick={() => addNode('reasoningAgentNode', { label: 'API Reasoning', variant: 'api' })}>Reasoning (API)</button>
              <button className="palette-btn" style={{ fontSize: '12px', padding: '6px 0' }} onClick={() => addNode('reasoningAgentNode', { label: 'HuggingFace Reasoning', variant: 'huggingface' })}>Reasoning (HuggingFace)</button>
              <button className="palette-btn" style={{ fontSize: '12px', padding: '6px 0' }} onClick={() => addNode('reasoningAgentNode', { label: 'Local Reasoning', variant: 'local' })}>Reasoning (Local)</button>
              <button className="palette-btn" style={{ fontSize: '12px', padding: '6px 0' }} onClick={() => addNode('criticNode', { label: 'API Critic', variant: 'api' })}>Critic (API)</button>
              <button className="palette-btn" style={{ fontSize: '12px', padding: '6px 0' }} onClick={() => addNode('criticNode', { label: 'HuggingFace Critic', variant: 'huggingface' })}>Critic (HuggingFace)</button>
              <button className="palette-btn" style={{ fontSize: '12px', padding: '6px 0' }} onClick={() => addNode('criticNode', { label: 'Local Critic', variant: 'local' })}>Critic (Local)</button>
              <button className="palette-btn" style={{ fontSize: '12px', padding: '6px 0' }} onClick={() => addNode('roundaibleNode', {})}>RoundAIble</button>
            </div>
          </div>
          {/* Results Panel */}
          <div style={{ flex: 1, minWidth: 120, height: '100%', display: 'flex', flexDirection: 'column' }}>
            <RoundaibleResultsPanel roundaibleResult={roundaibleResult} />
          </div>
        </div>
      </div>

      {/* API Key Management Modal */}
      {showApiKeyModal && (
        <div style={{
          position: 'fixed', 
          left: 0, 
          top: 0, 
          width: '100vw', 
          height: '100vh', 
          background: 'rgba(0,0,0,0.5)', 
          zIndex: 2000,
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
        }} onClick={() => setShowApiKeyModal(false)}>
          <div style={{ 
            background: '#fff', 
            borderRadius: 14, 
            boxShadow: '0 4px 24px rgba(0,0,0,0.3)', 
            padding: 24, 
            minWidth: 400, 
            maxWidth: 500
          }} onClick={e => e.stopPropagation()}>
            <h4 style={{ marginBottom: 20, color: '#333' }}>
              {apiKeyModalData.isEditing ? 'Edit API Key' : 'Add New API Key'}
            </h4>
            <form onSubmit={e => { e.preventDefault(); saveApiKey(); }}>
              <div className="mb-3">
                <label className="form-label">Provider</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={apiKeyModalData.provider} 
                  readOnly 
                  style={{ background: '#f8f9fa' }}
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Key Name</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g., My OpenAI Key, Work API Key"
                  value={apiKeyModalData.keyName} 
                  onChange={e => setApiKeyModalData({ ...apiKeyModalData, keyName: e.target.value })}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label">API Key</label>
                <input 
                  type="password" 
                  className="form-control" 
                  placeholder="Enter your API key"
                  value={apiKeyModalData.keyValue} 
                  onChange={e => setApiKeyModalData({ ...apiKeyModalData, keyValue: e.target.value })}
                  required
                />
              </div>
              <div style={{ textAlign: 'right', marginTop: 20 }}>
                <button 
                  type="button" 
                  className="btn btn-secondary me-2" 
                  onClick={() => setShowApiKeyModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {apiKeyModalData.isEditing ? 'Update' : 'Save'} API Key
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {connectionError && (
        <div style={{
          position: 'absolute',
          top: 10,
          right: 10,
          background: '#f44336',
          color: '#fff',
          padding: '8px 16px',
          borderRadius: 6,
          zIndex: 2000,
          fontWeight: 'bold',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
        }}>
          {connectionError}
          <button style={{ marginLeft: 12, background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }} onClick={() => setConnectionError(null)}>✖</button>
        </div>
      )}
      {backendErrors.length > 0 && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert" style={{ position: 'fixed', top: 20, right: 20, zIndex: 9999, maxWidth: 500 }}>
          <strong>Backend Error:</strong>
          <ul style={{ marginBottom: 0 }}>
            {backendErrors.map((err, i) => <li key={i}>{err}</li>)}
          </ul>
          <button type="button" className="btn-close" aria-label="Close" onClick={() => setBackendErrors([])}></button>
        </div>
      )}
    </div>
  );
} 

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
} from '@xyflow/react';
import type {
  Connection,
  Edge as RfEdge,
  EdgeChange,
  NodeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import InputNode from './nodes/InputNode';
import ReasoningAgentNode from './nodes/ReasoningAgentNode';
import CriticNode from './nodes/CriticNode';
import RoundAIbleNode from './nodes/RoundAIbleNode';
import Toolbar from './Toolbar';
import NodePalette from './NodePalette';
import WorkflowSidebar from './WorkflowSidebar';
import ConfigModal from './ConfigModal';
import ApiKeyManagerModal from './ApiKeyManagerModal';
import RoundaibleResultsPanel from './RoundaibleResultsPanel';
import Toasts from './Toasts';
import { useToasts } from '../hooks/useToasts';

import { canConnect } from '../lib/connectionRules';
import { validateWorkflow } from '../lib/validation';
import type { RfNode } from '../lib/validation';
import { DEFAULT_PROVIDERS } from '../lib/providers';
import { EXAMPLE_WORKFLOWS, DEFAULT_TEMPLATE } from '../lib/templates';
import { fetchProviders, fetchLocalModels } from '../lib/api';
import type { AgentNodeData, NodeData, ProviderDef, WorkflowPayload } from '../lib/types';

import { useApiKeys } from '../hooks/useApiKeys';
import { useBackendHealth } from '../hooks/useBackendHealth';
import { useRun } from '../hooks/useRun';
import { useWorkflows } from '../hooks/useWorkflows';

const nodeTypes = {
  inputNode: InputNode,
  reasoningAgentNode: ReasoningAgentNode,
  criticNode: CriticNode,
  roundaibleNode: RoundAIbleNode,
};

type Snapshot = { nodes: RfNode[]; edges: RfEdge[] };

export default function NodeEditor() {
  const [nodes, setNodes] = useState<RfNode[]>(DEFAULT_TEMPLATE.nodes as RfNode[]);
  const [edges, setEdges] = useState<RfEdge[]>(DEFAULT_TEMPLATE.edges as RfEdge[]);

  const [providers, setProviders] = useState<ProviderDef[]>(DEFAULT_PROVIDERS);
  const [localModels, setLocalModels] = useState<string[]>([]);

  const [configNodeId, setConfigNodeId] = useState<string | null>(null);
  const [configDraft, setConfigDraft] = useState<(NodeData & AgentNodeData)>({});
  const [keyModalOpen, setKeyModalOpen] = useState(false);
  const [keyModalProvider, setKeyModalProvider] = useState<string | undefined>(undefined);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null);
  const clipboardRef = useRef<RfNode | null>(null);
  const [resultsOpen, setResultsOpen] = useState(false);

  const historyRef = useRef<{ stack: Snapshot[]; index: number }>({ stack: [], index: -1 });

  const { toasts, push, dismiss } = useToasts();
  const { status: backendStatus, check: recheckBackend } = useBackendHealth();
  const { apiKeys, upsertKey, deleteKey, keysForProvider } = useApiKeys();
  const { run, start } = useRun();
  const {
    workflows,
    activeId,
    activeName,
    createWorkflow,
    switchWorkflow,
    renameWorkflow,
    deleteWorkflow,
    importWorkflow,
  } = useWorkflows(nodes, edges, setNodes, setEdges);

  const validation = useMemo(() => validateWorkflow(nodes, edges), [nodes, edges]);

  // ---- provider catalog + local models ----
  useEffect(() => {
    fetchProviders().then((p) => p && setProviders(p));
    fetchLocalModels().then(setLocalModels);
  }, []);

  // ---- undo / redo (snapshots of discrete actions only) ----
  const pushHistory = useCallback(() => {
    const h = historyRef.current;
    const snapshot = { nodes: structuredClone(nodes), edges: structuredClone(edges) };
    h.stack = [...h.stack.slice(0, h.index + 1), snapshot].slice(-50);
    h.index = h.stack.length - 1;
  }, [nodes, edges]);

  const applyHistory = useCallback(
    (dir: -1 | 1) => {
      const h = historyRef.current;
      const nextIndex = h.index + dir;
      if (nextIndex < 0 || nextIndex >= h.stack.length) return;
      h.index = nextIndex;
      const snap = h.stack[nextIndex];
      setNodes(snap.nodes);
      setEdges(snap.edges);
    },
    []
  );

  useEffect(() => {
    if (historyRef.current.stack.length === 0) pushHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- flow handlers ----
  const onNodesChange = useCallback((changes: NodeChange<RfNode>[]) => {
    setNodes((nds) => applyNodeChanges(changes, nds));
  }, []);
  const onEdgesChange = useCallback((changes: EdgeChange<RfEdge>[]) => {
    setEdges((eds) => applyEdgeChanges(changes, eds));
  }, []);
  const onNodeDragStop = useCallback(() => pushHistory(), [pushHistory]);

  const onConnect = useCallback(
    (connection: Connection) => {
      if (
        connection.source &&
        connection.target &&
        canConnect(connection.source, connection.target, connection.sourceHandle, connection.targetHandle)
      ) {
        setEdges((eds) => addEdge(connection, eds));
        setTimeout(pushHistory, 0);
      } else {
        push(
          'error',
          'Connection not allowed.\nInput → RoundAIble · Agents → RoundAIble · RoundAIble → Critics'
        );
      }
    },
    [pushHistory, push]
  );

  const uniqueLabel = useCallback(
    (base: string) => {
      const names = new Set(nodes.map((n) => n.data.label).filter(Boolean));
      if (!names.has(base)) return base;
      let i = 1;
      while (names.has(`${base} ${i}`)) i++;
      return `${base} ${i}`;
    },
    [nodes]
  );

  const addNode = useCallback(
    (type: string, data: Record<string, unknown> = {}) => {
      const prefix =
        type === 'inputNode'
          ? 'input'
          : type === 'roundaibleNode'
            ? 'roundaible'
            : type === 'reasoningAgentNode'
              ? 'reason'
              : 'critic';
      const id = `${prefix}_${Date.now()}`;
      setNodes((nds) => [
        ...nds,
        {
          id,
          type,
          position: { x: 120 + Math.random() * 300, y: 120 + Math.random() * 260 },
          data: { ...data, label: uniqueLabel(String(data.label || type)) } as NodeData,
        },
      ]);
      setTimeout(pushHistory, 0);
    },
    [pushHistory, uniqueLabel]
  );

  const deleteNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
      setTimeout(pushHistory, 0);
    },
    [pushHistory]
  );

  const openConfig = useCallback((node: RfNode) => {
    const d = { ...(node.data as object) } as NodeData & AgentNodeData;
    if (node.type === 'reasoningAgentNode' || node.type === 'criticNode') {
      if (!d.providerId) {
        d.providerId = 'openai';
        d.model = d.model || 'gpt-4o-mini';
        d.isLocal = false;
      }
    }
    if (node.type === 'inputNode' && !d.inputType) d.inputType = 'new-code';
    setConfigDraft(d);
    setConfigNodeId(node.id);
  }, []);

  const saveConfig = useCallback(() => {
    if (!configNodeId) return;
    setNodes((nds) => nds.map((n) => (n.id === configNodeId ? { ...n, data: { ...configDraft } } : n)));
    setConfigNodeId(null);
    setTimeout(pushHistory, 0);
  }, [configNodeId, configDraft, pushHistory]);

  // ---- keyboard shortcuts ----
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const el = event.target as HTMLElement;
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable) return;

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        applyHistory(event.shiftKey ? 1 : -1);
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        applyHistory(1);
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c') {
        const node = nodes.find((n) => n.id === selectedId);
        if (node) clipboardRef.current = structuredClone(node);
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'v') {
        const src = clipboardRef.current;
        if (src) {
          const prefix = src.id.split('_')[0];
          const copy: RfNode = {
            ...structuredClone(src),
            id: `${prefix}_${Date.now()}`,
            position: { x: src.position.x + 30, y: src.position.y + 30 },
            data: { ...src.data, label: uniqueLabel(src.data.label || String(src.type)) },
          };
          setNodes((nds) => [...nds, copy]);
          setSelectedId(copy.id);
          setTimeout(pushHistory, 0);
        }
      } else if (event.key === 'Escape') {
        setSelectedId(null);
        setMenu(null);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [nodes, selectedId, applyHistory, pushHistory, uniqueLabel]);

  // ---- export / import ----
  const exportFile = useCallback(() => {
    const payload = {
      name: activeName,
      nodes,
      edges,
      timestamp: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workflow_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [activeName, nodes, edges]);

  const importFile = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(String(reader.result));
          if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
            push('error', 'Invalid workflow file: missing nodes/edges.');
            return;
          }
          importWorkflow(parsed);
          setTimeout(pushHistory, 0);
          push('success', `Imported "${parsed.name || file.name}".`);
        } catch {
          push('error', 'Could not parse that file as JSON.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [importWorkflow, push, pushHistory]);

  const loadTemplate = useCallback(
    (name: string) => {
      const tpl = name === DEFAULT_TEMPLATE.name
        ? DEFAULT_TEMPLATE
        : EXAMPLE_WORKFLOWS.find((t) => t.name === name) || DEFAULT_TEMPLATE;
      setNodes(structuredClone(tpl.nodes) as RfNode[]);
      setEdges(structuredClone(tpl.edges));
      setTimeout(pushHistory, 0);
      push('info', `Loaded template: ${tpl.name}`);
    },
    [pushHistory, push]
  );
  // ---- run ----
  const startRun = useCallback(async () => {
    if (!validation.isValid) {
      push('error', `Fix ${validation.errors.length} issue(s):\n${validation.errors.join('\n')}`);
      return;
    }

    // Resolve referenced API keys out-of-band (header), never in the graph.
    setResultsOpen(true);
    const keyHeader: Record<string, string> = {};
    for (const node of nodes) {
      const d = node.data as AgentNodeData;
      if ((node.type === 'reasoningAgentNode' || node.type === 'criticNode') && d.apiKeyId) {
        const key = apiKeys.find((k) => k.id === d.apiKeyId);
        if (!key) {
          push('error', `${d.label || node.id}: saved API key not found. Re-select it.`);
          return;
        }
        keyHeader[d.apiKeyId] = key.key;
      }
    }

    const inputNode = nodes.find((n) => n.type === 'inputNode');
    const payload: WorkflowPayload = {
      id: activeId,
      name: activeName,
      nodes: nodes.map((n) => ({
        id: n.id,
        type: String(n.type),
        position: n.position,
        data: { ...n.data, status: undefined },
      })),
      edges: edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle ?? null,
        targetHandle: e.targetHandle ?? null,
      })),
      data: { reasoningRounds: Number(inputNode?.data.rounds) > 0 ? Number(inputNode?.data.rounds) : 1 },
    };

    const ok = await start(payload, keyHeader);
    if (!ok) {
      // Failure details already streamed into run.errors → surfaced by the effect below.
    }
  }, [validation, nodes, edges, activeId, activeName, apiKeys, push, start]);

  // Toasts on run completion.
  const lastPhase = useRef(run.phase);
  useEffect(() => {
    if (lastPhase.current !== 'completed' && run.phase === 'completed') {
      push('success', 'Workflow completed.');
    }
    if (lastPhase.current !== 'failed' && run.phase === 'failed') {
      push('error', `Run failed:\n${run.errors.join('\n')}`);
    }
    lastPhase.current = run.phase;
  }, [run.phase, run.errors, push]);

  // Reflect live per-node status onto the canvas.
  const displayNodes = useMemo(
    () =>
      nodes.map((n) =>
        run.activeNodes.has(n.id)
          ? ({ ...n, data: { ...n.data, status: 'running' as const } })
          : n.data.status === 'running'
            ? ({ ...n, data: { ...n.data, status: undefined } })
            : n
      ),
    [nodes, run.activeNodes]
  );

  const configNode = nodes.find((n) => n.id === configNodeId) || null;

  return (
    <div className="flex h-screen w-screen flex-col" onClick={() => setMenu(null)}>
      <Toolbar
        backendStatus={backendStatus}
        onRecheckBackend={() => recheckBackend()}
        runPhase={run.phase}
        progress={run.progress}
        validationOk={validation.isValid}
        issueCount={validation.errors.length}
        onStart={startRun}
        onSaveFile={exportFile}
        onLoadFile={importFile}
        onManageKeys={() => {
          setKeyModalProvider(undefined);
          setKeyModalOpen(true);
        }}
        activeWorkflowName={activeName}
        resultsOpen={resultsOpen}
        onToggleResults={() => setResultsOpen((o) => !o)}
      />

      <div className="mt-14 flex min-h-0 flex-1">
        <WorkflowSidebar
          workflows={workflows}
          activeId={activeId}
          templates={[DEFAULT_TEMPLATE, ...EXAMPLE_WORKFLOWS]}
          onSwitch={switchWorkflow}
          onCreate={createWorkflow}
          onRename={renameWorkflow}
          onDelete={(id) => {
            if (window.confirm('Delete this workflow?')) deleteWorkflow(id);
          }}
          onLoadTemplate={loadTemplate}
          issues={validation.errors}
        />

        <div className="relative min-w-0 flex-1">
          <ReactFlow
            nodes={displayNodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeDragStop={onNodeDragStop}
            onNodeClick={(_, node) => setSelectedId(node.id)}
            onNodeDoubleClick={(_, node) => openConfig(node)}
            onNodeContextMenu={(event, node) => {
              event.preventDefault();
              setMenu({ x: event.clientX, y: event.clientY, nodeId: node.id });
            }}
            nodeTypes={nodeTypes}
            fitView
            proOptions={{ hideAttribution: true }}
          >
            <Background />
            <Controls />
            <MiniMap pannable zoomable />
          </ReactFlow>

          {menu && (
            <div
              className="fixed z-[1000] min-w-[160px] rounded-lg border border-gray-200 bg-white py-1 shadow-xl"
              style={{ left: menu.x, top: menu.y }}
              onClick={(e) => e.stopPropagation()}
            >
              {(() => {
                const node = nodes.find((n) => n.id === menu.nodeId);
                if (!node) return null;
                const itemCls =
                  'block w-full px-3 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-100';
                return (
                  <>
                    <button
                      className={itemCls}
                      onClick={() => {
                        setNodes((nds) =>
                          nds.map((n) =>
                            n.id === menu.nodeId
                              ? { ...n, data: { ...n.data, isCommented: !n.data.isCommented } }
                              : n
                          )
                        );
                        setMenu(null);
                      }}
                    >
                      💬 {node.data.isCommented ? 'Uncomment' : 'Comment out'}
                    </button>
                    <button
                      className={itemCls}
                      onClick={() => {
                        const prefix = node.id.split('_')[0];
                        const copy: RfNode = {
                          ...structuredClone(node),
                          id: `${prefix}_${Date.now()}`,
                          position: {
                            x: node.position.x + 40,
                            y: node.position.y + 40,
                          },
                          data: {
                            ...node.data,
                            label: uniqueLabel(node.data.label || String(node.type)),
                            isCommented: false,
                          },
                        };
                        setNodes((nds) => [...nds, copy]);
                        setMenu(null);
                      }}
                    >
                      📋 Duplicate
                    </button>
                    <button
                      className={`${itemCls} text-red-600 hover:bg-red-50`}
                      onClick={() => {
                        deleteNode(menu.nodeId);
                        setMenu(null);
                      }}
                    >
                      🗑️ Delete
                    </button>
                  </>
                );
              })()}
            </div>
          )}
        </div>

        <NodePalette onAdd={addNode} />

        {resultsOpen && (
          <RoundaibleResultsPanel
            result={
              run.result
                ? {
                    codeResults: run.result.codeResults,
                    liveChatMessages:
                      run.messages.length > 0 ? run.messages : run.result.liveChatMessages,
                    winner: run.result.winner,
                    unranked: run.result.unranked,
                  }
                : null
            }
            progress={run.progress}
            phase={run.phase}
            activeNodes={run.activeNodes}
          />
        )}
      </div>

      {configNodeId && configNode && (
        <ConfigModal
          nodeType={String(configNode.type)}
          input={configDraft}
          onChange={setConfigDraft}
          providers={providers}
          localModels={localModels}
          keysForProvider={keysForProvider}
          onManageKeys={(providerId) => {
            setKeyModalProvider(providerId);
            setKeyModalOpen(true);
          }}
          onSave={saveConfig}
          onCancel={() => setConfigNodeId(null)}
        />
      )}

      <ApiKeyManagerModal
        open={keyModalOpen}
        initialProviderId={keyModalProvider}
        providers={providers}
        apiKeys={apiKeys}
        onSave={upsertKey}
        onDelete={deleteKey}
        onClose={() => setKeyModalOpen(false)}
      />

      <Toasts toasts={toasts} dismiss={dismiss} />
    </div>
  );
}

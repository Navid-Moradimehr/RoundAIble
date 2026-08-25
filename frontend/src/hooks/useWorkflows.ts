import { useCallback, useEffect, useRef, useState } from 'react';
import type { Edge } from '@xyflow/react';
import { DEFAULT_TEMPLATE } from '../lib/templates';
import { loadWorkflows, saveWorkflowsDebounced } from '../lib/storage';
import type { RfNode } from '../lib/validation';

interface StoredWorkflow {
  id: string;
  name: string;
  nodes: RfNode[];
  edges: Edge[];
}

function defaultWorkflow(): StoredWorkflow {
  return {
    id: `workflow_${Date.now()}`,
    name: DEFAULT_TEMPLATE.name,
    nodes: structuredClone(DEFAULT_TEMPLATE.nodes) as unknown as RfNode[],
    edges: structuredClone(DEFAULT_TEMPLATE.edges),
  };
}

export function useWorkflows(
  nodes: RfNode[],
  edges: Edge[],
  setNodes: (n: RfNode[]) => void,
  setEdges: (e: Edge[]) => void
) {
  const [workflows, setWorkflows] = useState<StoredWorkflow[]>([]);
  const [activeId, setActiveId] = useState<string>('');

  // Load persisted workflows once; snapshot current graph into the active
  // workflow before every switch so edits are never lost.
  const graphRef = useRef({ nodes, edges });
  graphRef.current = { nodes, edges };

  useEffect(() => {
    const stored = loadWorkflows();
    if (stored && stored.workflows.length > 0 && stored.activeId) {
      const list = stored.workflows as unknown as StoredWorkflow[];
      setWorkflows(list);
      setActiveId(stored.activeId);
      const active = list.find((w) => w.id === stored.activeId) || list[0];
      setNodes(active.nodes);
      setEdges(active.edges);
    } else {
      const wf = defaultWorkflow();
      setWorkflows([wf]);
      setActiveId(wf.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!activeId) return;
    const others = workflows.filter((w) => w.id !== activeId);
    const active = workflows.find((w) => w.id === activeId);
    if (active) {
      const next = [...others, { ...active, nodes, edges }].sort((a, b) =>
        a.id.localeCompare(b.id)
      );
      saveWorkflowsDebounced(next as never[], activeId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges, activeId]);

  /** Capture the current graph into the active workflow entry. */
  const syncActiveSnapshot = useCallback(() => {
    setWorkflows((prev) =>
      prev.map((w) =>
        w.id === activeId
          ? { ...w, nodes: graphRef.current.nodes, edges: graphRef.current.edges }
          : w
      )
    );
  }, [activeId]);

  const createWorkflow = useCallback(() => {
    syncActiveSnapshot();
    const wf = defaultWorkflow();
    wf.name = `Workflow ${workflows.length + 1}`;
    setWorkflows((prev) => [...prev, wf]);
    setActiveId(wf.id);
    setNodes(wf.nodes);
    setEdges(wf.edges);
  }, [syncActiveSnapshot, workflows.length, setNodes, setEdges]);

  const switchWorkflow = useCallback(
    (id: string) => {
      if (id === activeId) return;
      syncActiveSnapshot();
      const target = workflows.find((w) => w.id === id);
      if (!target) return;
      setActiveId(id);
      setNodes(target.nodes);
      setEdges(target.edges);
    },
    [activeId, workflows, syncActiveSnapshot, setNodes, setEdges]
  );

  const renameWorkflow = useCallback((id: string, name: string) => {
    setWorkflows((prev) => prev.map((w) => (w.id === id ? { ...w, name } : w)));
  }, []);

  const deleteWorkflow = useCallback(
    (id: string) => {
      setWorkflows((prev) => {
        const next = prev.filter((w) => w.id !== id);
        if (next.length === 0) return prev;
        if (id === activeId) {
          setActiveId(next[0].id);
          setNodes(next[0].nodes);
          setEdges(next[0].edges);
        }
        return next;
      });
    },
    [activeId, setNodes, setEdges]
  );

  const importWorkflow = useCallback(
    (parsed: { name?: string; nodes: RfNode[]; edges: Edge[] }) => {
      syncActiveSnapshot();
      const wf: StoredWorkflow = {
        id: `workflow_${Date.now()}`,
        name: parsed.name || `Imported ${new Date().toLocaleTimeString()}`,
        nodes: parsed.nodes,
        edges: parsed.edges,
      };
      setWorkflows((prev) => [...prev, wf]);
      setActiveId(wf.id);
      setNodes(wf.nodes);
      setEdges(wf.edges);
    },
    [syncActiveSnapshot, setNodes, setEdges]
  );

  return {
    workflows,
    activeId,
    activeName: workflows.find((w) => w.id === activeId)?.name || 'Untitled',
    createWorkflow,
    switchWorkflow,
    renameWorkflow,
    deleteWorkflow,
    importWorkflow,
  };
}

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ExecutionStatus, LiveChatMessage, RunEvent, WorkflowPayload } from '../lib/types';
import { openRunStream, startRun } from '../lib/api';

export type RunPhase = 'idle' | 'starting' | 'running' | 'completed' | 'failed';

export interface RunState {
  phase: RunPhase;
  progress: number;
  messages: LiveChatMessage[];
  result: ExecutionStatus | null;
  errors: string[];
  activeNodes: Set<string>;
}

const initialState: RunState = {
  phase: 'idle',
  progress: 0,
  messages: [],
  result: null,
  errors: [],
  activeNodes: new Set(),
};

export function useRun() {
  const [state, setState] = useState<RunState>(initialState);
  const closeStreamRef = useRef<(() => void) | null>(null);

  const stop = useCallback(() => {
    closeStreamRef.current?.();
    closeStreamRef.current = null;
  }, []);

  const start = useCallback(
    async (workflow: WorkflowPayload, keys: Record<string, string>): Promise<boolean> => {
      stop();
      setState({ ...initialState, phase: 'starting' });

      // Optimistically mark agent/critic nodes as running.
      setState((prev) => ({
        ...prev,
        activeNodes: new Set(
          workflow.nodes
            .filter((n) => n.type === 'reasoningAgentNode' || n.type === 'criticNode')
            .map((n) => n.id)
        ),
      }));

      const { runId, error } = await startRun(workflow, keys);
      if (!runId) {
        setState({
          ...initialState,
          phase: 'failed',
          errors: [error || 'Failed to start run'],
        });
        return false;
      }

      setState((prev) => ({ ...prev, phase: 'running' }));

      return new Promise((resolve) => {
        let settled = false;
        const finish = (ok: boolean) => {
          if (settled) return;
          settled = true;
          resolve(ok);
        };

        closeStreamRef.current = openRunStream(
          runId,
          (event: RunEvent) => {
            setState((prev) => {
              switch (event.type) {
                case 'agent_message':
                  return { ...prev, messages: [...prev.messages, event] };
                case 'node_completed': {
                  const activeNodes = new Set(prev.activeNodes);
                  activeNodes.delete(event.nodeId);
                  return { ...prev, activeNodes };
                }
                case 'run_progress':
                  return { ...prev, progress: event.progress };
                case 'run_failed':
                  return {
                    ...prev,
                    phase: 'failed',
                    errors: event.errors,
                    activeNodes: new Set(),
                  };
                case 'run_completed':
                  return {
                    ...prev,
                    phase:
                      event.status.status === 'completed'
                        ? prev.errors.length > 0
                          ? 'failed'
                          : 'completed'
                        : 'failed',
                    result: event.status,
                    messages: event.status.liveChatMessages ?? prev.messages,
                    errors: event.status.errors ?? prev.errors,
                    progress: 100,
                    activeNodes: new Set(),
                  };
                default:
                  return prev;
              }
            });
          },
          () => finish(true)
        );
      });
    },
    [stop]
  );

  const reset = useCallback(() => {
    stop();
    setState(initialState);
  }, [stop]);

  useEffect(() => stop, [stop]);

  return { run: state, start, reset };
}

import type { BackendStatus } from '../hooks/useBackendHealth';
import type { RunPhase } from '../hooks/useRun';

interface ToolbarProps {
  backendStatus: BackendStatus;
  onRecheckBackend: () => void;
  runPhase: RunPhase;
  progress: number;
  validationOk: boolean;
  issueCount: number;
  onStart: () => void;
  onSaveFile: () => void;
  onLoadFile: () => void;
  onManageKeys: () => void;
  activeWorkflowName: string;
  resultsOpen: boolean;
  onToggleResults: () => void;
}

const btn =
  'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50';

export default function Toolbar({
  backendStatus,
  onRecheckBackend,
  runPhase,
  progress,
  validationOk,
  issueCount,
  onStart,
  onSaveFile,
  onLoadFile,
  onManageKeys,
  activeWorkflowName,
  resultsOpen,
  onToggleResults,
}: ToolbarProps) {
  const running = runPhase === 'starting' || runPhase === 'running';

  return (
    <header className="fixed inset-x-0 top-0 z-[100] flex h-14 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="mr-1 text-sm font-extrabold tracking-tight text-blue-700">
          ⭕ RoundAIble
        </span>

        <button className={`${btn} bg-blue-50 text-blue-700 hover:bg-blue-100`} onClick={onSaveFile}>
          💾 Export
        </button>
        <button className={`${btn} bg-orange-50 text-orange-700 hover:bg-orange-100`} onClick={onLoadFile}>
          📂 Import
        </button>
        <button
          className={`${btn} font-semibold text-white ${
            running ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'
          }`}
          onClick={onStart}
          disabled={running || !validationOk}
          title={
            !validationOk
              ? `Fix ${issueCount} validation issue${issueCount === 1 ? '' : 's'} first`
              : 'Run the workflow'
          }
        >
          {running ? '⏳ Running…' : '▶ Start'}
        </button>

        {running && (
          <div className="ml-1 flex items-center gap-2" title="Workflow progress">
            <div className="h-2 w-28 overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-green-500 transition-all duration-500"
                style={{ width: `${Math.max(8, progress)}%` }}
              />
            </div>
            <span className="text-xs text-gray-500">{Math.round(progress)}%</span>
          </div>
        )}

        <button
          className={`${btn} ml-2 border border-gray-300 text-gray-700 hover:bg-gray-50`}
          onClick={onManageKeys}
        >
          🔑 API Keys
        </button>

        <button
          className={`${btn} border ${
            resultsOpen
              ? 'border-blue-400 bg-blue-50 text-blue-700'
              : 'border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}
          onClick={onToggleResults}
          title={resultsOpen ? 'Hide results panel' : 'Show results panel'}
        >
          📊 Results
        </button>

        <span className="ml-1 hidden max-w-[160px] truncate rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-600 md:inline">
          {activeWorkflowName}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {!validationOk && (
          <span
            className="rounded-md border border-red-300 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700"
            title="Open the Validate panel in the sidebar for details"
          >
            ⚠️ {issueCount} issue{issueCount === 1 ? '' : 's'}
          </span>
        )}
        {validationOk && (
          <span className="rounded-md border border-green-300 bg-green-50 px-2 py-1 text-xs font-semibold text-green-700">
            ✅ Valid
          </span>
        )}
        <button
          className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-bold ${
            backendStatus === 'connected'
              ? 'border-green-300 bg-green-50 text-green-800'
              : backendStatus === 'checking'
                ? 'border-yellow-300 bg-yellow-50 text-yellow-800'
                : 'border-red-300 bg-red-50 text-red-700'
          }`}
          onClick={onRecheckBackend}
          title="Click to re-check the local backend"
        >
          {backendStatus === 'connected' ? '🟢' : backendStatus === 'checking' ? '🟡' : '🔴'}
          Backend{' '}
          {backendStatus === 'connected'
            ? 'Connected'
            : backendStatus === 'checking'
              ? 'Checking…'
              : 'Offline'}
        </button>
      </div>
    </header>
  );
}

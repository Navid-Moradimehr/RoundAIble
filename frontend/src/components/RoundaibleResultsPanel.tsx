import JSZip from 'jszip';
import type { CodeResult, LiveChatMessage } from '../lib/types';

export interface ResultsPanelProps {
  result: {
    codeResults?: CodeResult[];
    liveChatMessages?: LiveChatMessage[];
    winner?: string;
    unranked?: boolean;
  } | null;
  progress: number;
  phase: string;
  activeNodes: Set<string>;
}

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text);
}

function stripCodeBlock(content: string) {
  return content.replace(/^```[a-zA-Z]*\n?|```$/gm, '');
}

function downloadCodeFiles(codeResults: CodeResult[], specificAgent?: string) {
  if (!codeResults || codeResults.length === 0) return;
  const targetResults = specificAgent
    ? codeResults.filter((r) => r.agent_id === specificAgent)
    : codeResults;

  const files = targetResults.flatMap((r) => r.codes ?? []);
  if (files.length === 0) return;

  if (files.length === 1) {
    const blob = new Blob([files[0].content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = files[0].filename || 'code.txt';
    a.click();
    URL.revokeObjectURL(url);
    return;
  }

  const zip = new JSZip();
  files.forEach((f) => zip.file(f.filename || 'code.txt', f.content));
  zip.generateAsync({ type: 'blob' }).then((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(specificAgent ?? 'code').replace(/\s+/g, '_')}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  });
}

const ROLE_BG: Record<LiveChatMessage['role'], string> = {
  critic: 'bg-amber-50 border-amber-200',
  reasoning: 'bg-sky-50 border-sky-200',
  system: 'bg-gray-50 border-gray-200',
};
const ROLE_TEXT: Record<LiveChatMessage['role'], string> = {
  critic: 'text-amber-800',
  reasoning: 'text-sky-800',
  system: 'text-gray-600',
};

export default function RoundaibleResultsPanel({
  result,
  progress,
  phase,
  activeNodes,
}: ResultsPanelProps) {
  const running = phase === 'starting' || phase === 'running';
  const codeResults = result?.codeResults ?? [];
  const messages = result?.liveChatMessages ?? [];

  return (
    <div
      className="m-2 flex w-[330px] shrink-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white text-sm shadow-sm"
      data-testid="results-panel"
    >
      {/* Live activity */}
      <div className="min-h-0 flex-1 overflow-y-auto border-b-2 border-gray-200 p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[15px] font-extrabold text-blue-700">
            💬 Live Activity
          </span>
          {running && (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
              ● live {activeNodes.size > 0 ? `· ${activeNodes.size} working` : ''}
            </span>
          )}
        </div>

        {messages.length > 0 ? (
          <ul className="space-y-1.5">
            {messages.map((msg, i) => (
              <li key={i} className={`rounded-md border p-2 ${ROLE_BG[msg.role]}`}>
                <span className={`font-semibold ${ROLE_TEXT[msg.role]}`}>{msg.sender}</span>{' '}
                <span className="text-[10px] uppercase text-gray-400">{msg.role}</span>
                <pre className="mt-1 whitespace-pre-wrap break-words font-mono text-xs text-gray-800">
                  {msg.content}
                </pre>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-gray-400">
            {running ? 'Waiting for agent output…' : 'No activity yet. Configure nodes and press Start.'}
          </p>
        )}
      </div>

      {/* Final results */}
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <div className="mb-2 flex items-center gap-1.5 text-[15px] font-extrabold text-emerald-600">
          🏆 Final Results
        </div>

        {codeResults.length === 0 ? (
          <p className="text-xs text-gray-400">No results yet.</p>
        ) : (
          <div className="space-y-2.5 rounded-lg border border-gray-200 bg-emerald-50/40 p-2.5">
            {result?.unranked ? (
              <div className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-xs text-gray-500">
                Unranked — no critic scores were produced.
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm">
                <span className="font-semibold text-emerald-700">Winner:</span>
                <span className="font-bold text-blue-700">
                  {codeResults.find((r) => r.code_id === result?.winner)?.agent_id ||
                    result?.winner ||
                    '—'}
                </span>
              </div>
            )}

            {codeResults.map((r, idx) => (
              <div key={r.code_id} className="border-b border-gray-100 pb-2 last:border-none">
                <div className="flex items-center gap-2 font-semibold text-gray-700">
                  <span>
                    {result?.winner === r.code_id && '🏆 '}
                    {r.agent_id || `Code ${idx + 1}`}
                  </span>
                  <button
                    className="ml-auto rounded border border-emerald-300 px-1.5 py-0.5 text-[11px] text-emerald-700 hover:bg-emerald-50"
                    onClick={() => downloadCodeFiles(codeResults, r.agent_id)}
                  >
                    ⬇ Download code
                  </button>
                </div>
                {!result?.unranked && (
                  <div className="mt-0.5 text-xs text-gray-500">
                    Score:{' '}
                    <b>{r.avgScore !== null ? r.avgScore.toFixed(2) : '—'}</b>
                    {r.scores.length > 0 && <span className="ml-1">({r.scores.join(', ')})</span>}
                  </div>
                )}
                {(r.critiques.length > 0 || r.rationales.length > 0) && (
                  <ul className="mt-1 list-disc pl-4 text-[11px] italic leading-snug text-gray-500">
                    {[...new Set([...r.critiques, ...r.rationales])].map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                )}
                {r.codes.map((c, i) => (
                  <div key={i} className="mt-1.5">
                    <div className="mb-0.5 flex items-center gap-2 text-xs font-medium text-blue-700">
                      📄 {c.filename}
                      <button
                        className="rounded border border-gray-300 px-1.5 py-px text-[10px] text-gray-600 hover:bg-gray-50"
                        onClick={() => copyToClipboard(stripCodeBlock(c.content))}
                      >
                        Copy
                      </button>
                    </div>
                    <pre className="overflow-x-auto rounded border border-gray-100 bg-gray-50 p-2 font-mono text-[11px]">
                      {stripCodeBlock(c.content)}
                    </pre>
                  </div>
                ))}
                {r.description && (
                  <p className="mt-1 text-xs text-gray-600">{r.description}</p>
                )}
              </div>
            ))}

            <div className="pt-1">
              <button
                className="rounded border border-blue-300 px-2 py-1 text-xs text-blue-700 hover:bg-blue-50"
                onClick={() => downloadCodeFiles(codeResults)}
              >
                ⬇ Download all code
              </button>
            </div>
          </div>
        )}

        {running && (
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-500"
              style={{ width: `${Math.max(6, progress)}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

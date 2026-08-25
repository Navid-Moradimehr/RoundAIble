import { useState } from 'react';

interface WorkflowSidebarProps {
  workflows: Array<{ id: string; name: string }>;
  activeId: string;
  templates: Array<{ name: string }>;
  onSwitch: (id: string) => void;
  onCreate: () => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onLoadTemplate: (name: string) => void;
  issues: string[];
}

export default function WorkflowSidebar({
  workflows,
  activeId,
  templates,
  onSwitch,
  onCreate,
  onRename,
  onDelete,
  onLoadTemplate,
  issues,
}: WorkflowSidebarProps) {
  const [showIssues, setShowIssues] = useState(false);

  return (
    <aside className="flex h-full w-[170px] shrink-0 flex-col gap-2 border-r border-gray-200 bg-gray-50 p-2">
      <div className="flex items-center justify-between">
        <div className="text-xs font-bold text-gray-600">Workflows</div>
        <button
          className="rounded px-1.5 text-sm text-blue-600 hover:bg-blue-100"
          title="New workflow"
          onClick={onCreate}
        >
          ＋
        </button>
      </div>

      <ul className="flex max-h-[30%] flex-col gap-1 overflow-y-auto">
        {workflows.map((w) => {
          const isActive = w.id === activeId;
          return (
            <li
              key={w.id}
              onClick={() => onSwitch(w.id)}
              className={`group flex cursor-pointer items-center justify-between rounded-md border px-2 py-1.5 text-xs ${
                isActive
                  ? 'border-blue-500 bg-blue-100 font-semibold text-blue-800'
                  : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300'
              }`}
            >
              <span className="truncate">{w.name}</span>
              <span className="hidden shrink-0 gap-0.5 group-hover:flex">
                <button
                  title="Rename"
                  className="rounded px-1 hover:bg-white"
                  onClick={(e) => {
                    e.stopPropagation();
                    const name = window.prompt('Workflow name:', w.name);
                    if (name?.trim()) onRename(w.id, name.trim());
                  }}
                >
                  ✏️
                </button>
                <button
                  title="Delete"
                  className="rounded px-1 hover:bg-red-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (workflows.length === 1) return;
                    if (window.confirm(`Delete "${w.name}"? This cannot be undone.`)) onDelete(w.id);
                  }}
                >
                  🗑️
                </button>
              </span>
            </li>
          );
        })}
      </ul>

      <div className="mt-2 text-xs font-bold text-gray-600">Templates</div>
      <ul className="flex flex-col gap-1">
        {templates.map((t) => (
          <li key={t.name}>
            <button
              className="w-full rounded-md border border-dashed border-gray-300 bg-white px-2 py-1.5 text-left text-xs text-gray-700 hover:border-blue-400 hover:bg-blue-50"
              onClick={() => onLoadTemplate(t.name)}
            >
              📄 {t.name}
            </button>
          </li>
        ))}
      </ul>

      {issues.length > 0 && (
        <div className="mt-auto">
          <button
            className={`w-full rounded-md border px-2 py-1.5 text-xs font-semibold ${
              showIssues
                ? 'border-red-300 bg-red-100 text-red-800'
                : 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
            }`}
            onClick={() => setShowIssues((s) => !s)}
          >
            ⚠️ {issues.length} validation issue{issues.length === 1 ? '' : 's'}
          </button>
          {showIssues && (
            <ul className="mt-1 list-disc space-y-1 rounded-md border border-red-200 bg-white p-2 pl-5 text-[11px] leading-snug text-red-700">
              {issues.map((issue, i) => (
                <li key={i}>{issue}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </aside>
  );
}

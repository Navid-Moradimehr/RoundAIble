import { useEffect, useState } from 'react';
import type { ProviderDef, StoredApiKey } from '../lib/types';

export interface ApiKeyManagerModalProps {
  open: boolean;
  initialProviderId?: string;
  providers: ProviderDef[];
  apiKeys: StoredApiKey[];
  onSave: (key: StoredApiKey) => void;
  onDelete: (keyId: string) => void;
  onClose: () => void;
}

const field = 'w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-800 focus:border-blue-500 focus:outline-none';
const labelCls = 'mb-1 block text-xs font-semibold text-gray-600';

/**
 * Local key manager. Keys live only in this browser (localStorage) and are
 * sent to the local backend per-run via a dedicated header — they are never
 * embedded in workflow graphs or logs.
 */
export default function ApiKeyManagerModal({
  open,
  initialProviderId,
  providers,
  apiKeys,
  onSave,
  onDelete,
  onClose,
}: ApiKeyManagerModalProps) {
  const [providerId, setProviderId] = useState(initialProviderId || providers[0]?.id || '');
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    if (open && initialProviderId) setProviderId(initialProviderId);
  }, [open, initialProviderId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    if (open) document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const providerKeys = apiKeys.filter((k) => k.providerId === providerId);

  const submit = () => {
    if (!name.trim() || !value.trim()) return;
    onSave({
      id: editingId ?? `key_${Date.now()}`,
      providerId,
      name: name.trim(),
      key: value.trim(),
    });
    setName('');
    setValue('');
    setEditingId(null);
  };

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/40"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      data-testid="api-key-modal"
    >
      <div className="w-[460px] rounded-2xl bg-white p-5 shadow-2xl">
        <h3 className="mb-1 text-base font-bold text-gray-800">API Keys</h3>
        <p className="mb-4 text-xs leading-relaxed text-gray-500">
          Keys are stored only in this browser and sent directly to your local backend when a run
          starts. Nothing is stored server-side.
        </p>

        <div className="mb-3">
          <label className={labelCls}>Provider</label>
          <select
            className={field}
            value={providerId}
            onChange={(e) => setProviderId(e.target.value)}
          >
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
                {p.requiresKey ? '' : ' (no key needed)'}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-3 grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Key Name</label>
            <input
              className={field}
              placeholder="e.g. Personal OpenAI"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>API Key</label>
            <input
              type="password"
              className={field}
              placeholder="sk-…"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>
        </div>

        <div className="mb-4 flex items-center gap-2">
          <button
            type="button"
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
            onClick={submit}
            disabled={!name.trim() || !value.trim()}
          >
            {editingId ? 'Update Key' : 'Add Key'}
          </button>
          {editingId && (
            <button
              type="button"
              className="text-sm text-gray-500 hover:text-gray-700"
              onClick={() => {
                setEditingId(null);
                setName('');
                setValue('');
              }}
            >
              Cancel edit
            </button>
          )}
        </div>

        {providerKeys.length > 0 && (
          <ul className="mb-2 max-h-44 space-y-1.5 overflow-y-auto">
            {providerKeys.map((k) => (
              <li
                key={k.id}
                className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-sm"
              >
                <span className="truncate text-gray-700">🔑 {k.name}</span>
                <span className="flex shrink-0 gap-1.5">
                  <button
                    type="button"
                    title="Edit"
                    className="rounded px-1.5 py-0.5 hover:bg-gray-200"
                    onClick={() => {
                      setEditingId(k.id);
                      setName(k.name);
                      setValue(k.key);
                    }}
                  >
                    ✏️
                  </button>
                  <button
                    type="button"
                    title="Delete"
                    className="rounded px-1.5 py-0.5 hover:bg-red-100"
                    onClick={() => onDelete(k.id)}
                  >
                    🗑️
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

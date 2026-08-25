import { useEffect, useMemo } from 'react';
import type { AgentNodeData, InputNodeData, ProviderDef, StoredApiKey } from '../lib/types';

const field = 'w-full rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-800 focus:border-blue-500 focus:outline-none';
const labelCls = 'mb-1 block text-xs font-semibold text-gray-600';
const group = 'mb-3';

export interface ConfigModalProps {
  nodeType: string;
  input: InputNodeData & AgentNodeData;
  onChange: (next: InputNodeData & AgentNodeData) => void;
  providers: ProviderDef[];
  localModels: string[];
  keysForProvider: (providerId: string) => StoredApiKey[];
  onManageKeys: (providerId?: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

function NumberField({
  label,
  value,
  min,
  max,
  step,
  placeholder,
  onChange,
}: {
  label: string;
  value: number | undefined;
  min: number;
  max: number;
  step: number;
  placeholder: string;
  onChange: (v: number | undefined) => void;
}) {
  return (
    <div className={group}>
      <label className={labelCls}>{label}</label>
      <input
        type="number"
        className={field}
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        value={value ?? ''}
        onChange={(e) =>
          onChange(e.target.value === '' ? undefined : Number(e.target.value))
        }
      />
    </div>
  );
}

/** Shared provider/model/key/params form for reasoning + critic nodes. */
function AgentFields({
  data,
  onChange,
  providers,
  localModels,
  keysForProvider,
  onManageKeys,
}: {
  data: AgentNodeData;
  onChange: (next: Partial<AgentNodeData>) => void;
  providers: ProviderDef[];
  localModels: string[];
  keysForProvider: (providerId: string) => StoredApiKey[];
  onManageKeys: (providerId?: string) => void;
}) {
  const cloudProviders = providers.filter((p) => p.kind === 'cloud');
  const localProviders = providers.filter((p) => p.kind === 'local');
  const selected = providers.find((p) => p.id === data.providerId);

  const modelOptions = useMemo(() => {
    if (!selected) return [];
    if (selected.id === 'ollama' && localModels.length > 0) {
      const known = new Set(selected.models.map((m) => m.id));
      const extra = localModels.filter((m) => !known.has(m)).map((m) => ({ id: m, label: `${m} (installed)` }));
      return [...selected.models, ...extra];
    }
    return selected.models;
  }, [selected, localModels]);

  const customModel = Boolean(data.model) && !modelOptions.some((m) => m.id === data.model);
  const providerKeys = data.providerId ? keysForProvider(data.providerId) : [];

  return (
    <>
      <div className={group}>
        <label className={labelCls}>Provider</label>
        <select
          className={field}
          value={data.providerId || ''}
          onChange={(e) => {
            const p = providers.find((x) => x.id === e.target.value);
            onChange({
              providerId: e.target.value,
              model: p?.models[0]?.id || '',
              apiKeyId: '',
              baseUrl: '',
              isLocal: p?.kind === 'local',
            });
          }}
        >
          <option value="">Select provider…</option>
          <optgroup label="Cloud">
            {cloudProviders.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </optgroup>
          <optgroup label="Local">
            {localProviders.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </optgroup>
        </select>
      </div>

      {data.providerId === 'custom' && (
        <div className={group}>
          <label className={labelCls}>Base URL (OpenAI-compatible)</label>
          <input
            className={field}
            placeholder="http://localhost:1234/v1"
            value={data.baseUrl || ''}
            onChange={(e) => onChange({ baseUrl: e.target.value })}
          />
          <p className="mt-1 text-[11px] text-gray-400">
            Works with LM Studio, vLLM, llama.cpp, Together, Fireworks…
          </p>
        </div>
      )}

      {selected && (
        <div className={group}>
          <label className={labelCls}>Model</label>
          <select
            className={field}
            value={customModel ? '__custom__' : data.model || ''}
            onChange={(e) => {
              if (e.target.value === '__custom__') onChange({ model: '' });
              else onChange({ model: e.target.value });
            }}
          >
            {modelOptions.length > 0 ? (
              modelOptions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))
            ) : (
              <option value="__custom__">Type a model id…</option>
            )}
            {customModel && <option value="__custom__">Custom: {data.model}</option>}
          </select>
          {(customModel || modelOptions.length === 0) && (
            <input
              className={`${field} mt-2`}
              placeholder="model id, e.g. my-model:latest"
              value={data.model || ''}
              onChange={(e) => onChange({ model: e.target.value })}
            />
          )}
        </div>
      )}

      {selected?.requiresKey && (
        <div className={group}>
          <label className={labelCls}>API Key</label>
          <select
            className={field}
            value={data.apiKeyId || ''}
            onChange={(e) => onChange({ apiKeyId: e.target.value })}
          >
            <option value="">Select API key…</option>
            {providerKeys.map((k) => (
              <option key={k.id} value={k.id}>
                🔑 {k.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="mt-1.5 rounded border border-blue-300 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50"
            onClick={() => onManageKeys(data.providerId)}
          >
            🔑 Manage API Keys{providerKeys.length > 0 ? ` (${providerKeys.length})` : ''}
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="Temperature"
          value={data.temperature}
          min={0}
          max={2}
          step={0.05}
          placeholder="0.7"
          onChange={(temperature) => onChange({ temperature })}
        />
        <NumberField
          label="Max Tokens"
          value={data.maxTokens}
          min={128}
          max={128000}
          step={256}
          placeholder="4096"
          onChange={(maxTokens) => onChange({ maxTokens })}
        />
      </div>
      <NumberField
        label="Timeout (seconds)"
        value={data.timeoutSec}
        min={10}
        max={900}
        step={10}
        placeholder="120"
        onChange={(timeoutSec) => onChange({ timeoutSec })}
      />
    </>
  );
}

export default function ConfigModal(props: ConfigModalProps) {
  const { nodeType, input, onChange } = props;

  // Lock body scroll while open; close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && props.onCancel();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isAgent = nodeType === 'reasoningAgentNode' || nodeType === 'criticNode';

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/30"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) props.onCancel();
      }}
      data-testid="config-modal"
    >
      <form
        className="max-h-[82vh] w-[420px] overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl"
        onSubmit={(e) => {
          e.preventDefault();
          props.onSave();
        }}
      >
        <h3 className="mb-4 text-base font-bold text-gray-800">
          Configure{' '}
          {nodeType === 'inputNode'
            ? 'Input Node'
            : nodeType === 'reasoningAgentNode'
              ? 'Reasoning Agent'
              : nodeType === 'criticNode'
                ? 'Critic'
                : 'RoundAIble Node'}
        </h3>

        {nodeType !== 'roundaibleNode' && (
          <div className={group}>
            <label className={labelCls}>Name</label>
            <input
              className={field}
              value={input.label || ''}
              onChange={(e) => onChange({ ...input, label: e.target.value })}
            />
          </div>
        )}

        {nodeType === 'inputNode' && <InputFields input={input} onChange={onChange} />}
        {isAgent && (
          <AgentFields
            data={input}
            onChange={(patch) => onChange({ ...input, ...patch })}
            providers={props.providers}
            localModels={props.localModels}
            keysForProvider={props.keysForProvider}
            onManageKeys={props.onManageKeys}
          />
        )}
        {nodeType === 'roundaibleNode' && (
          <p className="text-sm text-gray-500">
            The RoundAIble node orchestrates the competition: agents submit code in parallel,
            critics score every submission, and the highest average wins.
          </p>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
            onClick={props.onCancel}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  );
}

function InputFields({
  input,
  onChange,
}: {
  input: InputNodeData & AgentNodeData;
  onChange: (next: InputNodeData & AgentNodeData) => void;
}) {
  const inputType = input.inputType || 'new-code';
  return (
    <>
      <div className={group}>
        <label className={labelCls}>Task Type</label>
        <select
          className={field}
          value={inputType}
          onChange={(e) => onChange({ ...input, inputType: e.target.value as InputNodeData['inputType'] })}
        >
          <option value="new-code">🆕 New Code Request</option>
          <option value="modify-code">✏️ Code Modification</option>
          <option value="fix-bug">🐛 Bug Fix</option>
        </select>
      </div>

      {inputType === 'new-code' && (
        <div className={group}>
          <label className={labelCls}>Prompt</label>
          <textarea
            className={`${field} min-h-[90px]`}
            rows={4}
            placeholder="Describe the code you want to create…"
            value={input.prompt || ''}
            onChange={(e) => onChange({ ...input, prompt: e.target.value })}
          />
        </div>
      )}

      {inputType !== 'new-code' && (
        <div className={group}>
          <label className={labelCls}>Existing Code</label>
          <textarea
            className={`${field} min-h-[120px] font-mono text-xs`}
            rows={6}
            placeholder="Paste your existing code here…"
            value={input.existingCode || ''}
            onChange={(e) => onChange({ ...input, existingCode: e.target.value })}
          />
        </div>
      )}
      {inputType === 'modify-code' && (
        <div className={group}>
          <label className={labelCls}>Modification Request</label>
          <textarea
            className={`${field} min-h-[70px]`}
            rows={3}
            placeholder="Describe the changes you want…"
            value={input.modificationRequest || ''}
            onChange={(e) => onChange({ ...input, modificationRequest: e.target.value })}
          />
        </div>
      )}
      {inputType === 'fix-bug' && (
        <>
          <div className={group}>
            <label className={labelCls}>Error Message</label>
            <textarea
              className={`${field} min-h-[60px] font-mono text-xs`}
              rows={3}
              placeholder="Paste the error you're getting…"
              value={input.errorMessage || ''}
              onChange={(e) => onChange({ ...input, errorMessage: e.target.value })}
            />
          </div>
          <div className={group}>
            <label className={labelCls}>Additional Context (optional)</label>
            <textarea
              className={`${field} min-h-[50px]`}
              rows={2}
              value={input.additionalContext || ''}
              onChange={(e) => onChange({ ...input, additionalContext: e.target.value })}
            />
          </div>
        </>
      )}

      <NumberField
        label="Reasoning Rounds (peer-review rounds between agents)"
        value={input.rounds}
        min={1}
        max={5}
        step={1}
        placeholder="1"
        onChange={(rounds) => onChange({ ...input, rounds })}
      />
    </>
  );
}

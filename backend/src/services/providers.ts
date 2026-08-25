export type ProviderType = 'openai-compatible' | 'anthropic' | 'google' | 'ollama';

export interface ModelDef {
  id: string;
  label: string;
}

export interface ProviderDef {
  id: string;
  label: string;
  type: ProviderType;
  kind: 'cloud' | 'local';
  baseUrl?: string;
  requiresKey: boolean;
  models: ModelDef[];
  docsUrl?: string;
}

export const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

export const PROVIDERS: ProviderDef[] = [
  {
    id: 'openai',
    label: 'OpenAI',
    type: 'openai-compatible',
    kind: 'cloud',
    baseUrl: 'https://api.openai.com/v1',
    requiresKey: true,
    docsUrl: 'https://platform.openai.com/api-keys',
    models: [
      { id: 'gpt-5.6-luna', label: 'GPT-5.6 Luna (frontier)' },
      { id: 'gpt-5.6-luna-pro', label: 'GPT-5.6 Luna Pro' },
      { id: 'gpt-5.6-sol', label: 'GPT-5.6 Sol' },
      { id: 'gpt-5.6-terra', label: 'GPT-5.6 Terra' },
      { id: 'gpt-5.5', label: 'GPT-5.5' },
      { id: 'gpt-5.5-pro', label: 'GPT-5.5 Pro' },
      { id: 'gpt-5.4', label: 'GPT-5.4' },
      { id: 'gpt-5.4-mini', label: 'GPT-5.4 Mini' },
      { id: 'gpt-5.4-nano', label: 'GPT-5.4 Nano' },
      { id: 'gpt-5.3-codex', label: 'GPT-5.3 Codex (code)' },
      { id: 'gpt-5.2-codex', label: 'GPT-5.2 Codex' },
      { id: 'gpt-5.1-codex-max', label: 'GPT-5.1 Codex Max' },
      { id: 'o3-pro', label: 'o3-pro (reasoning)' },
      { id: 'o3', label: 'o3 (reasoning)' },
      { id: 'o4-mini', label: 'o4-mini (reasoning)' },
    ],
  },
  {
    id: 'anthropic',
    label: 'Anthropic',
    type: 'anthropic',
    kind: 'cloud',
    baseUrl: 'https://api.anthropic.com',
    requiresKey: true,
    docsUrl: 'https://console.anthropic.com/settings/keys',
    models: [
      { id: 'claude-fable-5', label: 'Claude Fable 5 (highest capability)' },
      { id: 'claude-opus-5', label: 'Claude Opus 5 (frontier)' },
      { id: 'claude-sonnet-5', label: 'Claude Sonnet 5' },
      { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5 (fast)' },
      { id: 'claude-opus-4.8', label: 'Claude Opus 4.8 (legacy)' },
      { id: 'claude-opus-4.7', label: 'Claude Opus 4.7 (legacy)' },
      { id: 'claude-sonnet-4.6', label: 'Claude Sonnet 4.6 (legacy)' },
      { id: 'claude-opus-4.1', label: 'Claude Opus 4.1 (legacy)' },
    ],
  },
  {
    id: 'google',
    label: 'Google Gemini',
    type: 'google',
    kind: 'cloud',
    baseUrl: 'https://generativelanguage.googleapis.com',
    requiresKey: true,
    docsUrl: 'https://aistudio.google.com/app/apikey',
    models: [
      { id: 'gemini-3.7-flash', label: 'Gemini 3.7 Flash (frontier)' },
      { id: 'gemini-3.6-flash', label: 'Gemini 3.6 Flash' },
      { id: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash' },
      { id: 'gemini-3.5-flash-lite', label: 'Gemini 3.5 Flash Lite' },
      { id: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro (preview)' },
      { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (legacy)' },
    ],
  },
  {
    id: 'xai',
    label: 'xAI (Grok)',
    type: 'openai-compatible',
    kind: 'cloud',
    baseUrl: 'https://api.x.ai/v1',
    requiresKey: true,
    docsUrl: 'https://console.x.ai',
    models: [
      { id: 'grok-4.20', label: 'Grok 4.20 (2M context)' },
      { id: 'grok-4.6', label: 'Grok 4.6' },
      { id: 'grok-4.5', label: 'Grok 4.5' },
      { id: 'grok-4.3', label: 'Grok 4.3' },
      { id: 'grok-build-0.1', label: 'Grok Build (code)' },
    ],
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    type: 'openai-compatible',
    kind: 'cloud',
    baseUrl: 'https://api.deepseek.com/v1',
    requiresKey: true,
    docsUrl: 'https://platform.deepseek.com/api_keys',
    models: [
      { id: 'deepseek-chat', label: 'DeepSeek V4 (chat alias)' },
      { id: 'deepseek-reasoner', label: 'DeepSeek Reasoner (alias)' },
      { id: 'deepseek-v4-pro', label: 'DeepSeek V4 Pro' },
      { id: 'deepseek-v4-flash', label: 'DeepSeek V4 Flash' },
      { id: 'deepseek-v3.2', label: 'DeepSeek V3.2' },
    ],
  },
  {
    id: 'moonshot',
    label: 'Moonshot AI (Kimi)',
    type: 'openai-compatible',
    kind: 'cloud',
    baseUrl: 'https://api.moonshot.ai/v1',
    requiresKey: true,
    docsUrl: 'https://platform.moonshot.ai/console/api-keys',
    models: [
      { id: 'kimi-k3', label: 'Kimi K3 (frontier)' },
      { id: 'kimi-k2.7-code', label: 'Kimi K2.7 Code' },
      { id: 'kimi-k2-thinking', label: 'Kimi K2 Thinking' },
      { id: 'kimi-k2.6', label: 'Kimi K2.6' },
    ],
  },
  {
    id: 'qwen',
    label: 'Alibaba Qwen',
    type: 'openai-compatible',
    kind: 'cloud',
    baseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
    requiresKey: true,
    docsUrl: 'https://bailian.console.alibabacloud.com/',
    models: [
      { id: 'qwen3.8-max', label: 'Qwen 3.8 Max (frontier)' },
      { id: 'qwen3.8-27b', label: 'Qwen 3.8 27B' },
      { id: 'qwen3.7-max', label: 'Qwen 3.7 Max' },
      { id: 'qwen3.7-plus', label: 'Qwen 3.7 Plus' },
      { id: 'qwen3.6-max-preview', label: 'Qwen 3.6 Max (preview)' },
    ],
  },
  {
    id: 'zhipu',
    label: 'Zhipu GLM',
    type: 'openai-compatible',
    kind: 'cloud',
    baseUrl: 'https://api.z.ai/api/paas/v4',
    requiresKey: true,
    docsUrl: 'https://z.ai/manage-apikey/apikey-list',
    models: [
      { id: 'glm-5.3', label: 'GLM-5.3 (flagship)' },
      { id: 'glm-5.2', label: 'GLM-5.2' },
      { id: 'glm-5', label: 'GLM-5' },
      { id: 'glm-5-turbo', label: 'GLM-5 Turbo (fast)' },
      { id: 'glm-4.7', label: 'GLM-4.7 (legacy)' },
    ],
  },
  {
    id: 'minimax',
    label: 'MiniMax',
    type: 'openai-compatible',
    kind: 'cloud',
    baseUrl: 'https://api.minimax.io/v1',
    requiresKey: true,
    docsUrl: 'https://www.minimax.io/platform/document/',
    models: [
      { id: 'minimax-m3', label: 'MiniMax M3 (frontier)' },
      { id: 'minimax-m2.7', label: 'MiniMax M2.7' },
      { id: 'minimax-m2.5', label: 'MiniMax M2.5' },
    ],
  },
  {
    id: 'groq',
    label: 'Groq',
    type: 'openai-compatible',
    kind: 'cloud',
    baseUrl: 'https://api.groq.com/openai/v1',
    requiresKey: true,
    docsUrl: 'https://console.groq.com/keys',
    models: [
      { id: 'moonshotai/kimi-k2-instruct', label: 'Kimi K2 (on Groq)' },
      { id: 'openai/gpt-oss-120b', label: 'GPT-OSS 120B' },
      { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B' },
      { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B (fast)' },
      { id: 'qwen/qwen3-32b', label: 'Qwen3 32B' },
    ],
  },
  {
    id: 'mistral',
    label: 'Mistral AI',
    type: 'openai-compatible',
    kind: 'cloud',
    baseUrl: 'https://api.mistral.ai/v1',
    requiresKey: true,
    docsUrl: 'https://console.mistral.ai/api-keys',
    models: [
      { id: 'mistral-large-latest', label: 'Mistral Large' },
      { id: 'mistral-medium-latest', label: 'Mistral Medium' },
      { id: 'magistral-medium-latest', label: 'Magistral Medium (reasoning)' },
      { id: 'codestral-latest', label: 'Codestral (code)' },
    ],
  },
  {
    id: 'perplexity',
    label: 'Perplexity',
    type: 'openai-compatible',
    kind: 'cloud',
    baseUrl: 'https://api.perplexity.ai',
    requiresKey: true,
    docsUrl: 'https://docs.perplexity.ai/guides/getting-started',
    models: [
      { id: 'sonar-pro', label: 'Sonar Pro' },
      { id: 'sonar', label: 'Sonar' },
      { id: 'sonar-reasoning-pro', label: 'Sonar Reasoning Pro' },
    ],
  },
  {
    id: 'openrouter',
    label: 'OpenRouter (400+ models)',
    type: 'openai-compatible',
    kind: 'cloud',
    baseUrl: 'https://openrouter.ai/api/v1',
    requiresKey: true,
    docsUrl: 'https://openrouter.ai/keys',
    models: [
      { id: 'openai/gpt-5.6-luna', label: 'GPT-5.6 Luna (via OR)' },
      { id: 'anthropic/claude-opus-5', label: 'Claude Opus 5 (via OR)' },
      { id: 'google/gemini-3.7-flash', label: 'Gemini 3.7 Flash (via OR)' },
      { id: 'x-ai/grok-4.20', label: 'Grok 4.20 (via OR)' },
      { id: 'deepseek/deepseek-v4-pro', label: 'DeepSeek V4 Pro (via OR)' },
      { id: 'moonshotai/kimi-k3', label: 'Kimi K3 (via OR)' },
      { id: 'z-ai/glm-5.3', label: 'GLM-5.3 (via OR)' },
      { id: 'minimax/minimax-m3', label: 'MiniMax M3 (via OR)' },
    ],
  },
  {
    id: 'ollama',
    label: 'Ollama (local)',
    type: 'ollama',
    kind: 'local',
    baseUrl: OLLAMA_BASE_URL,
    requiresKey: false,
    docsUrl: 'https://ollama.com/library',
    models: [
      { id: 'qwen3-coder:30b', label: 'Qwen3 Coder 30B' },
      { id: 'qwen3:8b', label: 'Qwen3 8B' },
      { id: 'qwen2.5-coder:7b', label: 'Qwen2.5 Coder 7B' },
      { id: 'deepseek-r1:8b', label: 'DeepSeek R1 8B' },
      { id: 'deepseek-v2:16b', label: 'DeepSeek V2 16B' },
      { id: 'gemma3:12b', label: 'Gemma 3 12B' },
      { id: 'llama3.1:8b', label: 'Llama 3.1 8B' },
      { id: 'phi4-mini', label: 'Phi-4 Mini' },
      { id: 'codellama:13b', label: 'CodeLlama 13B' },
    ],
  },
  {
    id: 'custom',
    label: 'Custom OpenAI-compatible endpoint',
    type: 'openai-compatible',
    kind: 'cloud',
    requiresKey: false,
    docsUrl: 'https://github.com/Navid-Moradimehr/RoundAIble#custom-providers',
    models: [],
  },
];

export function getProvider(id: string): ProviderDef | undefined {
  return PROVIDERS.find((p) => p.id === id);
}

const HOSTNAME_RE = /^[a-z0-9.-]+$/i;

/** Validate a model identifier before it is interpolated into URLs. */
export function isValidModelId(model: string): boolean {
  return model.length > 0 && model.length <= 200 && /^[a-zA-Z0-9 ._\-:/@+#]+$/.test(model);
}

/** Validate a custom base URL — must be http(s) with a sane host. */
export function isValidBaseUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    const host = parsed.hostname;
    if (!host || !HOSTNAME_RE.test(host)) return false;
    return true;
  } catch {
    return false;
  }
}

import { getProvider, isValidBaseUrl, isValidModelId } from './providers.js';

const DEBUG = process.env.DEBUG === 'roundaible' || process.env.DEBUG === '*';

export interface LlmRequest {
  providerId: string;
  model: string;
  prompt: string;
  apiKey?: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
}

export interface LlmResponse {
  content: string;
  model?: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

export class LlmError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly providerId?: string
  ) {
    super(message);
    this.name = 'LlmError';
  }
}

const DEFAULT_TIMEOUT_MS = 120_000;
const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);

function debugLog(...args: unknown[]) {
  if (DEBUG) console.log('[roundaible:debug]', ...args);
}

async function fetchJson(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    const text = await res.text();
    if (!res.ok) {
      throw new LlmError(
        `HTTP ${res.status} ${res.statusText}: ${text.slice(0, 300)}`,
        res.status
      );
    }
    try {
      return JSON.parse(text);
    } catch {
      throw new LlmError(`Invalid JSON response from provider`, res.status);
    }
  } catch (err) {
    if (err instanceof LlmError) throw err;
    if (err instanceof Error && err.name === 'AbortError') {
      throw new LlmError(`Request timed out after ${Math.round(timeoutMs / 1000)}s`);
    }
    throw new LlmError(
      `Network error: ${err instanceof Error ? err.message : 'unknown'}`
    );
  } finally {
    clearTimeout(timer);
  }
}

export class LlmClient {
  async generate(req: LlmRequest): Promise<LlmResponse> {
    if (!isValidModelId(req.model)) {
      throw new LlmError(`Invalid model identifier: "${req.model.slice(0, 50)}"`);
    }
    const provider = getProvider(req.providerId);
    if (!provider) throw new LlmError(`Unknown provider: ${req.providerId}`);

    let baseUrl = provider.baseUrl;
    if (provider.id === 'custom') {
      if (!req.baseUrl || !isValidBaseUrl(req.baseUrl)) {
        throw new LlmError('Custom provider requires a valid http(s) base URL');
      }
      baseUrl = req.baseUrl.replace(/\/+$/, '');
    }

    const timeoutMs = req.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const maxAttempts = 2;

    let lastError: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        switch (provider.type) {
          case 'openai-compatible':
            return await this.callOpenAiCompatible(baseUrl!, req, timeoutMs);
          case 'anthropic':
            return await this.callAnthropic(req, timeoutMs);
          case 'google':
            return await this.callGoogle(req, timeoutMs);
          case 'ollama':
            return await this.callOllama(provider.baseUrl!, req, timeoutMs);
        }
      } catch (err) {
        lastError = err;
        const status = err instanceof LlmError ? err.status : undefined;
        const retryable =
          status === undefined || // network error / timeout
          (status !== undefined && RETRYABLE_STATUS.has(status));
        const canRetry = retryable && attempt < maxAttempts;
        debugLog(`llm call failed (attempt ${attempt}):`, err instanceof Error ? err.message : err);
        if (!canRetry) break;
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
    throw lastError instanceof Error
      ? new LlmError(`${provider.label}: ${lastError.message}`, lastError instanceof LlmError ? lastError.status : undefined, provider.id)
      : new LlmError(`${provider.label}: unknown error`, undefined, provider.id);
  }

  private async callOpenAiCompatible(
    baseUrl: string,
    req: LlmRequest,
    timeoutMs: number
  ): Promise<LlmResponse> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (req.apiKey) headers['Authorization'] = `Bearer ${req.apiKey}`;

    const data = (await fetchJson(
      `${baseUrl}/chat/completions`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: req.model,
          messages: [{ role: 'user', content: req.prompt }],
          temperature: req.temperature ?? 0.7,
          max_tokens: req.maxTokens ?? 4096,
        }),
      },
      timeoutMs
    )) as any;

    return {
      content: data?.choices?.[0]?.message?.content ?? '',
      model: data?.model,
      usage: data?.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          }
        : undefined,
    };
  }

  private async callAnthropic(req: LlmRequest, timeoutMs: number): Promise<LlmResponse> {
    if (!req.apiKey) throw new LlmError('Anthropic requires an API key', 401, 'anthropic');

    const data = (await fetchJson(
      `https://api.anthropic.com/v1/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': req.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: req.model,
          max_tokens: req.maxTokens ?? 4096,
          messages: [{ role: 'user', content: req.prompt }],
          temperature: req.temperature ?? 0.7,
        }),
      },
      timeoutMs
    )) as any;

    return {
      content: data?.content?.[0]?.text ?? '',
      model: data?.model,
      usage: data?.usage
        ? {
            promptTokens: data.usage.input_tokens,
            completionTokens: data.usage.output_tokens,
            totalTokens:
              (data.usage.input_tokens ?? 0) + (data.usage.output_tokens ?? 0),
          }
        : undefined,
    };
  }

  private async callGoogle(req: LlmRequest, timeoutMs: number): Promise<LlmResponse> {
    if (!req.apiKey) throw new LlmError('Google Gemini requires an API key', 401, 'google');

    const data = (await fetchJson(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(req.model)}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': req.apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: req.prompt }] }],
          generationConfig: {
            temperature: req.temperature ?? 0.7,
            maxOutputTokens: req.maxTokens ?? 4096,
          },
        }),
      },
      timeoutMs
    )) as any;

    return {
      content: data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '',
      model: data?.modelVersion,
      usage: data?.usageMetadata
        ? {
            promptTokens: data.usageMetadata.promptTokenCount,
            completionTokens: data.usageMetadata.candidatesTokenCount,
            totalTokens: data.usageMetadata.totalTokenCount,
          }
        : undefined,
    };
  }

  private async callOllama(
    baseUrl: string,
    req: LlmRequest,
    timeoutMs: number
  ): Promise<LlmResponse> {
    const data = (await fetchJson(
      `${baseUrl}/api/generate`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: req.model,
          prompt: req.prompt,
          stream: false,
          options: {
            temperature: req.temperature ?? 0.7,
            num_predict: req.maxTokens ?? 4096,
          },
        }),
      },
      Math.max(timeoutMs, 300_000) // local models can be slow to load
    )) as any;

    return {
      content: data?.response ?? '',
      model: data?.model,
    };
  }
}

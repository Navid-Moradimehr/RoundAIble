# RoundAIble Web

**Multi-agent code generation with competitive critique — local-first, in your browser.**

RoundAIble lets you wire multiple AI models into a visual workflow: they all solve the same coding task, critique each other, and a critic panel scores every submission so the best one wins. Runs entirely on your machine — your code and API keys never leave it.

## How it works

1. **Design** — drag nodes onto the canvas: an **Input** node (new code / modify code / bug fix), one or more **Reasoning Agent** nodes, optional **Critic** nodes, and the **RoundAIble** orchestrator.
2. **Run** — agents generate solutions *in parallel*, optionally refine them through peer-review rounds, then every critic scores every submission on a 0–10 scale using structured output.
3. **Win** — the highest average score wins. Results stream live over SSE while the run is in progress.

## Honest notes (what this MVP does and doesn't do)

- ✅ Live progress via Server-Sent Events; finished runs are persisted to disk.
- ✅ Workflows autosave to your browser; export/import as JSON files.
- ✅ Single-agent runs are labeled **unranked** — no fabricated scores.
- ❌ No real-time collaboration or user accounts (by design — it's local-first).
- ❌ No cloud hosting story yet: the backend must run locally.

## Supported providers

| Cloud | Local |
| --- | --- |
| OpenAI (GPT-5 family, o3…) | Ollama (Qwen3 Coder, DeepSeek R1, Gemma 3…) |
| Anthropic (Claude Opus/Sonnet 4.x) | Any OpenAI-compatible server (LM Studio, vLLM, llama.cpp) via **Custom endpoint** |
| Google Gemini 2.5 | |
| xAI Grok, DeepSeek, Groq, Mistral, Perplexity, OpenRouter | |

All OpenAI-compatible providers share one client; add a provider by pointing the **Custom** option at its base URL.

## Quick start

```bash
git clone https://github.com/Navid-Moradimehr/RoundAIble.git
cd RoundAIble
npm install && npm install --prefix backend && npm install --prefix frontend

npm run dev        # starts backend (:4000) + frontend (:5173)
```

Open http://localhost:5173, click **🔑 API Keys** to store a key for your provider, then configure each agent node (double-click) and press **▶ Start**.

Optional configuration lives in `backend/.env` — see `backend/.env.example`.

## Testing without spending money

A stub LLM server mimics OpenAI-compatible responses so you can exercise the whole flow:

```bash
node backend/scripts/stub-llm.mjs          # listens on :4510
```

In the app, set any agent's provider to **Custom OpenAI-compatible endpoint**, base URL `http://localhost:4510/v1`, model `stub-1`, and run a template workflow.

## Development

```bash
npm run build       # typecheck + build both packages
npm run test        # backend unit tests (vitest): score parsing, response parsing
npm run lint        # eslint (frontend)
```

### Project layout

```
backend/
  src/routes/execution.ts     POST execute (returns runId) · SSE /runs/:id/events · /runs/:id/result
  src/services/
    providers.ts              Provider catalog + URL/model validation
    llmClient.ts              Unified client: timeouts, retry-once, no prompt logging
    prompts.ts                Codegen / peer-review / revision / critic prompt builders
    scoreParser.ts            Hardened critic-score parser (clamped, injection-resistant)
    workflowEngine.ts         Event-driven engine (parallel agents, honest unranked mode)
    runsStore.ts              In-memory + on-disk run persistence
frontend/
  src/components/NodeEditor.tsx   Slim orchestrator (~550 lines incl. JSX)
  src/components/nodes/*          Canvas node components
  src/hooks/*                     useApiKeys · useWorkflows · useRun · useBackendHealth · useToasts
  src/lib/*                       api client · provider catalog · templates · validation · storage
```

## Security model (MVP scope)

- API keys are stored only in your browser (`localStorage`) and sent per-run to the local backend in a dedicated header — never inside workflow graphs, never logged, never persisted server-side.
- The backend binds to `127.0.0.1` by default; CORS allows only localhost origins unless configured otherwise.
- Critic scores are clamped to 0–10, restricted to known submission indices, and parsed from structured output so agent output can't manipulate rankings.
- Model IDs and custom base URLs are validated before being used in requests.

## License

MIT — see [LICENSE](LICENSE).

// Minimal OpenAI-compatible stub server for local e2e testing without real
// API keys. Detects critic prompts and answers with valid JSON scores;
// everything else gets a deterministic code-generation response.
import http from 'node:http';

const PORT = Number(process.env.STUB_PORT || 4510);

function isCritic(prompt) {
  return prompt.includes('"code":1') || prompt.includes('Score every submission');
}

function codeAnswer(requestText) {
  const match = requestText.match(/User request:\n([\s\S]*?)\n\n/);
  const topic = (match ? match[1] : 'task').trim().slice(0, 60);
  return `---
Filename: solution.py
\`\`\`
def solve():
    """Stub solution for: ${topic.replace(/"/g, "'")}"""
    return "ok"
\`\`\`
---
Description: Stub generated solution.`;
}

function criticAnswer() {
  return JSON.stringify([
    { code: 1, score: 8.5, feedback: 'Clean structure, decent naming.' },
    { code: 2, score: 6, feedback: 'Works but lacks error handling.' },
    { code: 3, score: 7, feedback: 'Reasonable middle ground.' },
  ]);
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url?.endsWith('/chat/completions')) {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      let prompt = '';
      try {
        prompt = JSON.parse(body).messages?.[0]?.content ?? '';
      } catch {
        /* ignore */
      }
      const content = isCritic(prompt)
        ? criticAnswer()
        : codeAnswer(prompt);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          model: 'stub-1',
          choices: [{ message: { role: 'assistant', content } }],
          usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
        })
      );
    });
    return;
  }
  res.writeHead(404);
  res.end('not found');
});

server.listen(PORT, () => {
  console.log(`Stub LLM server listening on http://127.0.0.1:${PORT}/v1/chat/completions`);
});

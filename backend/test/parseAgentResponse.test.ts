import { describe, it, expect } from 'vitest';
import { parseAgentResponse } from '../src/services/workflowEngine.js';

describe('parseAgentResponse', () => {
  it('extracts filename blocks and description in the canonical format', () => {
    const response = `---
Filename: main.py
\`\`\`
print("hello")
\`\`\`
---
Description: A hello world script.`;
    const parsed = parseAgentResponse(response);
    expect(parsed.codes).toEqual([{ filename: 'main.py', content: 'print("hello")' }]);
    expect(parsed.description).toBe('A hello world script.');
  });

  it('handles multiple files and strips fences', () => {
    const response = `---
Filename: app.py
\`\`\`python
x = 1
\`\`\`
---
Filename: utils.py
\`\`\`
y = 2
\`\`\`
---
Description: Two modules.`;
    const parsed = parseAgentResponse(response);
    expect(parsed.codes).toHaveLength(2);
    expect(parsed.codes[0]).toEqual({ filename: 'app.py', content: 'x = 1' });
    expect(parsed.codes[1].filename).toBe('utils.py');
    expect(parsed.codes[1].content).not.toContain('```');
  });

  it('falls back to a bare fenced code block without the --- convention', () => {
    const response = 'Here you go:\n```js\nconsole.log("hi")\n```\nHope this helps!';
    const parsed = parseAgentResponse(response);
    expect(parsed.codes).toEqual([{ filename: 'main.py', content: 'console.log("hi")' }]);
  });

  it('falls back to the raw response when there is no structure at all', () => {
    const parsed = parseAgentResponse('just some plain text answer');
    expect(parsed.codes).toHaveLength(1);
    expect(parsed.codes[0].content).toBe('just some plain text answer');
  });
});

export interface CodegenContext {
  inputType: 'new-code' | 'modify-code' | 'fix-bug';
  userPrompt: string;
  existingCode: string;
  modificationRequest: string;
  errorMessage: string;
  additionalContext: string;
}

const OUTPUT_FORMAT = `Respond in exactly this format (and nothing before it):
---
Filename: <filename>
\`\`\`
<complete code>
\`\`\`
---
Description: <short explanation of your solution>`;

export function buildCodeGenPrompt(ctx: CodegenContext): string {
  switch (ctx.inputType) {
    case 'fix-bug':
      return `You are an expert software engineer. Fix the bug described below.

Bug description:
${ctx.userPrompt}

Error message:
${ctx.errorMessage || '(not provided)'}

Additional context:
${ctx.additionalContext || '(none)'}

Existing code:
${ctx.existingCode}

${OUTPUT_FORMAT}`;
    case 'modify-code':
      return `You are an expert software engineer. Modify the provided code as requested.

Modification request:
${ctx.userPrompt}

Modification details:
${ctx.modificationRequest}

Existing code:
${ctx.existingCode}

${OUTPUT_FORMAT}`;
    default:
      return `You are an expert software engineer. Write high-quality, complete, runnable code for the following request.

User request:
${ctx.userPrompt}

${OUTPUT_FORMAT}`;
  }
}

function formatCodes(codes: Array<{ filename: string; content: string }>): string {
  return codes
    .map((c) => `Filename: ${c.filename}\n\`\`\`\n${c.content}\n\`\`\``)
    .join('\n\n');
}

export function buildSelfReviewPrompt(
  userPrompt: string,
  codes: Array<{ filename: string; content: string }>,
  description: string
): string {
  return `You are reviewing your own previous work. Improve your code based on the original request.

Original request:
${userPrompt}

Your previous code:
${formatCodes(codes)}

Previous explanation:
${description}

Consider code quality, efficiency, error handling, documentation and edge cases. Provide your improved version.

${OUTPUT_FORMAT}`;
}

export function buildPeerReviewPrompt(
  userPrompt: string,
  peers: Array<{ agentId: string; codes: Array<{ filename: string; content: string }>; description: string }>
): string {
  const peerBlocks = peers
    .map(
      (p) => `Agent: ${p.agentId}
${formatCodes(p.codes)}
Explanation: ${p.description}`
    )
    .join('\n\n');

  return `You are participating in a peer review session with other AI agents.

Original request:
${userPrompt}

Peer submissions:
${peerBlocks}

Review your peers' code, learn from their approaches, then provide YOUR OWN improved final version.

${OUTPUT_FORMAT}`;
}

export function buildRevisionPrompt(
  userPrompt: string,
  previousCode: string,
  peerFeedbacks: string[]
): string {
  return `You received peer feedback on your code. Revise and improve it.

Original request:
${userPrompt}

Your previous code:
${previousCode}

Peer feedback:
${peerFeedbacks.map((f) => `- ${f}`).join('\n')}

${OUTPUT_FORMAT}`;
}

export function buildCriticPrompt(
  ctx: CodegenContext,
  submissions: Array<{ index: number; agentId: string; content: string }>
): string {
  const task =
    ctx.inputType === 'fix-bug'
      ? `Evaluate these bug fixes for: "${ctx.userPrompt}"
Error message: ${ctx.errorMessage}
Original code:
${ctx.existingCode}`
      : ctx.inputType === 'modify-code'
        ? `Evaluate these code modifications for: "${ctx.userPrompt}"
Modification request: ${ctx.modificationRequest}
Original code:
${ctx.existingCode}`
      : `Evaluate these code submissions for: "${ctx.userPrompt}"`;

  const blocks = submissions
    .map((s) => `Code ${s.index} (from ${s.agentId}):\n${s.content}`)
    .join('\n\n---\n\n');

  return `You are a strict senior code reviewer. ${task}

Submissions:
${blocks}

Score every submission from 0 to 10 on correctness, completeness, error handling and readability.
Judge ONLY the code quality — do not favor any agent by name.

Respond with ONLY a JSON array, no other text, in this exact shape:
[{"code":1,"score":7.5,"feedback":"one short paragraph"},{"code":2,"score":4,"feedback":"..."}]

Include one entry per submission (${submissions.length} total).`;
}

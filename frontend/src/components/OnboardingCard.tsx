import { useState } from 'react';

/**
 * First-visit quick start. Dismissing it persists across sessions and is
 * also triggered automatically after the first completed run.
 */
export default function OnboardingCard({ onDismiss }: { onDismiss: () => void }) {
  const [leaving, setLeaving] = useState(false);

  const dismiss = () => {
    setLeaving(true);
    setTimeout(onDismiss, 180);
  };

  return (
    <div
      className={`fixed bottom-4 left-4 z-[900] w-[340px] rounded-xl border border-blue-200 bg-white p-4 shadow-2xl transition-all duration-200 ${
        leaving ? 'translate-y-2 opacity-0' : 'opacity-100'
      }`}
      data-testid="onboarding-card"
      role="dialog"
      aria-label="Getting started"
    >
      <div className="mb-2 flex items-start justify-between">
        <h3 className="text-sm font-bold text-gray-800">
          👋 Welcome! Your first run in 3 steps
        </h3>
        <button
          className="-mt-1 rounded px-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          onClick={dismiss}
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>

      <ol className="space-y-2 text-xs leading-relaxed text-gray-600">
        <li>
          <b className="text-gray-800">1️⃣ Add an API key</b> — click{' '}
          <span className="rounded border border-gray-300 px-1 py-px font-medium">🔑 API Keys</span>{' '}
          above, choose a provider and paste your key. Using local Ollama models? No key needed.
        </li>
        <li>
          <b className="text-gray-800">2️⃣ Configure the nodes</b> — double-click each agent/critic
          to pick its provider &amp; model, then type your task in the Input node.
        </li>
        <li>
          <b className="text-gray-800">3️⃣ Press ▶ Start</b> — agents compete in parallel, critics
          score every submission, and the winner appears in the Results panel.
        </li>
      </ol>

      <p className="mt-2.5 rounded-md bg-blue-50 px-2 py-1.5 text-[11px] leading-snug text-blue-800">
        💡 Tip: load a ready-made example from <b>Templates</b> in the left sidebar — or test for
        free without API keys using the bundled stub server (see the README).
      </p>

      <button
        className="mt-3 w-full rounded-lg bg-blue-600 py-1.5 text-sm font-semibold text-white hover:bg-blue-700"
        onClick={dismiss}
      >
        Got it — let's build
      </button>
    </div>
  );
}

import type { Toast } from '../hooks/useToasts';

const STYLES: Record<Toast['kind'], string> = {
  success: 'bg-green-600',
  error: 'bg-red-600',
  info: 'bg-blue-600',
};

export default function Toasts({
  toasts,
  dismiss,
}: {
  toasts: Toast[];
  dismiss: (id: number) => void;
}) {
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[2000] flex w-[360px] flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="alert"
          className={`pointer-events-auto flex items-start justify-between gap-3 rounded-lg px-3 py-2.5 text-sm text-white shadow-xl ${STYLES[t.kind]}`}
        >
          <span className="whitespace-pre-wrap leading-snug">{t.text}</span>
          <button
            type="button"
            className="shrink-0 font-bold opacity-80 hover:opacity-100"
            onClick={() => dismiss(t.id)}
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

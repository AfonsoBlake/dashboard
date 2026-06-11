import { Sparkles, X } from "lucide-react";

interface AiSuggestionBarProps {
  suggestion: string | null;
  loading: boolean;
  onAccept: (value: string) => void;
  onDismiss: () => void;
}

export function AiSuggestionBar({ suggestion, loading, onAccept, onDismiss }: AiSuggestionBarProps) {
  if (!suggestion && !loading) return null;

  return (
    <div className="animate-fade-up mt-2 flex items-start gap-2 rounded-xl border border-primary/40 bg-primary/10 px-3 py-2 text-xs text-primary">
      <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      {loading ? (
        <p className="flex-1 text-muted-foreground">...</p>
      ) : (
        <>
          <p className="flex-1 text-foreground/90">{suggestion}</p>
          <button
            type="button"
            onClick={() => suggestion && onAccept(suggestion)}
            className="shrink-0 rounded-2xl bg-primary px-3 py-1 text-[11px] font-semibold text-white hover:bg-primary/90 transition-colors"
          >
            Apply
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="shrink-0 p-0.5 text-muted-foreground/60 hover:text-foreground transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </>
      )}
    </div>
  );
}

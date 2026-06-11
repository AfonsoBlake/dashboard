import { Trash2, Plus } from "lucide-react";
import { AiSuggestionBar } from "@/components/AiSuggestionBar";
import { useAiSuggestion, type BusinessContext } from "@/hooks/useAiSuggestion";

export interface FollowUpStep {
  step: number;
  delay_hours: number;
  message_instruction: string;
  tone: "friendly" | "direct" | "urgent" | "casual" | "professional";
}

const TONE_OPTIONS: { value: FollowUpStep["tone"]; label: string }[] = [
  { value: "friendly", label: "Friendly" },
  { value: "direct", label: "Direct" },
  { value: "urgent", label: "Urgent" },
  { value: "casual", label: "Casual" },
  { value: "professional", label: "Professional" },
];

interface Props {
  steps: FollowUpStep[];
  onChange: (steps: FollowUpStep[]) => void;
  businessContext?: BusinessContext;
}

export function FollowUpStepsBuilder({ steps, onChange, businessContext }: Props) {
  function addStep() {
    if (steps.length >= 5) return;
    onChange([
      ...steps,
      { step: steps.length + 1, delay_hours: 24, message_instruction: "", tone: "friendly" },
    ]);
  }

  function removeStep(index: number) {
    if (steps.length <= 1) return;
    onChange(steps.filter((_, i) => i !== index).map((s, i) => ({ ...s, step: i + 1 })));
  }

  function updateStep(index: number, patch: Partial<FollowUpStep>) {
    onChange(steps.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  return (
    <div className="mt-3 space-y-2.5">
      {steps.map((step, i) => (
        <FollowUpStepCard
          key={i}
          step={step}
          index={i}
          canRemove={steps.length > 1}
          businessContext={businessContext}
          onUpdate={patch => updateStep(i, patch)}
          onRemove={() => removeStep(i)}
        />
      ))}

      {steps.length < 5 && (
        <button
          type="button"
          onClick={addStep}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/10 py-3 text-sm text-muted-foreground hover:border-white/20 hover:text-foreground transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Step
        </button>
      )}
    </div>
  );
}

interface FollowUpStepCardProps {
  step: FollowUpStep;
  index: number;
  canRemove: boolean;
  businessContext?: BusinessContext;
  onUpdate: (patch: Partial<FollowUpStep>) => void;
  onRemove: () => void;
}

function FollowUpStepCard({ step, index, canRemove, businessContext, onUpdate, onRemove }: FollowUpStepCardProps) {
  const { suggestion, loading, triggerSuggestion, dismiss } = useAiSuggestion({
    fieldType: "follow_up_instruction",
    businessContext: businessContext ?? {},
  });

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
          Step {step.step}
        </p>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="p-1 text-muted-foreground/60 hover:text-red-400 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="number"
          min={1}
          value={step.delay_hours}
          onChange={e => onUpdate({ delay_hours: Math.max(1, Number(e.target.value)) })}
          className="w-20 rounded-xl border border-white/10 bg-[hsl(233_30%_8%)] px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary/50 text-center"
        />
        <span className="text-xs text-muted-foreground">
          {index === 0 ? "hours after no reply" : "hours after previous step"}
        </span>
      </div>

      <textarea
        rows={2}
        value={step.message_instruction}
        onChange={e => { onUpdate({ message_instruction: e.target.value }); triggerSuggestion(e.target.value); }}
        placeholder="Tell the AI what to aim for in this message e.g. 'Soft check-in, remind them what they were interested in'"
        className="w-full rounded-xl border border-white/10 bg-[hsl(233_30%_8%)] px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/50 resize-none placeholder:text-muted-foreground/50"
      />
      <AiSuggestionBar
        suggestion={suggestion}
        loading={loading}
        onAccept={value => { onUpdate({ message_instruction: value }); dismiss(); }}
        onDismiss={dismiss}
      />

      <select
        value={step.tone}
        onChange={e => onUpdate({ tone: e.target.value as FollowUpStep["tone"] })}
        className="w-full rounded-xl border border-white/10 bg-[hsl(233_30%_8%)] px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50"
      >
        {TONE_OPTIONS.map(o => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

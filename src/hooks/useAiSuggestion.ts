import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AiSuggestionFieldType = "screening_question" | "bad_lead" | "follow_up_instruction";

export interface BusinessContext {
  business_type?: string;
  niche?: string;
  ai_name?: string;
}

interface UseAiSuggestionOptions {
  fieldType: AiSuggestionFieldType;
  businessContext: BusinessContext;
  debounceMs?: number;
}

export function useAiSuggestion({ fieldType, businessContext, debounceMs = 900 }: UseAiSuggestionOptions) {
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getSuggestion = useCallback(async (value: string) => {
    if (!value || value.trim().length < 8) {
      setSuggestion(null);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-input-correction", {
        body: { field_type: fieldType, value: value.trim(), context: businessContext },
      });
      if (!error && data?.suggestion && data.suggestion.toLowerCase().trim() !== value.toLowerCase().trim()) {
        setSuggestion(data.suggestion as string);
      } else {
        setSuggestion(null);
      }
    } catch {
      setSuggestion(null);
    }
    setLoading(false);
  }, [fieldType, businessContext]);

  const triggerSuggestion = useCallback((value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSuggestion(null);
    debounceRef.current = setTimeout(() => getSuggestion(value), debounceMs);
  }, [getSuggestion, debounceMs]);

  const dismiss = useCallback(() => setSuggestion(null), []);

  return { suggestion, loading, triggerSuggestion, dismiss };
}

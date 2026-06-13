import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { X, ArrowUp } from "lucide-react";

type EscalationRules = {
  cant_answer?: boolean;
  angry_lead?: boolean;
  competitor_mentioned?: boolean;
  injury_concern?: boolean;
  ready_to_buy?: boolean;
  callback_request?: boolean;
  repeated_questions?: boolean;
  lead_silent_hours?: number | null;
  bulk_vip?: boolean;
  specific_keywords?: string[];
};

export type ConfigData = {
  business_name?: string | null;
  business_type?: string | null;
  niche?: string | null;
  ai_name?: string | null;
  ai_personality?: string | null;
  pricing?: string | null;
  location?: string | null;
  opening_hours?: string | null;
  bio?: string | null;
  screening_questions?: string[] | null;
  qualification_strictness?: string | null;
  bad_lead_definition?: string | null;
  goal?: string | null;
  system_prompt?: string | null;
  escalation_rules?: EscalationRules | null;
  demo_mode?: { enabled?: boolean; keyword?: string } | null;
  response_length_style?: "concise" | "balanced" | "detailed" | null;
};

const RESPONSE_STYLE_OPTIONS: Array<{
  value: "concise" | "balanced" | "detailed";
  label: string;
  description: string;
}> = [
  { value: "concise", label: "Concise", description: "Short, punchy replies. 1-3 sentences max. Best for quick back-and-forth." },
  { value: "balanced", label: "Balanced", description: "Conversational length. Enough detail without being overwhelming." },
  { value: "detailed", label: "Detailed", description: "Thorough responses. Explains fully, lists options, handles objections in one message." },
];

type Message = { role: "user" | "assistant"; content: string };

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onApplyConfig: (cfg: ConfigData, messages: Message[]) => void;
  businessId: string | null;
};

export function OnboardingChat({ isOpen, onClose, onApplyConfig, businessId }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [configData, setConfigData] = useState<ConfigData | null>(null);
  const [responseStyle, setResponseStyle] = useState<"concise" | "balanced" | "detailed">("balanced");
  const [started, setStarted] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (!isOpen) {
      setMessages([]);
      setInput("");
      setConfigData(null);
      setStarted(false);
      setLoading(false);
    }
  }, [isOpen]);

  const callEdgeFunction = async (msgs: Message[]) => {
    const { data: cfg } = await (supabase as any)
      .from("business_configs")
      .select("chat_response_style")
      .eq("business_id", businessId)
      .single();

    const { data, error } = await supabase.functions.invoke("Ai-Chat-Dashboard-very-important", {
      body: {
        messages: msgs,
        responseStyle: cfg?.chat_response_style ?? "Keep replies to 1-2 short sentences. One question at a time. Casual and direct.",
      },
    });
    if (error) throw error;
    return data as { reply: string; config_data: ConfigData | null; complete: boolean };
  };

  const startChat = async () => {
    setStarted(true);
    setLoading(true);
    try {
      const data = await callEdgeFunction([]);
      setMessages([{ role: "assistant", content: data.reply }]);
    } catch {
      setMessages([{ role: "assistant", content: "Sorry, hit a snag — try again?" }]);
    }
    setLoading(false);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Message = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setTimeout(() => inputRef.current?.focus(), 0);
    setLoading(true);
    try {
      const data = await callEdgeFunction(newMessages);
      setMessages([...newMessages, { role: "assistant", content: data.reply }]);
      if (data.complete && data.config_data) {
        setConfigData(data.config_data);
        setResponseStyle(data.config_data.response_length_style ?? "balanced");
      }
    } catch {
      setMessages([...newMessages, { role: "assistant", content: "Sorry, hit a snag — try again?" }]);
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        className="relative flex w-full flex-col rounded-2xl border border-white/10 bg-[#0D0D1F] shadow-2xl"
        style={{ width: "600px", height: "500px", maxWidth: "100%", maxHeight: "90vh" }}
      >
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Quick Setup</p>
              <h2 className="mt-1 text-lg font-semibold text-foreground">Generate my AI config</h2>
            </div>
            <button type="button" onClick={onClose} className="rounded-xl p-2 text-muted-foreground hover:bg-white/[0.06] hover:text-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="h-px w-full bg-white/10" />

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4" style={{ minHeight: 0 }}>
          {!started ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
              <p className="text-sm text-muted-foreground max-w-sm">Answer a few questions and the AI will configure your entire dashboard automatically.</p>
              <button type="button" onClick={startChat} className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary/90">
                Start setup
              </button>
            </div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <div key={i} className={cn("flex items-end gap-2 max-w-[85%] animate-message-in", msg.role === "user" ? "ml-auto flex-row-reverse" : "")}>
                  {msg.role === "assistant" && (
                    <div className="h-7 w-7 shrink-0 rounded-full bg-purple-500/30 border border-purple-400/40" />
                  )}
                  <div
                    className={cn(
                      "px-4 py-3 text-sm leading-relaxed",
                      msg.role === "assistant"
                        ? "rounded-2xl rounded-bl-sm bg-white/[0.06] text-foreground"
                        : "rounded-2xl rounded-br-sm bg-[#6366F1] text-white"
                    )}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex items-end gap-2 max-w-[85%] animate-message-in">
                  <div className="h-7 w-7 shrink-0 rounded-full bg-purple-500/30 border border-purple-400/40" />
                  <div className="rounded-2xl rounded-bl-sm bg-white/[0.06] px-4 py-3 flex items-center gap-1.5">
                    <span className="typing-dot h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                    <span className="typing-dot h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                    <span className="typing-dot h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {started && (
          <div className="px-4 py-3">
            <div
              className={cn(
                "flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] pl-4 pr-1.5 py-1.5 transition-all",
                inputFocused ? "border-white/20 ring-1 ring-[#6366F1]/40" : ""
              )}
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendMessage()}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                autoFocus
                placeholder="Type your answer..."
                className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground py-1.5"
              />
              <button
                type="button"
                onClick={sendMessage}
                disabled={loading}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#6366F1] text-white hover:bg-[#6366F1]/90 disabled:opacity-40"
                aria-label="Send"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {configData && (
          <div className="border-t border-white/[0.06] px-6 py-4 space-y-3">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Response Style</p>
              <p className="mt-1 text-sm text-foreground">How long should the AI's replies be?</p>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              {RESPONSE_STYLE_OPTIONS.map((opt) => {
                const selected = responseStyle === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setResponseStyle(opt.value)}
                    className={cn(
                      "rounded-xl border p-3 text-left transition-colors",
                      selected
                        ? "border-[#6366F1] bg-[#6366F1]/10"
                        : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                    )}
                  >
                    <p className={cn("text-sm font-semibold", selected ? "text-[#A5A8FF]" : "text-foreground")}>
                      {opt.label}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{opt.description}</p>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => {
                onApplyConfig({ ...configData, response_length_style: responseStyle }, messages);
                onClose();
              }}
              className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white hover:bg-primary/90"
            >
              ✓ Apply my config
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

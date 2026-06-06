import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

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
};

type Message = { role: "user" | "assistant"; content: string };

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onApplyConfig: (cfg: ConfigData) => void;
  gymId: string | null;
};

export function OnboardingChat({ isOpen, onClose, onApplyConfig, gymId }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [configData, setConfigData] = useState<ConfigData | null>(null);
  const [started, setStarted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    const { data, error } = await supabase.functions.invoke("Ai-Chat-Dashboard-very-important", {
      body: { messages: msgs },
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
    setLoading(true);
    try {
      const data = await callEdgeFunction(newMessages);
      setMessages([...newMessages, { role: "assistant", content: data.reply }]);
      if (data.complete && data.config_data) {
        setConfigData(data.config_data);
      }
    } catch {
      setMessages([...newMessages, { role: "assistant", content: "Sorry, hit a snag — try again?" }]);
    }
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl rounded-[24px] border border-white/[0.08] bg-[hsl(233_30%_8%)] shadow-2xl flex flex-col" style={{ maxHeight: "85vh" }}>
        <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Quick Setup</p>
            <h2 className="mt-1 text-lg font-semibold text-foreground">Generate my AI config</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-muted-foreground hover:bg-white/[0.06] hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4" style={{ minHeight: 0 }}>
          {!started ? (
            <div className="flex flex-col items-center justify-center h-48 gap-4 text-center">
              <p className="text-sm text-muted-foreground max-w-sm">Answer a few questions and the AI will configure your entire dashboard automatically.</p>
              <button type="button" onClick={startChat} className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary/90">
                Start setup
              </button>
            </div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <div key={i} className={cn("flex gap-3 max-w-[85%]", msg.role === "user" ? "ml-auto flex-row-reverse" : "")}>
                  <div className={cn("rounded-2xl px-4 py-3 text-sm leading-relaxed", msg.role === "assistant" ? "bg-white/[0.06] text-foreground" : "bg-primary text-white")}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-3 max-w-[85%]">
                  <div className="rounded-2xl bg-white/[0.06] px-4 py-3 text-sm text-muted-foreground">...</div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {started && (
          <div className="border-t border-white/[0.06] px-4 py-3 flex gap-3">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendMessage()}
              disabled={loading || !!configData}
              placeholder={configData ? "Config complete" : "Type your answer..."}
              className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary/50 placeholder:text-muted-foreground disabled:opacity-40"
            />
            <button type="button" onClick={sendMessage} disabled={loading || !!configData} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-40">
              Send
            </button>
          </div>
        )}

        {configData && (
          <div className="border-t border-white/[0.06] px-6 py-4">
            <button
              type="button"
              onClick={() => { onApplyConfig(configData); onClose(); }}
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

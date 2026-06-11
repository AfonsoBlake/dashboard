import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Instagram, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useGymContext } from "@/hooks/useGymContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { displayName } from "@/lib/displayHelpers";
import { toast } from "sonner";
import type { ChatMessage } from "@/hooks/useDashboardData";

const CARD_STYLE = "bg-[#0a0a1f] border border-violet-500/40 shadow-[0_0_24px_rgba(168,85,247,0.12)]";

type EscalationRow = {
  id: string;
  name: string | null;
  platform: string | null;
  escalation_reason: string | null;
  escalated_at: string | null;
  messages: unknown;
  score: string | null;
};

function relativeTime(iso: string | null): string {
  if (!iso) return "—";
  const diffMs = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diffMs / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function lastUserMessagePreview(messages: unknown): string {
  const msgs = Array.isArray(messages) ? (messages as ChatMessage[]) : [];
  for (let i = msgs.length - 1; i >= 0; i--) {
    const role = (msgs[i].role ?? "").toLowerCase();
    if (role === "user") {
      const text = (msgs[i].content ?? msgs[i].text ?? "").trim();
      if (!text) return "—";
      return text.length > 60 ? `${text.slice(0, 60)}…` : text;
    }
  }
  return "—";
}

const REASON_BADGES: Array<{ test: (s: string) => boolean; cls: string }> = [
  { test: (s) => s.includes("ready") && s.includes("buy"), cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40" },
  { test: (s) => s.includes("angry") || s.includes("frustrat"), cls: "bg-red-500/15 text-red-300 border-red-500/40" },
  { test: (s) => s.includes("competitor"), cls: "bg-orange-500/15 text-orange-300 border-orange-500/40" },
  { test: (s) => s.includes("cant") || s.includes("can't") || s.includes("cannot"), cls: "bg-blue-500/15 text-blue-300 border-blue-500/40" },
  { test: (s) => s.includes("callback"), cls: "bg-purple-500/15 text-purple-300 border-purple-500/40" },
  { test: (s) => s.includes("injury") || s.includes("medical"), cls: "bg-red-500/15 text-red-300 border-red-500/40" },
  { test: (s) => s.includes("repeat"), cls: "bg-yellow-500/15 text-yellow-300 border-yellow-500/40" },
];
const DEFAULT_BADGE_CLS = "bg-white/[0.06] text-muted-foreground border-white/10";

function reasonBadgeClass(reason: string | null): string {
  if (!reason) return DEFAULT_BADGE_CLS;
  const norm = reason.toLowerCase().replace(/_/g, " ");
  return REASON_BADGES.find((b) => b.test(norm))?.cls ?? DEFAULT_BADGE_CLS;
}

function reasonLabel(reason: string | null): string {
  if (!reason) return "Escalated";
  const norm = reason.replace(/_/g, " ").trim();
  return norm.charAt(0).toUpperCase() + norm.slice(1);
}

type Props = {
  onOpenConversation: (contactId: string) => void;
};

export function EscalationsView({ onOpenConversation }: Props) {
  const { businessId } = useGymContext();
  const [escalations, setEscalations] = useState<EscalationRow[]>([]);
  const [resolvedTodayCount, setResolvedTodayCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const fetchEscalations = useCallback(async () => {
    if (!businessId) return;
    const { data, error } = await (supabase as any)
      .from("contacts")
      .select("id, name, platform, escalation_reason, escalated_at, messages, score")
      .eq("business_id", businessId)
      .eq("ai_paused", true)
      .order("escalated_at", { ascending: false });
    if (error) {
      toast.error(`Failed to load escalations: ${error.message}`);
      return;
    }
    setEscalations((data ?? []) as EscalationRow[]);
  }, [businessId]);

  const fetchResolvedToday = useCallback(async () => {
    if (!businessId) return;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const { count, error } = await (supabase as any)
      .from("contacts")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .eq("ai_paused", false)
      .gte("escalated_at", startOfDay.toISOString());
    if (error) {
      toast.error(`Failed to load resolved count: ${error.message}`);
      return;
    }
    setResolvedTodayCount(count ?? 0);
  }, [businessId]);

  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      await Promise.all([fetchEscalations(), fetchResolvedToday()]);
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [businessId, fetchEscalations, fetchResolvedToday]);

  useEffect(() => {
    if (!businessId) return;
    const channel = supabase
      .channel("escalations")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "contacts", filter: `business_id=eq.${businessId}` },
        () => {
          fetchEscalations();
          fetchResolvedToday();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [businessId, fetchEscalations, fetchResolvedToday]);

  const resolveEscalation = async (contactId: string) => {
    setResolvingId(contactId);
    const { error } = await (supabase as any)
      .from("contacts")
      .update({
        ai_paused: false,
        escalation_reason: null,
        escalated_at: null,
        status: "active",
      })
      .eq("id", contactId);
    setResolvingId(null);
    if (error) {
      toast.error(`Could not resolve: ${error.message}`);
      return;
    }
    setEscalations((prev) => prev.filter((e) => e.id !== contactId));
    toast.success("Escalation resolved");
  };

  return (
    <div className="space-y-5">
      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className={cn("rounded-2xl p-5", CARD_STYLE)}>
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Needs attention</p>
          <p className="mt-3 font-display text-3xl font-semibold text-foreground">
            {loading ? "—" : escalations.length}
          </p>
        </div>
        <div className={cn("rounded-2xl p-5", CARD_STYLE)}>
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Resolved today</p>
          <p className="mt-3 font-display text-3xl font-semibold text-foreground">
            {loading ? "—" : resolvedTodayCount}
          </p>
        </div>
        <div className={cn("rounded-2xl p-5", CARD_STYLE)}>
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Avg response time</p>
          <p className="mt-3 font-display text-3xl font-semibold text-foreground">—</p>
        </div>
      </div>

      {/* Escalation list */}
      {loading ? (
        <div className={cn("rounded-2xl p-10 text-center text-sm text-muted-foreground", CARD_STYLE)}>
          Loading…
        </div>
      ) : escalations.length === 0 ? (
        <div className={cn("flex flex-col items-center justify-center gap-3 rounded-2xl py-16 text-center", CARD_STYLE)}>
          <CheckCircle2 className="h-10 w-10 text-emerald-400" />
          <p className="text-lg font-semibold text-foreground">All clear</p>
          <p className="max-w-md text-sm text-muted-foreground">No conversations need your attention right now.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {escalations.map((e) => {
            const initial = displayName(e.name).charAt(0).toUpperCase();
            const isResolving = resolvingId === e.id;
            return (
              <div
                key={e.id}
                className={cn("flex flex-col gap-3 rounded-2xl p-4 md:flex-row md:items-center md:justify-between", CARD_STYLE)}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                    {initial}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-foreground">{displayName(e.name)}</span>
                      {e.platform && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[11px] text-muted-foreground">
                          {e.platform.toLowerCase() === "instagram" && <Instagram className="h-3 w-3" />}
                          {e.platform}
                        </span>
                      )}
                      <span className={cn("inline-flex shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium", reasonBadgeClass(e.escalation_reason))}>
                        {reasonLabel(e.escalation_reason)}
                      </span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{relativeTime(e.escalated_at)}</span>
                      <span className="hidden text-muted-foreground/40 md:inline">·</span>
                      <span className="hidden truncate md:inline">{lastUserMessagePreview(e.messages)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
                  <Button size="sm" variant="outline" onClick={() => onOpenConversation(e.id)}>
                    View conversation
                  </Button>
                  <Button size="sm" onClick={() => resolveEscalation(e.id)} disabled={isResolving}>
                    {isResolving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Resolve
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

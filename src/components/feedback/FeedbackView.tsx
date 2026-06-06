import { useEffect, useMemo, useState } from "react";
import { Instagram, MessageSquare, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useGymContext } from "@/hooks/useGymContext";
import { useFeedback, type FeedbackRow } from "@/contexts/FeedbackContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function statusBadge(status: string) {
  if (status === "unread") return { label: "New", cls: "bg-primary/15 text-[#7C3AED] border-[#7C3AED]/40" };
  if (status === "resolved") return { label: "Resolved", cls: "bg-emerald-500/15 text-emerald-300 border-emerald-500/40" };
  return { label: "Read", cls: "bg-white/[0.06] text-muted-foreground border-white/10" };
}

export function FeedbackView() {
  const { gymId } = useGymContext();
  const { setUnreadCount, setIsOnFeedbackPage, onNewFeedback } = useFeedback();
  const [rows, setRows] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Mark page as active
  useEffect(() => {
    setIsOnFeedbackPage(true);
    return () => setIsOnFeedbackPage(false);
  }, [setIsOnFeedbackPage]);

  // Initial load + mark unread as read (once)
  useEffect(() => {
    if (!gymId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("feedback")
        .select("*")
        .eq("business_id", String(gymId))
        .order("created_at", { ascending: false });
      if (cancelled) return;
      if (error) {
        toast.error(`Failed to load feedback: ${error.message}`);
        setLoading(false);
        return;
      }
      setRows((data ?? []) as FeedbackRow[]);
      setLoading(false);

      // Mark all unread as read (fires once on landing)
      await supabase
        .from("feedback")
        .update({ status: "read" })
        .eq("business_id", String(gymId))
        .eq("status", "unread");
      setUnreadCount(0);
    })();
    return () => { cancelled = true; };
  }, [gymId, setUnreadCount]);

  // Listen for incoming realtime feedback while on this page
  useEffect(() => {
    const off = onNewFeedback((row) => {
      setRows((prev) => (prev.some(r => r.id === row.id) ? prev : [{ ...row, status: "read" }, ...prev]));
    });
    return off;
  }, [onNewFeedback]);

  const stats = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfWeek = startOfToday - (now.getDay() === 0 ? 6 : now.getDay() - 1) * 86400000;
    return {
      thisWeek: rows.filter(r => new Date(r.created_at).getTime() >= startOfWeek).length,
      pending: rows.filter(r => r.status !== "resolved").length,
      resolvedToday: rows.filter(r => r.status === "resolved" && new Date(r.created_at).getTime() >= startOfToday).length,
    };
  }, [rows]);

  const markResolved = async (id: string) => {
    const { error } = await supabase.from("feedback").update({ status: "resolved" }).eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setRows((prev) => prev.map(r => r.id === id ? { ...r, status: "resolved" } : r));
    toast.success("Marked resolved");
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Escalations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {loading ? "Loading…" : `${rows.length} total ${rows.length === 1 ? "message" : "messages"}`}
        </p>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span aria-hidden>📋</span>
          <span>
            This week:{" "}
            <span className="font-medium text-foreground">{stats.thisWeek}</span>
          </span>
        </div>
        <div className="h-4 w-px bg-white/10" />
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-red-500" aria-hidden />
          <span className="text-muted-foreground">Pending:</span>
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-sm font-bold",
              stats.pending > 0 ? "bg-red-500/20 text-red-300" : "bg-white/5 text-muted-foreground",
            )}
          >
            {stats.pending}
          </span>
        </div>
        <div className="h-4 w-px bg-white/10" />
        <div className="flex items-center gap-2 text-muted-foreground">
          <span aria-hidden>✅</span>
          <span>
            Resolved today:{" "}
            <span
              className={cn(
                "font-medium",
                stats.resolvedToday > 0 ? "font-bold text-emerald-400" : "text-foreground",
              )}
            >
              {stats.resolvedToday}
            </span>
          </span>
        </div>
      </div>

      {!loading && rows.length === 0 && (
        <div className="dashboard-panel flex flex-col items-center justify-center gap-3 py-16 text-center">
          <MessageSquare className="h-10 w-10 text-muted-foreground" />
          <p className="max-w-md text-sm text-muted-foreground">
            No escalations yet — conversations the AI couldn't resolve will appear here.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {rows.map((r) => {
          const badge = statusBadge(r.status);
          return (
            <div key={r.id} className="dashboard-panel relative p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-semibold text-foreground">{r.contact_name ?? "Unknown"}</span>
                  <Instagram className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">·</span>
                  <span className="text-muted-foreground">{relativeTime(r.created_at)}</span>
                </div>
                <span className={cn("inline-flex shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium", badge.cls)}>
                  {badge.label}
                </span>
              </div>

              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground">{r.message}</p>

              {r.ai_reply && (
                <div className="mt-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">AI replied:</p>
                  <p className="mt-1.5 whitespace-pre-wrap text-sm text-foreground/90">{r.ai_reply}</p>
                </div>
              )}

              {r.status !== "resolved" && (
                <div className="mt-4 flex justify-end">
                  <Button size="sm" variant="outline" onClick={() => markResolved(r.id)}>
                    <CheckCircle2 className="h-4 w-4" /> Mark Resolved
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

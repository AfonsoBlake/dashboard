import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useGymContext } from "@/hooks/useGymContext";
import { useIsMobile } from "@/hooks/use-mobile";
import type { ConversationRow, ChatMessage } from "@/hooks/useDashboardData";
import { cn } from "@/lib/utils";
import { displayName } from "@/lib/displayHelpers";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Send,
  Sparkles,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Zap,
  Phone,
  CalendarCheck,
  MessageCircle,
  ArrowLeft,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { ChatThread } from "@/components/chat/ChatThread";
import { betterZapClient, type EscalatedQuestion } from "@/lib/betterZapClient";

const STALE_MIN = 10; // minutes without reply => "needs reply"

type ScoreLabel = "Hot" | "Warm" | "Cold";
type ManualStatus = "Hot" | "Warm" | "Cold" | "Unqualified" | "Booked";
type ConvoTag = "Hot Lead" | "Booked" | "Lost" | "Follow Up" | null;

type PillStyle = { bg: string; fg: string; emoji: string };

const STATUS_PILL: Record<ManualStatus, PillStyle> = {
  Hot: { bg: "#4C1D95", fg: "#DDD6FE", emoji: "🔥" },
  Warm: { bg: "#854F0B", fg: "#FAEEDA", emoji: "⚡" },
  Cold: { bg: "#0C447C", fg: "#B5D4F4", emoji: "🧊" },
  Unqualified: { bg: "#444441", fg: "#D3D1C7", emoji: "🚫" },
  Booked: { bg: "#27500A", fg: "#C0DD97", emoji: "✅" },
};

// AI score reuses the same filled-pill visual language
const SCORE_PILL: Record<ScoreLabel, PillStyle> = {
  Hot: STATUS_PILL.Hot,
  Warm: STATUS_PILL.Warm,
  Cold: STATUS_PILL.Cold,
};

function StatusPill({ status }: { status: ManualStatus | ScoreLabel }) {
  const p = STATUS_PILL[status as ManualStatus] ?? SCORE_PILL[status as ScoreLabel];
  if (!p) return null;
  return (
    <span
      className="inline-flex items-center"
      style={{
        backgroundColor: p.bg,
        color: p.fg,
        borderRadius: 999,
        padding: "4px 12px",
        fontSize: 12,
        fontWeight: 500,
        gap: 4,
        lineHeight: 1,
      }}
    >
      <span aria-hidden>{p.emoji}</span>
      <span>{status}</span>
    </span>
  );
}

const TAG_DOT: Record<string, string> = {
  "Hot Lead": "bg-primary",
  Booked: "bg-emerald-500",
  Lost: "bg-zinc-500",
  "Follow Up": "bg-blue-500",
};

// Map menu labels to stored conversation_tag values
const TAG_MENU: Array<{ label: string; tag: ConvoTag }> = [
  { label: "Mark as Hot Lead", tag: "Hot Lead" },
  { label: "Mark as Booked", tag: "Booked" },
  { label: "Mark as Lost", tag: "Lost" },
  { label: "Follow Up Later", tag: "Follow Up" },
];

const DEFAULT_QUICK_REPLIES = [
  "Awesome! What day works best for you?",
  "We offer a free trial — want to book one?",
  "Let me check that for you!",
];

function getMessages(c: ConversationRow): ChatMessage[] {
  return Array.isArray(c.messages) ? (c.messages as unknown as ChatMessage[]) : [];
}

function lastUserWaitMinutes(c: ConversationRow): number | null {
  const msgs = getMessages(c);
  const last = msgs[msgs.length - 1];
  if (!last) return null;
  const role = (last.role ?? "").toLowerCase();
  if (role !== "user") return null;
  const ts = last.timestamp ?? c.updated_at;
  if (!ts) return null;
  return (Date.now() - new Date(ts).getTime()) / 60000;
}

function needsReply(c: ConversationRow): boolean {
  const status = (c.status ?? "").toLowerCase();
  if (status === "unread" || status === "escalated") return true;
  const w = lastUserWaitMinutes(c);
  return w !== null && w >= STALE_MIN;
}

function formatWait(min: number): string {
  if (min < 1) return "just now";
  if (min < 60) return `${Math.floor(min)} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function formatTime(ts: string | null | undefined): string {
  if (!ts) return "";
  return new Date(ts).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function playPing() {
  try {
    const Ctx = (window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch {
    /* ignore */
  }
}

export function useInboxBadge() {
  const { businessId } = useGymContext();
  const [count, setCount] = useState(0);
  // Track message counts per conversation so we can detect *new* user messages
  const msgCountsRef = useRef<Map<string, number>>(new Map());
  const seededRef = useRef(false);

  const refresh = useCallback(async () => {
    if (!businessId) return;
    const [{ data }, escalatedRes] = await Promise.all([
      (supabase as any)
        .from("contacts")
        .select("id, name, messages, updated_at")
        .eq("business_id", businessId),
      betterZapClient
        .from("escalated_questions")
        .select("id", { count: "exact", head: true })
        .eq("resolved", false)
        .eq("business_id", businessId),
    ]);
    if (!data) return;
    const rows = data as unknown as ConversationRow[];
    const n = rows.filter(needsReply).length;
    const escalatedCount = escalatedRes.count ?? 0;
    setCount(n + escalatedCount);
    // Seed message counts on first load — do not fire notifications for existing data
    if (!seededRef.current) {
      const map = new Map<string, number>();
      for (const r of rows) map.set(r.id, getMessages(r).length);
      msgCountsRef.current = map;
      seededRef.current = true;
    }
  }, [businessId]);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 30_000);
    return () => clearInterval(interval);
  }, [refresh]);

  useEffect(() => {
    if (!businessId) return;
    const channel = supabase
      .channel(`inbox-badge-${businessId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "contacts", filter: `business_id=eq.${businessId}` },
        (payload) => {
          // Detect new incoming user message globally → ping + browser notification
          const row = (payload.new ?? null) as ConversationRow | null;
          if (row && seededRef.current) {
            const msgs = getMessages(row);
            const prevCount = msgCountsRef.current.get(row.id) ?? 0;
            if (msgs.length > prevCount) {
              const last = msgs[msgs.length - 1];
              const role = (last?.role ?? "").toLowerCase();
              if (role === "user") {
                playPing();
                if (
                  typeof document !== "undefined" &&
                  document.visibilityState !== "visible" &&
                  typeof Notification !== "undefined" &&
                  Notification.permission === "granted"
                ) {
                  try {
                    const name = displayName(row.name);
                    const body = (last?.content ?? last?.text ?? "New message").slice(0, 140);
                    new Notification(`New message from ${name}`, { body });
                  } catch {
                    /* ignore */
                  }
                }
              }
            }
            msgCountsRef.current.set(row.id, msgs.length);
          }
          refresh();
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [businessId, refresh]);

  return { count, refresh };
}

type InboxViewProps = {
  gymName: string;
  quickReplies: string[];
  onOpened?: () => void;
  initialConversationId?: string | null;
};

export function InboxView({ gymName, quickReplies, onOpened, initialConversationId }: InboxViewProps) {
  const { businessId } = useGymContext();
  const isMobile = useIsMobile();
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"needs" | "all">("needs");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [suggestion, setSuggestion] = useState<{
    suggested_reply: string;
    lead_score: ScoreLabel;
    lead_score_reason: string;
  } | null>(null);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [statsTick, setStatsTick] = useState(0);
  const [bookingsCount, setBookingsCount] = useState(0);
  const [inputHighlight, setInputHighlight] = useState(false);
  const [selectedAiPaused, setSelectedAiPaused] = useState<boolean | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const replyInputRef = useRef<HTMLTextAreaElement | null>(null);
  const lastSeenMsgCount = useRef<number>(0);
  const notifiedOnce = useRef(false);

  // Escalated questions from secondary client (BetterZap)
  const [escalated, setEscalated] = useState<EscalatedQuestion[]>([]);
  const [selectedEscalatedId, setSelectedEscalatedId] = useState<string | null>(null);
  const [escalatedReply, setEscalatedReply] = useState("");
  const [escalatedSending, setEscalatedSending] = useState(false);
  const [bulkAiDialogOpen, setBulkAiDialogOpen] = useState(false);
  const [bulkAiBusy, setBulkAiBusy] = useState(false);

  const loadEscalated = useCallback(async () => {
    if (!businessId) {
      console.log("[escalated] skipped — no businessId yet");
      return;
    }
    console.log("[escalated] querying for business_id =", businessId);
    const { data, error } = await betterZapClient
      .from("escalated_questions")
      .select("*")
      .eq("resolved", false)
      .eq("business_id", businessId)
      .order("created_at", { ascending: false });
    console.log("[escalated] result", { count: data?.length ?? 0, data, error });
    if (error) {
      console.error("escalated load failed", error);
      return;
    }
    setEscalated((data ?? []) as EscalatedQuestion[]);
  }, [businessId]);

  useEffect(() => {
    loadEscalated();
    const id = setInterval(loadEscalated, 30_000);
    return () => clearInterval(id);
  }, [loadEscalated]);

  const selectedEscalated = useMemo(
    () => escalated.find((e) => e.id === selectedEscalatedId) ?? null,
    [escalated, selectedEscalatedId],
  );

  async function sendEscalatedReply() {
    if (!selectedEscalated || !escalatedReply.trim()) return;
    setEscalatedSending(true);

    const BETTER_ZAP_URL = "https://ldkrxbpoixookrwmdufk.supabase.co";
    const BETTER_ZAP_ANON =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxka3J4YnBvaXhvb2tyd21kdWZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxMzU5NzQsImV4cCI6MjA4ODcxMTk3NH0.ED2WltgKqUfl149-EwW34vsGgNSn7l1jC7b16Pw68Ow";

    // Resolve the actual conversations.id from the escalated question's contact_id + business_id.
    // The escalated_questions row id is NOT a conversation id — sending it would point at the wrong record.
    let conversationId: string | null = null;
    try {
      const { data: convo, error: convoErr } = await (supabase as any)
        .from("contacts")
        .select("id")
        .eq("business_id", selectedEscalated.business_id)
        .eq("id", selectedEscalated.contact_id)
        .order("updated_at", { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();
      if (convoErr) {
        console.error("[escalated] conversation lookup failed", convoErr);
        toast.error("Could not find conversation for this lead");
        setEscalatedSending(false);
        return;
      }
      if (!convo?.id) {
        toast.error("No conversation found for this lead");
        setEscalatedSending(false);
        return;
      }
      conversationId = convo.id;
    } catch (e) {
      console.error("[escalated] conversation lookup error", e);
      toast.error("Could not find conversation for this lead");
      setEscalatedSending(false);
      return;
    }

    try {
      const res = await fetch(`${BETTER_ZAP_URL}/functions/v1/send-manual-reply`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${BETTER_ZAP_ANON}`,
          apikey: BETTER_ZAP_ANON,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversation_id: conversationId,
          message: escalatedReply.trim(),
        }),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        console.error("[escalated] send-manual-reply failed", res.status, txt);
        toast.error(`Send failed (${res.status})`);
        setEscalatedSending(false);
        return;
      }
    } catch (e) {
      console.error("[escalated] send-manual-reply error", e);
      toast.error("Send failed");
      setEscalatedSending(false);
      return;
    }

    const { error } = await betterZapClient
      .from("escalated_questions")
      .update({ resolved: true, resolved_at: new Date().toISOString() })
      .eq("id", selectedEscalated.id);
    setEscalatedSending(false);
    if (error) {
      toast.error(`Could not resolve: ${error.message}`);
      return;
    }
    toast.success("Reply sent");
    setEscalated((prev) => prev.filter((e) => e.id !== selectedEscalated.id));
    setSelectedEscalatedId(null);
    setEscalatedReply("");
  }

  // Initial load
  const loadConversations = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("contacts")
      .select("*")
      .eq("business_id", businessId)
      .order("updated_at", { ascending: false, nullsFirst: false });
    if (error) {
      toast.error("Inbox unavailable. Please refresh.");
    }
    setConversations((data ?? []) as unknown as ConversationRow[]);
    setLoading(false);
  }, [businessId]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Realtime subscription for conversations table
  useEffect(() => {
    if (!businessId) return;
    const channel = supabase
      .channel(`inbox-${businessId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "contacts", filter: `business_id=eq.${businessId}` },
        (payload) => {
          setConversations((prev) => {
            const row = (payload.new ?? payload.old) as ConversationRow | undefined;
            if (!row) return prev;
            if (payload.eventType === "DELETE") {
              return prev.filter((c) => c.id !== row.id);
            }
            const idx = prev.findIndex((c) => c.id === row.id);
            const newList = idx >= 0 ? [...prev] : [row, ...prev];
            if (idx >= 0) newList[idx] = row;
            // resort by last_message_at desc
            newList.sort((a, b) => {
              const at = a.updated_at ? new Date(a.updated_at).getTime() : 0;
              const bt = b.updated_at ? new Date(b.updated_at).getTime() : 0;
              return bt - at;
            });
            return newList;
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [businessId]);

  // Mark "opened" — parent can clear badge
  useEffect(() => {
    onOpened?.();
  }, [onOpened]);

  // Notification permission on first visit
  useEffect(() => {
    if (notifiedOnce.current) return;
    notifiedOnce.current = true;
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  // Stats refresh tick
  useEffect(() => {
    const id = setInterval(() => setStatsTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  // Honor an initialConversationId hint (from Contacts page deep-link)
  useEffect(() => {
    if (initialConversationId) setSelectedId(initialConversationId);
  }, [initialConversationId]);

  // Auto-select first chat
  useEffect(() => {
    if (selectedId) return;
    const first = filterAndSort(conversations, tab)[0];
    if (first) setSelectedId(first.id);
  }, [conversations, selectedId, tab]);

  const selected = useMemo(
    () => conversations.find((c) => c.id === selectedId) ?? null,
    [conversations, selectedId],
  );

  // Bookings count for selected user
  useEffect(() => {
    (async () => {
      if (!businessId || !selected) {
        setBookingsCount(0);
        return;
      }
      const { count } = await (supabase as any)
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("business_id", businessId)
        .eq("id", selected.id);
      setBookingsCount(count ?? 0);
    })();
  }, [businessId, selected]);

  // Auto-scroll to bottom on selection or new message
  useEffect(() => {
    const msgs = selected ? getMessages(selected) : [];
    if (!selected) return;
    if (msgs.length !== lastSeenMsgCount.current) {
      const last = msgs[msgs.length - 1];
      const wasIncrease = msgs.length > lastSeenMsgCount.current;
      lastSeenMsgCount.current = msgs.length;
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      if (
        wasIncrease &&
        last &&
        (last.role ?? "").toLowerCase() === "user"
      ) {
        playPing();
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          try {
            new Notification(displayName(selected.name), {
              body: (last.content ?? last.text ?? "New message").slice(0, 120),
            });
          } catch {
            /* ignore */
          }
        }
        // Auto regenerate suggestion
        void requestSuggestion("default");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id, selected?.messages]);

  // Reset on selection change
  useEffect(() => {
    lastSeenMsgCount.current = selected ? getMessages(selected).length : 0;
    setSuggestion(null);
    setReply("");
    if (selected) void requestSuggestion("default");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id]);

  // Fetch ai_paused for the selected conversation from Supabase
  useEffect(() => {
    if (!selected?.id) {
      setSelectedAiPaused(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await (supabase as any)
        .from("contacts")
        .select("ai_paused")
        .eq("id", selected.id)
        .single();
      if (cancelled) return;
      if (error) {
        console.error("Failed to fetch ai_paused:", error);
        setSelectedAiPaused(false);
        return;
      }
      setSelectedAiPaused(data?.ai_paused ?? false);
    })();
    return () => {
      cancelled = true;
    };
  }, [selected?.id]);

  // Stats
  const stats = useMemo(() => {
    void statsTick; // re-eval each tick
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let needsReplyCount = 0;
    let resolvedToday = 0;
    const replyDeltas: number[] = [];

    for (const c of conversations) {
      if (needsReply(c)) needsReplyCount += 1;
      if (c.resolved_at && new Date(c.resolved_at).getTime() >= today.getTime()) {
        resolvedToday += 1;
      }
      const msgs = getMessages(c);
      // Compute today's reply latencies: user msg followed by staff/assistant
      for (let i = 0; i < msgs.length - 1; i++) {
        const a = msgs[i];
        const b = msgs[i + 1];
        const roleA = (a.role ?? "").toLowerCase();
        const roleB = (b.role ?? "").toLowerCase();
        if (roleA === "user" && (roleB === "staff" || roleB === "assistant")) {
          const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
          const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
          if (ta && tb && tb >= today.getTime()) {
            replyDeltas.push((tb - ta) / 60000);
          }
        }
      }
    }
    const avgReply =
      replyDeltas.length > 0
        ? Math.round(replyDeltas.reduce((s, n) => s + n, 0) / replyDeltas.length)
        : null;
    return { needsReplyCount: needsReplyCount + escalated.length, resolvedToday, avgReply };
  }, [conversations, statsTick, escalated.length]);

  const visibleChats = useMemo(() => filterAndSort(conversations, tab), [conversations, tab]);

  const suggestInFlightRef = useRef(false);
  async function requestSuggestion(intent: "default" | "book" | "objection" | "follow_up") {
    if (!selected || !businessId) return;
    if (suggestInFlightRef.current) return;
    suggestInFlightRef.current = true;
    setSuggestLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("Smart-reply-dashboard", {
        body: {
          conversation_id: selected.id,
          intent,
        },
      });
      if (error) {
        toast.error(`Suggestion failed: ${error.message}`);
        return;
      }
      const payload = data as { suggested_reply: string; lead_score: ScoreLabel; lead_score_reason: string };
      setSuggestion(payload);
    } finally {
      setSuggestLoading(false);
      suggestInFlightRef.current = false;
    }
  }

  async function sendReply() {
    if (!selected || !businessId || !reply.trim()) return;
    setSending(true);
    const text = reply.trim();

    const BETTER_ZAP_URL = "https://ldkrxbpoixookrwmdufk.supabase.co";
    const BETTER_ZAP_ANON =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxka3J4YnBvaXhvb2tyd21kdWZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxMzU5NzQsImV4cCI6MjA4ODcxMTk3NH0.ED2WltgKqUfl149-EwW34vsGgNSn7l1jC7b16Pw68Ow";

    try {
      const res = await fetch(`${BETTER_ZAP_URL}/functions/v1/send-manual-reply`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${BETTER_ZAP_ANON}`,
          apikey: BETTER_ZAP_ANON,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          conversation_id: selected.id,
          message: text,
        }),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        console.error("[sendReply] send-manual-reply failed", res.status, txt);
        toast.error(`Send failed (${res.status})`);
        setSending(false);
        return;
      }
    } catch (e) {
      console.error("[sendReply] send-manual-reply error", e);
      toast.error("Send failed");
      setSending(false);
      return;
    }

    setSending(false);
    setReply("");
    toast.success("Reply sent");

    // Refresh messages from the source of truth
    await loadConversations();
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    void requestSuggestion("default");
  }

  async function setConvoTag(c: ConversationRow, tagVal: ConvoTag) {
    const { error } = await (supabase as any)
      .from("contacts")
      .update({ conversation_tag: tagVal })
      .eq("id", c.id);
    if (error) toast.error(error.message);
    else toast.success(tagVal ? `Tagged: ${tagVal}` : "Tag cleared");
  }

  async function setLeadStatus(c: ConversationRow, status: ManualStatus) {
    // Optimistic update so the pill flips instantly
    setConversations((prev) =>
      prev.map((row) => (row.id === c.id ? { ...row, score: status } : row)),
    );
    const { error } = await (supabase as any)
      .from("contacts")
      .update({ score: status })
      .eq("id", c.id);
    if (error) {
      // Roll back on failure
      setConversations((prev) =>
        prev.map((row) => (row.id === c.id ? { ...row, score: c.score ?? null } : row)),
      );
      toast.error(`Could not save status: ${error.message}`);
      return;
    }
    toast.success(`Status set to ${status}`);
  }

  async function toggleAiPaused(c: ConversationRow, paused: boolean) {
    const prevPaused = (c as ConversationRow & { ai_paused?: boolean }).ai_paused ?? false;
    // Optimistic update
    setConversations((prev) =>
      prev.map((row) =>
        row.id === c.id
          ? ({ ...row, ai_paused: paused, ai_paused_at: paused ? new Date().toISOString() : (row as ConversationRow & { ai_paused_at?: string | null }).ai_paused_at ?? null } as ConversationRow)
          : row,
      ),
    );
    const payload: { ai_paused: boolean; ai_paused_at?: string | null } = { ai_paused: paused };
    if (paused) payload.ai_paused_at = new Date().toISOString();
    const { error } = await (supabase as any)
      .from("contacts")
      .update(payload)
      .eq("id", c.id);
    if (error) {
      setConversations((prev) =>
        prev.map((row) => (row.id === c.id ? ({ ...row, ai_paused: prevPaused } as ConversationRow) : row)),
      );
      toast.error(`Could not update AI state: ${error.message}`);
      return;
    }
    toast.success(paused ? "AI paused for this contact" : "AI resumed for this contact");
  }

  async function bulkSetAiPaused(paused: boolean) {
    if (!businessId) return;
    setBulkAiBusy(true);
    const nowIso = new Date().toISOString();
    const prev = conversations;
    // Optimistic
    setConversations((rows) =>
      rows.map(
        (row) =>
          ({
            ...row,
            ai_paused: paused,
            ai_paused_at: paused ? nowIso : null,
          }) as ConversationRow,
      ),
    );
    const payload: { ai_paused: boolean; ai_paused_at: string | null } = {
      ai_paused: paused,
      ai_paused_at: paused ? nowIso : null,
    };
    const { error } = await (supabase as any)
      .from("contacts")
      .update(payload)
      .eq("business_id", businessId);
    setBulkAiBusy(false);
    setBulkAiDialogOpen(false);
    if (error) {
      setConversations(prev);
      toast.error(`Bulk update failed: ${error.message}`);
      return;
    }
    toast.success(paused ? "AI paused for all conversations" : "AI resumed for all conversations");
  }

  async function markResolved(c: ConversationRow) {
    const { error } = await (supabase as any)
      .from("contacts")
      .update({ resolved_at: new Date().toISOString(), status: "closed" })
      .eq("id", c.id);
    if (error) toast.error(error.message);
    else toast.success("Marked resolved");
  }

  const replies = quickReplies.length ? quickReplies : DEFAULT_QUICK_REPLIES;
  const selectedMsgs = selected ? getMessages(selected) : [];

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden">
      {/* Stats bar */}
      <div className="flex shrink-0 flex-wrap items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span aria-hidden>⚡</span>
          <span>
            Avg reply time today:{" "}
            <span className="text-foreground font-medium">
              {`${stats.avgReply ?? 0} min`}
            </span>
          </span>
        </div>
        <div className="h-4 w-px bg-white/10" />
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-red-500" aria-hidden />
          <span className="text-muted-foreground">Needs reply:</span>
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-sm font-bold",
              stats.needsReplyCount > 0
                ? "bg-red-500/20 text-red-300"
                : "bg-white/5 text-muted-foreground",
            )}
          >
            {stats.needsReplyCount}
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

      {/* Split view */}
      <div
        className={cn(
          "grid min-h-0 flex-1 overflow-hidden gap-4 xl:grid-cols-[0.95fr_1.15fr]",
          isMobile && (selected || selectedEscalated) ? "grid-cols-1" : "",
        )}
      >
        {/* Left: list — hidden on mobile when a conversation is open */}
        <div
          className={cn(
            "dashboard-panel flex h-full min-h-0 flex-col overflow-hidden",
            isMobile && (selected || selectedEscalated) ? "hidden" : "",
          )}
        >
          <div className="flex gap-2 border-b border-white/[0.06] px-4 py-3">
            {(["needs", "all"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn(
                  "rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] transition-colors",
                  tab === t
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-white/[0.06] hover:text-foreground",
                )}
              >
                {t === "needs" ? "Needs Reply" : "All Chats"}
              </button>
            ))}
          </div>
          <AlertDialog open={bulkAiDialogOpen} onOpenChange={setBulkAiDialogOpen}>
            <AlertDialogContent>
              {(() => {
                const total = conversations.length;
                const pausedCount = conversations.filter(
                  (c) => (c as ConversationRow & { ai_paused?: boolean }).ai_paused,
                ).length;
                const allPaused = total > 0 && pausedCount === total;
                return (
                  <>
                    <AlertDialogHeader>
                      <AlertDialogTitle>
                        {allPaused ? "Resume AI for all conversations?" : "Pause AI for all conversations?"}
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        {allPaused
                          ? `This will re-enable AI auto-replies for all ${total} conversations in this business.`
                          : `This will pause AI auto-replies for all ${total} conversations in this business. Replies will be manual only until you resume.`}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={bulkAiBusy}>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        disabled={bulkAiBusy}
                        onClick={(e) => {
                          e.preventDefault();
                          bulkSetAiPaused(!allPaused);
                        }}
                        className={cn(
                          allPaused
                            ? "bg-emerald-600 hover:bg-emerald-500"
                            : "bg-red-600 hover:bg-red-500",
                        )}
                      >
                        {bulkAiBusy ? "Working…" : allPaused ? "Resume All AI" : "Pause All AI"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </>
                );
              })()}
            </AlertDialogContent>
          </AlertDialog>
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
            {loading && <p className="px-2 py-4 text-sm text-muted-foreground">Loading…</p>}
            {!loading && visibleChats.length === 0 && (tab !== "needs" || escalated.length === 0) && (
              <p className="px-2 py-6 text-sm text-muted-foreground">
                {tab === "needs" ? "No conversations need a reply right now." : "No conversations yet."}
              </p>
            )}
            {tab === "needs" &&
              escalated.map((e) => {
                const isSel = selectedEscalatedId === e.id;
                const wait =
                  e.created_at != null
                    ? (Date.now() - new Date(e.created_at).getTime()) / 60000
                    : null;
                return (
                  <button
                    key={`esc-${e.id}`}
                    type="button"
                    onClick={() => {
                      setSelectedEscalatedId(e.id);
                      setSelectedId(null);
                      setEscalatedReply("");
                    }}
                    className={cn(
                      "mb-2 block w-full rounded-2xl border px-4 py-3 text-left transition-colors",
                      isSel
                        ? "border-yellow-400/40 bg-yellow-500/[0.08]"
                        : "border-yellow-500/20 bg-yellow-500/[0.04] hover:bg-yellow-500/[0.07]",
                    )}
                    style={{ borderLeft: "3px solid #EAB308" }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <p className="truncate text-base font-semibold text-foreground">
                          {e.contact_id ?? "Unknown contact"}
                        </p>
                      </div>
                      <span
                        className="inline-flex shrink-0 items-center"
                        style={{
                          backgroundColor: "#854F0B",
                          color: "#FAEEDA",
                          borderRadius: 999,
                          padding: "4px 12px",
                          fontSize: 12,
                          fontWeight: 500,
                          gap: 4,
                          lineHeight: 1,
                        }}
                      >
                        <span aria-hidden>❗</span>
                        <span>Escalated</span>
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-1 text-sm text-muted-foreground/80">{e.message}</p>
                    <div className="mt-2 text-xs text-muted-foreground">
                      {wait !== null ? formatWait(wait) : formatTime(e.created_at)}
                    </div>
                  </button>
                );
              })}
            {visibleChats.map((c) => {
              const wait = lastUserWaitMinutes(c);
              const stale = wait !== null && wait >= STALE_MIN;
              const status = (c.score ?? null) as ManualStatus | null;
              const tagVal = (c.conversation_tag ?? null) as string | null;
              const last = getMessages(c).slice(-1)[0];
              const preview = (last?.content ?? last?.text ?? "—").slice(0, 90);
              return (
                <div
                  key={c.id}
                  className={cn(
                    "mb-2 rounded-2xl border px-4 py-3 transition-colors",
                    selectedId === c.id
                      ? "border-white/[0.12] bg-white/[0.05]"
                      : "border-white/[0.06] bg-white/[0.025] hover:bg-white/[0.04]",
                  )}
                  style={
                    status && STATUS_PILL[status]
                      ? { borderLeft: `3px solid ${STATUS_PILL[status].bg}` }
                      : undefined
                  }
                >
                  <button
                    type="button"
                    onClick={() => { setSelectedId(c.id); setSelectedEscalatedId(null); }}
                    className="block w-full text-left"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        {tagVal && TAG_DOT[tagVal] && (
                          <span
                            className={cn("h-2.5 w-2.5 shrink-0 rounded-full", TAG_DOT[tagVal])}
                            title={tagVal}
                          />
                        )}
                        <p className="truncate text-base font-semibold text-foreground">
                          {displayName(c.name)}
                        </p>
                        {(c as ConversationRow & { escalation_reason?: string | null }).escalation_reason && (
                          <span className="shrink-0 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                            Escalated
                          </span>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {status && <StatusPill status={status} />}
                      </div>
                    </div>
                    <p className="mt-1 line-clamp-1 text-sm text-muted-foreground/70">{preview}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span
                        className={cn(
                          "text-xs",
                          stale ? "font-semibold text-primary" : "text-muted-foreground",
                        )}
                      >
                        {wait !== null ? formatWait(wait) : formatTime(c.updated_at)}
                      </span>
                    </div>
                  </button>
                  <div className="mt-1 flex justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="rounded-md p-1 text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
                          aria-label="More actions"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Tag conversation</DropdownMenuLabel>
                        {TAG_MENU.map(({ label, tag }) => (
                          <DropdownMenuItem key={label} onClick={() => setConvoTag(c, tag)}>
                            <span className={cn("mr-2 h-2 w-2 rounded-full", tag ? TAG_DOT[tag] : "")} />
                            {label}
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setConvoTag(c, null)}>
                          Clear tag
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => markResolved(c)}>
                          Mark resolved
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: conversation — hidden on mobile when no selection */}
        <div
          className={cn(
            "dashboard-panel flex h-full min-h-0 flex-col overflow-hidden",
            isMobile && !selected && !selectedEscalated ? "hidden" : "",
          )}
        >
          {selectedEscalated && !selected ? (
            <div className="flex h-full min-h-0 flex-col overflow-hidden">
              <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] px-5 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  {isMobile && (
                    <button
                      type="button"
                      onClick={() => setSelectedEscalatedId(null)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
                      aria-label="Back to list"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                  )}
                  <div>
                    <p className="font-semibold text-foreground">
                      {selectedEscalated.contact_name ?? selectedEscalated.contact_id}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedEscalated.platform ?? "—"} • Escalated{" "}
                      {selectedEscalated.created_at ? formatTime(selectedEscalated.created_at) : ""}
                    </p>
                  </div>
                </div>
                <span
                  className="inline-flex items-center"
                  style={{
                    backgroundColor: "#854F0B",
                    color: "#FAEEDA",
                    borderRadius: 999,
                    padding: "4px 12px",
                    fontSize: 12,
                    fontWeight: 500,
                    gap: 4,
                    lineHeight: 1,
                  }}
                >
                  <span aria-hidden>❗</span>
                  <span>Escalated</span>
                </span>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6">
                <div
                  className="max-w-[70%] rounded-[12px] rounded-bl-[4px] border border-white/[0.06] px-[14px] py-[10px] text-sm leading-6 text-foreground"
                  style={{ backgroundColor: "#1e2030" }}
                >
                  {selectedEscalated.message}
                </div>
              </div>
              <div className="shrink-0 border-t border-white/[0.06] px-5 py-3">
                <div className="flex items-end gap-2">
                  <Textarea
                    value={escalatedReply}
                    onChange={(e) => setEscalatedReply(e.target.value)}
                    placeholder="Type a reply… (resolves this escalation on send)"
                    rows={2}
                    className="resize-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        void sendEscalatedReply();
                      }
                    }}
                  />
                  <Button
                    onClick={sendEscalatedReply}
                    disabled={escalatedSending || !escalatedReply.trim()}
                  >
                    <Send className="h-4 w-4" />
                    Send
                  </Button>
                </div>
              </div>
            </div>
          ) : !selected ? (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              Select a conversation
            </div>
          ) : (
            <div className="flex h-full min-h-0 flex-col overflow-hidden">
              {/* Profile bar */}
              <div className="shrink-0 border-b border-white/[0.06]">
                <div className="flex items-center justify-between px-5 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    {isMobile && (
                      <button
                        type="button"
                        onClick={() => setSelectedId(null)}
                        className="rounded-md p-1.5 text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
                        aria-label="Back to list"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </button>
                    )}
                    <div className="rounded-full bg-white/[0.06] p-2">
                      <MessageCircle className="h-4 w-4 text-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground">
                        {displayName(selected.name)}
                      </p>
                      {(selected as ConversationRow & { escalation_reason?: string | null }).escalation_reason && (
                        <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                          <AlertTriangle className="h-3 w-3" />
                          ESCALATED · {(selected as ConversationRow & { escalation_reason?: string | null }).escalation_reason}
                        </span>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Instagram • {selectedMsgs.length} messages
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const paused = selectedAiPaused ?? false;
                      const wasEscalated = !!(selected as ConversationRow & { escalation_reason?: string | null }).escalation_reason;
                      const applyResolve = async (turnAiOn: boolean) => {
                        const prev = selectedAiPaused;
                        const next = turnAiOn ? false : !paused;
                        const resolvingEscalation = !next && wasEscalated;
                        setSelectedAiPaused(next);
                        setConversations((rows) =>
                          rows.map((row) =>
                            row.id === selected.id
                              ? ({
                                  ...row,
                                  ai_paused: next,
                                  ...(resolvingEscalation
                                    ? { escalation_reason: null, escalated_at: null, status: "active" }
                                    : {}),
                                } as ConversationRow)
                              : row,
                          ),
                        );
                        const payload: Record<string, unknown> = {
                          ai_paused: next,
                          ai_paused_at: next ? new Date().toISOString() : null,
                        };
                        if (resolvingEscalation) {
                          payload.escalation_reason = null;
                          payload.escalated_at = null;
                          payload.status = "active";
                        }
                        const { error } = await (supabase as any)
                          .from("contacts")
                          .update(payload)
                          .eq("id", selected.id);
                        if (error) {
                          setSelectedAiPaused(prev ?? false);
                          setConversations((rows) =>
                            rows.map((row) =>
                              row.id === selected.id
                                ? ({ ...row, ai_paused: prev ?? false } as ConversationRow)
                                : row,
                            ),
                          );
                          toast.error(`Could not update: ${error.message}`);
                          return;
                        }
                        toast.success(
                          resolvingEscalation
                            ? "Escalation resolved"
                            : next
                              ? "AI paused for this contact"
                              : "AI resumed for this contact",
                        );
                      };
                      return (
                        <>
                          {wasEscalated && (
                            <button
                              type="button"
                              onClick={() => applyResolve(true)}
                              className="rounded-full border border-white/20 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-900 transition-colors hover:bg-white/90"
                            >
                              Resolve Escalation
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => applyResolve(false)}
                            aria-label="Toggle AI auto-replies"
                            className={cn(
                              "rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition-colors",
                              paused
                                ? "bg-red-600 hover:bg-red-500 ring-1 ring-red-400/40"
                                : "bg-primary hover:bg-primary/90",
                            )}
                          >
                            {paused ? "AI OFF" : "AI ON"}
                          </button>
                        </>
                      );
                    })()}
                    <button
                      type="button"
                      onClick={() => setProfileOpen((v) => !v)}
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-white/[0.06] hover:text-foreground"
                      aria-label="Toggle profile"
                    >
                      {profileOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                {(selected as ConversationRow & { ai_paused?: boolean }).ai_paused && (
                  <div className="mx-5 mb-3 flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2.5 text-sm font-bold text-white shadow-md">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    AI is paused for this contact — replies are manual only.
                  </div>
                )}
                {profileOpen && (
                  <div className="grid gap-3 px-5 pb-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Phone</p>
                      <p className="mt-1 flex items-center gap-1 text-sm text-foreground">
                        <Phone className="h-3 w-3" /> —
                      </p>
                    </div>
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Bookings</p>
                      <p className="mt-1 flex items-center gap-1 text-sm text-foreground">
                        <CalendarCheck className="h-3 w-3" /> {bookingsCount}
                      </p>
                    </div>
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Manual status</p>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="mt-1 flex w-full items-center justify-between rounded-md text-sm text-foreground hover:opacity-90"
                          >
                            {selected.score && STATUS_PILL[selected.score as ManualStatus] ? (
                              <StatusPill status={selected.score as ManualStatus} />
                            ) : (
                              <span className="text-muted-foreground">Set status</span>
                            )}
                            <ChevronDown className="h-3 w-3" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          {(Object.keys(STATUS_PILL) as ManualStatus[]).map((s) => (
                            <DropdownMenuItem
                              key={s}
                              onClick={() => setLeadStatus(selected, s)}
                              className="focus:bg-white/[0.06]"
                            >
                              <StatusPill status={s} />
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        AI Suggestion
                      </p>
                      <div className="mt-1">
                        {suggestion?.lead_score && SCORE_PILL[suggestion.lead_score] ? (
                          <StatusPill status={suggestion.lead_score} />
                        ) : (
                          <span className="text-sm italic text-muted-foreground">AI: Analyzing…</span>
                        )}
                      </div>
                      {suggestion?.lead_score_reason && (
                        <p className="mt-2 line-clamp-2 text-xs italic text-muted-foreground">
                          {suggestion.lead_score_reason}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Chat thread */}
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                <ChatThread messages={selectedMsgs} endRef={messagesEndRef} />
              </div>

              {/* Suggested reply */}
              <div className="mx-5 my-1.5 shrink-0 rounded-xl border border-primary/40 bg-white/[0.03] px-3 py-1.5 shadow-[0_0_32px_-8px_hsl(var(--primary)/0.55),inset_0_0_0_1px_hsl(var(--primary)/0.15)]">
                <div className="flex items-center justify-between">
                  <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">
                    <Sparkles className="h-3 w-3" /> Suggested Reply
                  </p>
                  <button
                    type="button"
                    onClick={() => requestSuggestion("default")}
                    disabled={suggestLoading}
                    className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground disabled:opacity-50"
                  >
                    <RefreshCw className={cn("h-3 w-3", suggestLoading && "animate-spin")} />
                    Regenerate
                  </button>
                </div>
                <p
                  className="mt-0.5 italic text-foreground/90 line-clamp-3"
                  style={{ fontSize: 13, lineHeight: 1.4 }}
                >
                  {suggestLoading
                    ? "Thinking…"
                    : suggestion?.suggested_reply ?? "Open a conversation to generate a suggestion."}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => requestSuggestion("book")}
                    disabled={suggestLoading}
                    className="rounded-full border border-white/15 bg-transparent px-2.5 py-1 text-[11px] font-medium text-foreground/80 hover:bg-white/5 disabled:opacity-50"
                  >
                    Book Them
                  </button>
                  <button
                    type="button"
                    onClick={() => requestSuggestion("objection")}
                    disabled={suggestLoading}
                    className="rounded-full border border-white/15 bg-transparent px-2.5 py-1 text-[11px] font-medium text-foreground/80 hover:bg-white/5 disabled:opacity-50"
                  >
                    Handle Objection
                  </button>
                  <button
                    type="button"
                    onClick={() => requestSuggestion("follow_up")}
                    disabled={suggestLoading}
                    className="rounded-full border border-white/15 bg-transparent px-2.5 py-1 text-[11px] font-medium text-foreground/80 hover:bg-white/5 disabled:opacity-50"
                  >
                    Follow Up
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!suggestion) return;
                      setReply(suggestion.suggested_reply);
                      setInputHighlight(true);
                      replyInputRef.current?.focus();
                      window.setTimeout(() => setInputHighlight(false), 900);
                    }}
                    disabled={!suggestion}
                    className="ml-auto rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
                  >
                    Use This
                  </button>
                </div>
              </div>

              {/* Reply input */}
              <div className="shrink-0 border-t border-white/[0.06] px-5 py-2">
                <div className="flex items-center gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="icon" aria-label="Quick replies" className="h-9 w-9 shrink-0">
                        <Zap className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-72 p-2">
                      <p className="px-2 py-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                        Quick replies
                      </p>
                      {replies.map((q, i) => (
                        <button
                          key={i}
                          type="button"
                          className="block w-full rounded-md px-2 py-2 text-left text-sm hover:bg-white/[0.06]"
                          onClick={() => setReply(q)}
                        >
                          {q}
                        </button>
                      ))}
                    </PopoverContent>
                  </Popover>
                  <Textarea
                    ref={replyInputRef}
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Type a reply…"
                    rows={1}
                    className={cn(
                      "min-h-9 h-9 py-2 resize-none transition-all duration-500",
                      inputHighlight &&
                        "ring-2 ring-primary/70 shadow-[0_0_24px_-6px_hsl(var(--primary)/0.7)]",
                    )}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void sendReply();
                      }
                    }}
                  />
                  <Button onClick={sendReply} disabled={sending || !reply.trim()} size="sm" className="h-9 shrink-0">
                    <Send className="h-4 w-4" />
                    Send
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function filterAndSort(conversations: ConversationRow[], tab: "needs" | "all"): ConversationRow[] {
  if (tab === "all") return conversations;
  return conversations
    .filter(needsReply)
    .sort((a, b) => (lastUserWaitMinutes(b) ?? 0) - (lastUserWaitMinutes(a) ?? 0));
}

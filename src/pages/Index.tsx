import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  BarChart3,
  BellDot,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Inbox as InboxIcon,
  Instagram,
  LayoutDashboard,
  LogOut,
  Mail,
  MessageCircle,
  MessageSquare,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  Settings,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { InboxView, useInboxBadge } from "@/components/inbox/InboxView";
import { InboxPauseAllButton } from "@/components/inbox/InboxPauseAllButton";
import { InboxBroadcastButton } from "@/components/inbox/InboxBroadcastButton";
import { ChatThread } from "@/components/chat/ChatThread";
import { FeedbackView } from "@/components/feedback/FeedbackView";
import { ContactsView } from "@/components/contacts/ContactsView";
import { useFeedback } from "@/contexts/FeedbackContext";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Copy, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { supabaseCC } from "@/lib/supabaseCC";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/hooks/useAuth";
import { useGymContext } from "@/hooks/useGymContext";
import { useIndustry } from "@/contexts/IndustryContext";
import { industryCategories, industries } from "@/config/industries";
import {
  useBookings,
  useBookingsByDay,
  useConversations,
  useDashboardMetrics,
  useGymConfigs,
  useLeadMomentum,
  useLeadSourceBreakdown,
  type BookingRow,
  type ChatMessage,
  type ConversationRow,
} from "@/hooks/useDashboardData";
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { APP_NAME, displayName, displayDash, resolvePreferredDay } from "@/lib/displayHelpers";
import { OnboardingChat, type ConfigData } from "@/components/OnboardingChat";
import fluarioLogo from "@/assets/fluario-logo.png";

type ViewKey = "overview" | "bookings" | "calendar" | "analytics" | "inbox" | "contacts" | "feedback" | "ai-configurator" | "settings";

const navigation = [
  { key: "overview", label: "Overview", icon: LayoutDashboard },
  { key: "bookings", label: "Bookings", icon: ClipboardList },
  { key: "calendar", label: "Calendar", icon: CalendarDays },
  { key: "analytics", label: "Analytics", icon: BarChart3 },
  { key: "inbox", label: "Inbox", icon: InboxIcon },
  { key: "contacts", label: "Contacts", icon: Users },
  { key: "feedback", label: "Escalations", icon: AlertTriangle },
  { key: "ai-configurator", label: "AI Configurator", icon: Sparkles },
  { key: "settings", label: "Settings", icon: Settings },
] as const satisfies Array<{ key: ViewKey; label: string; icon: typeof LayoutDashboard }>;

const VIEW_SUBTITLES: Record<ViewKey, string> = {
  overview: "Snapshot of leads, bookings and conversions.",
  bookings: "Manage trial bookings and their status.",
  calendar: "Upcoming sessions across the month and week.",
  analytics: "Lead momentum and source breakdown.",
  inbox: "Replies, escalations and AI suggestions.",
  contacts: "Every lead in your workspace at a glance.",
  feedback: "Conversations the AI couldn't resolve.",
  "ai-configurator": "Configure your AI agent behaviour and qualification rules.",
  settings: "Branding, team access and integrations.",
};

function statusClasses(status: string) {
  const s = status.toLowerCase();
  if (s === "converted") return "border-emerald-400/40 bg-emerald-400/10 text-emerald-200";
  if (s === "showed up" || s === "showed_up") return "border-sky-400/35 bg-sky-400/10 text-sky-100";
  if (s === "needs response" || s === "needs_response") return "border-primary/40 bg-primary/10 text-primary";
  if (s === "closed" || s === "inactive") return "border-white/10 bg-white/5 text-muted-foreground";
  return "border-primary/40 bg-primary/10 text-primary";
}

function navButtonClass(active: boolean) {
  return cn(
    "flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium tracking-[0.02em] transition-all duration-200",
    active
      ? "bg-white/[0.07] text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
      : "text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
  );
}

function titleCase(s: string | null | undefined) {
  if (!s) return "—";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function lastMessagePreview(c: ConversationRow): { text: string; messages: ChatMessage[] } {
  const msgs = (Array.isArray(c.messages) ? (c.messages as unknown as ChatMessage[]) : []) ?? [];
  const last = msgs[msgs.length - 1];
  const text = last?.content ?? last?.text ?? "No messages yet.";
  return { text, messages: msgs };
}

function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="flex h-full min-h-[220px] flex-col items-center justify-center rounded-[26px] border border-dashed border-white/[0.08] bg-white/[0.02] p-8 text-center">
      <p className="text-sm font-medium text-foreground/90">{title}</p>
      {hint && <p className="mt-2 max-w-md text-sm text-muted-foreground">{hint}</p>}
    </div>
  );
}

/* ---------- Calendar grid for current month ---------- */
function buildMonthGrid(date: Date, bookings: BookingRow[]) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const first = new Date(year, month, 1);
  const startOffset = first.getDay(); // Sun=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();

  const eventsByDay = new Map<number, string[]>();
  bookings.forEach(b => {
    if (!b.created_at) return;
    const d = new Date(b.created_at);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const key = d.getDate();
      const label = `${b.booking_time ?? ""} ${b.name ?? "Lead"}`.trim();
      const arr = eventsByDay.get(key) ?? [];
      arr.push(label);
      eventsByDay.set(key, arr);
    }
  });

  const cells: { day: number; muted?: boolean; event?: string; emphasis?: boolean }[] = [];
  for (let i = startOffset; i > 0; i--) cells.push({ day: prevDays - i + 1, muted: true });
  for (let d = 1; d <= daysInMonth; d++) {
    const events = eventsByDay.get(d);
    cells.push({
      day: d,
      event: events?.[0],
      emphasis: !!events && d === new Date().getDate() && month === new Date().getMonth(),
    });
  }
  while (cells.length % 7 !== 0) cells.push({ day: cells.length - daysInMonth - startOffset + 1, muted: true });
  return cells;
}

/* ---------- Week view helpers ---------- */
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const WEEK_HOURS = Array.from({ length: 17 }, (_, i) => i + 6); // 6AM..10PM

function startOfWeek(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay()); // Sun
  return d;
}

function formatHourLabel(h: number) {
  const period = h >= 12 ? "PM" : "AM";
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display}${period}`;
}

/** Parse "10:00 AM" / "10 AM" / "14:00" -> hour 0-23, or null */
function parseBookingHour(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const s = raw.trim().toUpperCase();
  const m = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?/);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const period = m[3];
  if (period === "PM" && h < 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  if (h < 0 || h > 23) return null;
  return h;
}

type WeekEvent = { id: string; name: string; time: string; dayIdx: number; hour: number };

function buildWeekEvents(weekStart: Date, bookings: BookingRow[]): WeekEvent[] {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);
  const events: WeekEvent[] = [];

  bookings.forEach(b => {
    let dayIdx: number | null = null;
    let hour: number | null = parseBookingHour(b.booking_time);

    // Prefer the booking_date's weekday when within current week (using created_at week if matches)
    const bookingDayName = b.booking_date
      ? DAY_NAMES[new Date(b.booking_date).getDay()]
      : null;
    if (bookingDayName) {
      const idx = DAY_NAMES.findIndex(
        d => d.toLowerCase() === bookingDayName.trim().toLowerCase(),
      );
      if (idx >= 0) dayIdx = idx;
    }

    // Fallback to created_at date placement
    if (b.created_at) {
      const d = new Date(b.created_at);
      if (d >= weekStart && d < weekEnd) {
        if (dayIdx === null) dayIdx = d.getDay();
        if (hour === null) hour = d.getHours();
      } else if (dayIdx !== null) {
        // preferred_day given but created_at outside this week — still show only if created_at within week.
        // Skip events whose created_at is not in this week to avoid showing every booking every week.
        return;
      } else {
        return;
      }
    } else if (dayIdx === null) {
      return;
    }

    if (dayIdx === null) return;
    if (hour === null) hour = 9; // default slot
    if (hour < WEEK_HOURS[0]) hour = WEEK_HOURS[0];
    if (hour > WEEK_HOURS[WEEK_HOURS.length - 1]) hour = WEEK_HOURS[WEEK_HOURS.length - 1];

    events.push({
      id: b.id,
      name: b.name ?? "Lead",
      time: b.booking_time ?? "",
      dayIdx,
      hour,
    });
  });

  return events;
}

const Index = () => {
  const { theme, setTheme, themes } = useTheme();
  const { user, signOut } = useAuth();
  const { businessId } = useGymContext();
  const { industry, industryId, setIndustryId, customDescription } = useIndustry();
  const { unreadCount: feedbackUnread } = useFeedback();
  const [inviteCode, setInviteCode] = useState<string>("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [activeView, setActiveView] = useState<ViewKey>("overview");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sourceFilter, setSourceFilter] = useState("All");
  const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null);
  const [updatingBookingId, setUpdatingBookingId] = useState<string | null>(null);
  const [chatFilter, setChatFilter] = useState("All");
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [inboxInitialConversationId, setInboxInitialConversationId] = useState<string | null>(null);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState<"month" | "week">("month");
  const [welcomeGymName, setWelcomeGymName] = useState<string>("");
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [tempCustomDesc, setTempCustomDesc] = useState<string>("");

  // AI Configurator state
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [qualificationStrictness, setQualificationStrictness] = useState("medium");
  const [badLeadDefinition, setBadLeadDefinition] = useState("");
  const [repeatedQuestions, setRepeatedQuestions] = useState(false);
  const [leadSilentEnabled, setLeadSilentEnabled] = useState(false);
  const [leadSilentHours, setLeadSilentHours] = useState<number | null>(null);
  const [specificKeywordsEnabled, setSpecificKeywordsEnabled] = useState(false);
  const [specificKeywords, setSpecificKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [followUpEnabled, setFollowUpEnabled] = useState(false);
  const [followUpDelayHours, setFollowUpDelayHours] = useState(24);
  const [followUpMax, setFollowUpMax] = useState(3);
  const [followUpTone, setFollowUpTone] = useState<"casual" | "value-add" | "last-attempt">("casual");

  // Extended AI Configurator state
  const [aiName, setAiName] = useState("");
  const [aiPersonality, setAiPersonality] = useState("professional");
  const [knowledgePricing, setKnowledgePricing] = useState("");
  const [knowledgeHours, setKnowledgeHours] = useState("");
  const [knowledgeLocation, setKnowledgeLocation] = useState("");
  const [goals, setGoals] = useState<Array<{ id: string; title: string; target: number; metric: string; current?: number }>>([]);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [newGoalTarget, setNewGoalTarget] = useState(10);
  const [newGoalMetric, setNewGoalMetric] = useState("Bookings");
  const [demoEnabled, setDemoEnabled] = useState(false);
  const [demoKeyword, setDemoKeyword] = useState("fluario");
  const [qualQuestions, setQualQuestions] = useState<Array<{ id: string; text: string; expanded: boolean }>>([]);
  const [newQuestionInput, setNewQuestionInput] = useState("");
  const [cantAnswer, setCantAnswer] = useState(false);
  const [angryLead, setAngryLead] = useState(false);
  const [competitorMentioned, setCompetitorMentioned] = useState(false);
  const [injuryConcern, setInjuryConcern] = useState(false);
  const [readyToBuy, setReadyToBuy] = useState(false);
  const [callbackRequest, setCallbackRequest] = useState(false);
  const [botQuestion, setBotQuestion] = useState(false);
  const [conversationTooLong, setConversationTooLong] = useState(false);
  const [bulkVipInquiry, setBulkVipInquiry] = useState(false);

  // Contact state
  const [contactPhone, setContactPhone] = useState("");
  const [escalationChannel, setEscalationChannel] = useState<"email" | "sms" | "whatsapp" | "instagram">("email");
  const [contactEmail, setContactEmail] = useState("");

  // Team access state
  const [staffInviteCode, setStaffInviteCode] = useState<string>("");
  const [staffInviteLoading, setStaffInviteLoading] = useState(false);
  const [userRole, setUserRole] = useState<"admin" | "manager" | "user" | null>(null);

  const bookingsState = useBookings();
  const conversationsState = useConversations();
  const gymsState = useGymConfigs();
  const { metrics } = useDashboardMetrics();
  const { breakdown: sourceData } = useLeadSourceBreakdown();
  const { byDay: bookingsByDay } = useBookingsByDay();
  const { series: analyticsSeries } = useLeadMomentum();

  const bookings = bookingsState.data ?? [];
  const conversations = conversationsState.data ?? [];
  const gym = gymsState.data?.[0];
  const quickReplies = useMemo(() => {
    const raw = (gym as unknown as { quick_replies?: unknown })?.quick_replies;
    if (Array.isArray(raw)) return raw.filter((s): s is string => typeof s === "string");
    return [];
  }, [gym]);
  const { count: inboxBadge, refresh: refreshInboxBadge } = useInboxBadge();

  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      const name = (b.name ?? "").toLowerCase();
      const phone = (b.phone ?? "").toLowerCase();
      const matchesSearch = name.includes(search.toLowerCase()) || phone.includes(search.toLowerCase());
      const matchesStatus = statusFilter === "All" || (b.status ?? "").toLowerCase() === statusFilter.toLowerCase();
      const matchesSource = sourceFilter === "All" || (b.source ?? "").toLowerCase() === sourceFilter.toLowerCase();
      return matchesSearch && matchesStatus && matchesSource;
    });
  }, [bookings, search, statusFilter, sourceFilter]);

  const filteredChats = useMemo(() => {
    if (chatFilter === "All") return conversations;
    return conversations.filter(c => (c.status ?? "").toLowerCase() === chatFilter.toLowerCase());
  }, [conversations, chatFilter]);

  const selectedChat =
    filteredChats.find(c => c.id === selectedChatId) ?? filteredChats[0] ?? conversations[0];
  const selectedChatPreview = selectedChat ? lastMessagePreview(selectedChat) : null;

  const updateBookingStatus = async (booking: BookingRow, nextStatus: string) => {
    const current = (booking.status ?? "").toLowerCase();
    if (current === nextStatus.toLowerCase()) return;
    setUpdatingBookingId(booking.id);
    if (!businessId) {
      toast.error("No business selected for this account.");
      setUpdatingBookingId(null);
      return;
    }
    const { error } = await (supabase as any)
      .from("bookings")
      .update({ status: nextStatus })
      .eq("id", booking.id)
      .eq("business_id", businessId);

    if (error) {
      toast.error(`Could not update status: ${error.message}`);
      setUpdatingBookingId(null);
      return;
    }

    // Optimistically refresh local list by mutating booking via re-fetch trigger:
    // We rely on the next state read; simplest approach: patch in place.
    booking.status = nextStatus;

    if (nextStatus.toLowerCase() === "confirmed") {
      const { error: fnErr } = await supabase.functions.invoke(
        "send-booking-confirmation",
        { body: { booking_id: booking.id } },
      );
      if (fnErr) {
        toast.error(`Status saved, but email failed: ${fnErr.message}`);
      } else {
        toast.success("Confirmed — email sent to manager");
      }
    } else {
      toast.success(`Status updated to ${nextStatus}`);
    }

    setUpdatingBookingId(null);
  };

  const calendarCells = useMemo(() => buildMonthGrid(calendarDate, bookings), [calendarDate, bookings]);
  const monthLabel = calendarDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const weekStart = useMemo(() => startOfWeek(calendarDate), [calendarDate]);
  const weekDays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + i);
        return d;
      }),
    [weekStart],
  );
  const weekEvents = useMemo(() => buildWeekEvents(weekStart, bookings), [weekStart, bookings]);
  const weekLabel = useMemo(() => {
    const end = weekDays[6];
    const sameMonth = weekStart.getMonth() === end.getMonth();
    const startStr = weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const endStr = end.toLocaleDateString("en-US", {
      month: sameMonth ? undefined : "short",
      day: "numeric",
      year: "numeric",
    });
    return `${startStr} – ${endStr}`;
  }, [weekStart, weekDays]);

  const goPrev = () => {
    const d = new Date(calendarDate);
    if (calendarView === "month") d.setMonth(d.getMonth() - 1);
    else d.setDate(d.getDate() - 7);
    setCalendarDate(d);
  };
  const goNext = () => {
    const d = new Date(calendarDate);
    if (calendarView === "month") d.setMonth(d.getMonth() + 1);
    else d.setDate(d.getDate() + 7);
    setCalendarDate(d);
  };

  const generateCode = () =>
    Array.from({ length: 8 }, () => {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      return chars[Math.floor(Math.random() * chars.length)];
    }).join("");

  const visibleNavigation = userRole === "user"
    ? navigation.filter(n => n.key === "inbox" || n.key === "feedback")
    : navigation;

  useEffect(() => {
    if (!businessId) {
      setInviteCode("");
      return;
    }
    let cancelled = false;
    (async () => {
      const { data: businessRow, error: bizErr } = await supabase
        .from("businesses")
        .select("invite_code")
        .eq("id", businessId)
        .maybeSingle();
      if (cancelled) return;
      if (bizErr) {
        toast.error(`Could not load invite code: ${bizErr.message}`);
        return;
      }
      setInviteCode(businessRow?.invite_code ?? "");
    })();
    return () => { cancelled = true; };
  }, [businessId]);

  useEffect(() => {
    if (!businessId) { setStaffInviteCode(""); return; }
    let cancelled = false;
    (async () => {
      const { data } = await (supabase as any)
        .from("businesses")
        .select("staff_invite_code")
        .eq("id", businessId)
        .maybeSingle();
      if (cancelled) return;
      setStaffInviteCode(data?.staff_invite_code ?? "");
    })();
    return () => { cancelled = true; };
  }, [businessId]);

  useEffect(() => {
    if (!user) { setUserRole(null); return; }
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      setUserRole((data?.role as "admin" | "manager" | "user") ?? null);
    })();
  }, [user]);

  useEffect(() => {
    if (!businessId) {
      setWelcomeGymName("");
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("businesses")
        .select("display_name")
        .eq("id", businessId)
        .maybeSingle();
      if (cancelled || error) return;
      setWelcomeGymName(data?.display_name ?? "");
    })();
    return () => { cancelled = true; };
  }, [businessId]);

  useEffect(() => {
    if (customDescription) setTempCustomDesc(customDescription);
  }, [customDescription]);

  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;
    (async () => {
      const { data: rawCfg } = await (supabase as any)
        .from("business_configs")
        .select("qualification_strictness, bad_lead_definition, repeated_questions, lead_silent_hours, specific_keywords, follow_up_enabled, follow_up_delay_hours, follow_up_max, follow_up_tone, ai_name, persona, knowledge, goals, demo_mode, demo_trigger_word, qualification_questions, escalation_rules, contact_phone, contact_email, escalation_channel")
        .eq("business_id", businessId)
        .maybeSingle();
      if (cancelled || !rawCfg) return;
      if (rawCfg.qualification_strictness) setQualificationStrictness(rawCfg.qualification_strictness);
      if (rawCfg.bad_lead_definition != null) setBadLeadDefinition(rawCfg.bad_lead_definition ?? "");
      if (rawCfg.repeated_questions != null) setRepeatedQuestions(!!rawCfg.repeated_questions);
      if (rawCfg.lead_silent_hours != null) { setLeadSilentEnabled(true); setLeadSilentHours(Number(rawCfg.lead_silent_hours)); }
      if (Array.isArray(rawCfg.specific_keywords)) { setSpecificKeywords(rawCfg.specific_keywords as string[]); if ((rawCfg.specific_keywords as string[]).length > 0) setSpecificKeywordsEnabled(true); }
      if (typeof rawCfg.follow_up_enabled === "boolean") setFollowUpEnabled(rawCfg.follow_up_enabled);
      if (rawCfg.follow_up_delay_hours != null) setFollowUpDelayHours(Number(rawCfg.follow_up_delay_hours));
      if (rawCfg.follow_up_max != null) setFollowUpMax(Number(rawCfg.follow_up_max));
      if (rawCfg.follow_up_tone) setFollowUpTone(rawCfg.follow_up_tone as "casual" | "value-add" | "last-attempt");
      if (rawCfg.ai_name != null) setAiName(rawCfg.ai_name ?? "");
      if ((rawCfg.persona as any)?.personality) setAiPersonality((rawCfg.persona as any).personality);
      if (rawCfg.knowledge) {
        const k = rawCfg.knowledge as Record<string, string>;
        if (k.pricing != null) setKnowledgePricing(k.pricing ?? "");
        if (k.opening_hours != null) setKnowledgeHours(k.opening_hours ?? "");
        if (k.location != null) setKnowledgeLocation(k.location ?? "");
      }
      if (Array.isArray(rawCfg.goals)) setGoals(rawCfg.goals as Array<{ id: string; title: string; target: number; metric: string; current?: number }>);
      if (typeof rawCfg.demo_mode === "boolean") setDemoEnabled(rawCfg.demo_mode);
      if (rawCfg.demo_trigger_word) setDemoKeyword(rawCfg.demo_trigger_word);
      if (Array.isArray(rawCfg.qualification_questions)) setQualQuestions(rawCfg.qualification_questions as Array<{ id: string; text: string; expanded: boolean }>);
      if (rawCfg.escalation_rules) {
        const er = rawCfg.escalation_rules as Record<string, boolean>;
        if (er.cant_answer != null) setCantAnswer(!!er.cant_answer);
        if (er.angry != null) setAngryLead(!!er.angry);
        if (er.competitor != null) setCompetitorMentioned(!!er.competitor);
        if (er.injury != null) setInjuryConcern(!!er.injury);
        if (er.ready_to_buy != null) setReadyToBuy(!!er.ready_to_buy);
        if (er.callback_request != null) setCallbackRequest(!!er.callback_request);
        if (er.bot_question != null) setBotQuestion(!!er.bot_question);
        if (er.conversation_too_long != null) setConversationTooLong(!!er.conversation_too_long);
        if (er.vip_inquiry != null) setBulkVipInquiry(!!er.vip_inquiry);
      }
      if (rawCfg.contact_phone != null) setContactPhone(rawCfg.contact_phone ?? "");
      if (rawCfg.contact_email != null) setContactEmail(rawCfg.contact_email ?? "");
      if (rawCfg.escalation_channel) setEscalationChannel(rawCfg.escalation_channel as "email" | "sms" | "whatsapp" | "instagram");
    })();
    return () => { cancelled = true; };
  }, [businessId]);

  const upsertBusinessConfig = async (patch: Record<string, unknown>) => {
    if (!businessId) return;
    await (supabase as any)
      .from("business_configs")
      .upsert({ business_id: businessId, ...patch }, { onConflict: "business_id" });
  };

  const saveQualification = useCallback(async () => {
    if (!businessId) return;
    await (supabase as any)
      .from("business_configs")
      .upsert({ business_id: businessId, qualification_strictness: qualificationStrictness, bad_lead_definition: badLeadDefinition || null }, { onConflict: "business_id" });
  }, [businessId, qualificationStrictness, badLeadDefinition]);

  const saveLeadSilentHours = useCallback(async (hours: number | null) => {
    if (!businessId) return;
    await (supabase as any).from("business_configs").upsert({ business_id: businessId, lead_silent_hours: hours }, { onConflict: "business_id" });
  }, [businessId]);

  const saveSpecificKeywords = useCallback(async (keywords: string[]) => {
    if (!businessId) return;
    await (supabase as any).from("business_configs").upsert({ business_id: businessId, specific_keywords: keywords }, { onConflict: "business_id" });
  }, [businessId]);

  const saveFollowUp = useCallback(async (enabled: boolean, delayHours: number, max: number, tone: string) => {
    if (!businessId) return;
    const { error } = await (supabase as any).from("business_configs").upsert(
      { business_id: businessId, follow_up_enabled: enabled, follow_up_delay_hours: delayHours, follow_up_max: max, follow_up_tone: tone },
      { onConflict: "business_id" },
    );
    if (error) toast.error(`Could not save: ${error.message}`);
    else toast.success("Saved");
  }, [businessId]);

  const regenerateInviteCode = async () => {
    if (!user) {
      toast.error("No business is linked to your account.");
      return;
    }
    setInviteLoading(true);

    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("business_id, role")
      .eq("id", user.id)
      .single();

    if (profileErr || !profile?.business_id) {
      setInviteLoading(false);
      toast.error("No business is linked to your account.");
      return;
    }

    const { error: rpcErr } = await supabase.rpc("regenerate_invite_code", { code_type: "manager" });
    if (rpcErr) {
      setInviteLoading(false);
      toast.error(`Could not regenerate code: ${rpcErr.message}`);
      return;
    }

    const { data: biz, error: bizErr } = await supabase
      .from("businesses")
      .select("invite_code, staff_invite_code")
      .eq("id", profile.business_id)
      .single();

    setInviteLoading(false);
    if (bizErr) {
      toast.error(`Could not load new code: ${bizErr.message}`);
      return;
    }
    setInviteCode(biz?.invite_code ?? "");
    setStaffInviteCode(biz?.staff_invite_code ?? "");
    toast.success("New invite code generated");
  };

  const copyInviteCode = async () => {
    if (!inviteCode) return;
    await navigator.clipboard.writeText(inviteCode);
    toast.success("Invite code copied");
  };

  const regenerateStaffInviteCode = async () => {
    if (!user) {
      toast.error("No business is linked to your account.");
      return;
    }
    setStaffInviteLoading(true);

    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("business_id, role")
      .eq("id", user.id)
      .single();

    if (profileErr || !profile?.business_id) {
      setStaffInviteLoading(false);
      toast.error("No business is linked to your account.");
      return;
    }

    const { error: rpcErr } = await supabase.rpc("regenerate_invite_code", { code_type: "staff" });
    if (rpcErr) {
      setStaffInviteLoading(false);
      toast.error(`Could not regenerate staff code: ${rpcErr.message}`);
      return;
    }

    const { data: biz, error: bizErr } = await supabase
      .from("businesses")
      .select("invite_code, staff_invite_code")
      .eq("id", profile.business_id)
      .single();

    setStaffInviteLoading(false);
    if (bizErr) {
      toast.error(`Could not load new code: ${bizErr.message}`);
      return;
    }
    setInviteCode(biz?.invite_code ?? "");
    setStaffInviteCode(biz?.staff_invite_code ?? "");
    toast.success("New staff invite code generated");
  };

  const copyStaffInviteCode = async () => {
    if (!staffInviteCode) return;
    await navigator.clipboard.writeText(staffInviteCode);
    toast.success("Staff invite code copied");
  };


  const currentLabel = navigation.find(item => item.key === activeView)?.label ?? "Dashboard";
  const gymName = gym?.workspace_name ?? APP_NAME;
  const totalAlerts = inboxBadge;
  const isInboxView = activeView === "inbox";

  const bookingsToday = useMemo(() => {
    const today = new Date();
    return bookings.filter(b => {
      if (!b.created_at) return false;
      const d = new Date(b.created_at);
      return (
        d.getFullYear() === today.getFullYear() &&
        d.getMonth() === today.getMonth() &&
        d.getDate() === today.getDate()
      );
    }).length;
  }, [bookings]);

  const todayFocusMessage =
    inboxBadge > 0
      ? `${inboxBadge} conversation${inboxBadge === 1 ? "" : "s"} need a reply`
      : bookingsToday > 0
        ? `${bookingsToday} booking${bookingsToday === 1 ? "" : "s"} today`
        : "All clear today";

  const handleApplyOnboardingConfig = async (cfg: ConfigData) => {
    if (!businessId) return;
    const update: Record<string, unknown> = {};
    if (cfg.ai_name) update.ai_name = cfg.ai_name;
    if (cfg.ai_personality) update.persona = { personality: cfg.ai_personality };
    if (cfg.business_type) update.business_type = cfg.business_type;
    if (cfg.niche) update.niche = cfg.niche;
    if (cfg.system_prompt) update.system_prompt = cfg.system_prompt;
    const knowledge: Record<string, string> = {};
    if (cfg.pricing) knowledge.pricing = cfg.pricing;
    if (cfg.opening_hours) knowledge.opening_hours = cfg.opening_hours;
    if (cfg.location) knowledge.location = cfg.location;
    if (Object.keys(knowledge).length) update.knowledge = knowledge;
    if (cfg.screening_questions?.length) update.qualification_questions = cfg.screening_questions.map((q, i) => ({ id: `sq-${Date.now()}-${i}`, text: q, expanded: false }));
    if (cfg.qualification_strictness) update.qualification_strictness = cfg.qualification_strictness;
    if (cfg.bad_lead_definition) update.bad_lead_definition = cfg.bad_lead_definition;
    if (cfg.goal) update.goals = [{ id: `goal-${Date.now()}`, title: cfg.goal, target: 1, metric: "Custom" }];
    if (cfg.escalation_rules) {
      const er = cfg.escalation_rules;
      update.escalation_rules = { cant_answer: er.cant_answer ?? false, angry: er.angry_lead ?? false, competitor: er.competitor_mentioned ?? false, injury: er.injury_concern ?? false, ready_to_buy: er.ready_to_buy ?? false, callback_request: er.callback_request ?? false, repeated_questions: er.repeated_questions ?? false, silence_enabled: er.lead_silent_hours != null, vip_inquiry: er.bulk_vip ?? false };
      if (er.lead_silent_hours != null) update.lead_silent_hours = er.lead_silent_hours;
      if (er.specific_keywords?.length) update.specific_keywords = er.specific_keywords;
    }
    if (cfg.demo_mode?.enabled !== undefined) update.demo_mode = cfg.demo_mode.enabled;
    if (cfg.demo_mode?.keyword) update.demo_trigger_word = cfg.demo_mode.keyword;
    await (supabase as any).from("business_configs").update(update).eq("business_id", businessId);
    if (cfg.qualification_strictness) setQualificationStrictness(cfg.qualification_strictness);
    if (cfg.bad_lead_definition) setBadLeadDefinition(cfg.bad_lead_definition);
    toast.success("AI configured! Your settings have been updated.");
  };

  return (
    <>
    <div className={cn("relative bg-background text-foreground", isInboxView ? "h-screen overflow-hidden" : "min-h-screen")}>
      <div className={cn("relative z-10 flex flex-col md:grid md:grid-cols-[248px_minmax(0,1fr)]", isInboxView ? "h-full min-h-0 overflow-hidden" : "min-h-screen")}>
        <aside className="border-b border-white/[0.06] bg-[linear-gradient(180deg,hsl(233_30%_5%/0.94)_0%,hsl(233_30%_6%/0.98)_100%)] px-5 py-6 md:border-r md:border-b-0 md:px-6 md:py-7">
          <div className="flex items-center justify-between pb-6 md:pb-8">
            <div className="flex flex-col items-start gap-1.5">
              <img
                src={fluarioLogo}
                alt="Fluario"
                className="block h-10 w-auto max-h-[40px] object-contain"
              />
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                AI Dashboard
              </p>
            </div>
          </div>

          <nav className="hidden space-y-2 md:block">
            {visibleNavigation.map(item => {
              const Icon = item.icon;
              const showBadge = item.key === "inbox" && inboxBadge > 0 && activeView !== "inbox";
              return (
                <button
                  key={item.key}
                  type="button"
                  className={navButtonClass(activeView === item.key)}
                  onClick={() => setActiveView(item.key)}
                >
                  <Icon className="h-4 w-4" />
                  <span className="relative">
                    {item.label}
                  </span>
                  {showBadge && (
                    <span className="ml-auto inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
                      {inboxBadge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="mt-2 flex gap-2 overflow-x-auto pb-1 md:hidden">
            {visibleNavigation.map(item => {
              const Icon = item.icon;
              const showBadge = item.key === "inbox" && inboxBadge > 0 && activeView !== "inbox";
              return (
                <button
                  key={item.key}
                  type="button"
                  className={cn(
                    "relative flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-medium transition-colors",
                    activeView === item.key
                      ? "border-primary/50 bg-primary/15 text-primary"
                      : "border-white/10 bg-white/[0.04] text-muted-foreground"
                  )}
                  onClick={() => setActiveView(item.key)}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="relative">
                    {item.label}
                  </span>
                  {showBadge && (
                    <span className="ml-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                      {inboxBadge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-6 hidden rounded-[28px] border border-white/[0.06] bg-white/[0.04] p-4 md:block">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-primary/15 p-2.5 text-primary">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Today focus</p>
                <p className="text-xs text-muted-foreground">{todayFocusMessage}</p>
              </div>
            </div>
            <div className="mt-4 h-2 rounded-full bg-white/[0.06]">
              <div className="h-2 rounded-full bg-gradient-fire" style={{ width: `${Math.min(100, metrics.conversionRate)}%` }} />
            </div>
          </div>

          <button
            type="button"
            onClick={() => signOut()}
            className="mt-8 hidden items-center gap-2 pt-4 text-sm text-muted-foreground hover:text-foreground md:flex"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </aside>

        <main className={cn("min-w-0 px-4 py-4 md:px-6 md:py-5 xl:px-8", isInboxView && "min-h-0 flex-1 overflow-hidden")}>
          <div className={cn("dashboard-frame mx-auto flex max-w-[1500px] flex-col rounded-[30px] border border-white/[0.06] bg-card/70 shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl", isInboxView ? "h-full min-h-0" : "min-h-[calc(100vh-2rem)]")}>
            <header className="flex shrink-0 flex-col gap-4 border-b border-white/[0.06] px-5 py-5 md:flex-row md:items-center md:justify-between md:px-7">
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
                  {APP_NAME} <span className="mx-1.5 text-muted-foreground/50">/</span> {currentLabel}
                </p>
                <h1 className="font-display mt-2 text-2xl font-semibold uppercase tracking-[0.12em] text-foreground md:text-[28px]">
                  {currentLabel}
                </h1>
                {activeView === "overview" && welcomeGymName ? (
                  <p className="mt-1.5 text-sm font-normal tracking-[0.02em] text-muted-foreground">
                    Welcome back, <span className="text-foreground/90">{welcomeGymName}</span>
                  </p>
                ) : (
                  <p className="mt-1.5 text-sm font-normal tracking-[0.02em] text-muted-foreground">
                    {VIEW_SUBTITLES[activeView]}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {activeView === "inbox" && <InboxBroadcastButton />}
                {activeView === "inbox" && <InboxPauseAllButton />}
                <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-foreground/80">
                  <BellDot className="h-4 w-4 text-primary" />
                  {totalAlerts} alert{totalAlerts === 1 ? "" : "s"} need review
                </div>
                <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-muted-foreground">
                  {user?.email ?? "Signed in"}
                </div>
              </div>
            </header>

            <section className="min-h-0 flex-1 overflow-hidden px-4 py-4 md:px-6 md:py-5">
              {activeView === "overview" && (
                <div className="grid h-full gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      {[
                        { label: `Total ${industry.lead.toLowerCase()}s`, value: String(metrics.totalLeads), icon: Users },
                        { label: "Conversion rate", value: `${metrics.conversionRate}%`, icon: TrendingUp },
                        { label: industry.converted, value: String(metrics.converted), icon: CheckCircle2 },
                        { label: `${industry.booking}s booked`, value: String(metrics.trialsBooked), icon: CalendarDays },
                      ].map(card => {
                        const Icon = card.icon;
                        return (
                          <div key={card.label} className="dashboard-panel p-5 md:p-6">
                            <div className="flex items-center justify-between">
                              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{card.label}</p>
                              <Icon className="h-4 w-4 text-primary" />
                            </div>
                            <p className="mt-5 font-display text-3xl font-semibold text-foreground">{card.value}</p>
                          </div>
                        );
                      })}
                    </div>

                    <div className="dashboard-panel h-[360px] p-5 md:p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{industry.lead} momentum</p>
                          <h2 className="mt-2 text-lg font-semibold text-foreground">{industry.lead}s & {industry.booking.toLowerCase()}s — last 30 days</h2>
                        </div>
                        <div className="flex items-center gap-5 text-sm text-muted-foreground">
                          <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-primary" /> {industry.lead}s</span>
                          <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: "hsl(14 100% 56%)" }} /> {industry.booking}s</span>
                        </div>
                      </div>
                      <div className="mt-6 h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={analyticsSeries}>
                            <CartesianGrid stroke="hsl(0 0% 100% / 0.05)" vertical={false} />
                            <XAxis dataKey="day" stroke="hsl(230 8% 45%)" tickLine={false} axisLine={false} fontSize={12} />
                            <YAxis stroke="hsl(230 8% 45%)" tickLine={false} axisLine={false} fontSize={12} />
                            <Tooltip
                              cursor={{ stroke: "hsl(36 94% 56% / 0.18)", strokeWidth: 1 }}
                              contentStyle={{
                                backgroundColor: "hsl(235 22% 11%)",
                                border: "1px solid hsl(0 0% 100% / 0.08)",
                                borderRadius: 16,
                                color: "hsl(40 18% 92%)",
                              }}
                            />
                            <Line type="monotone" dataKey="leads" stroke="hsl(36 94% 56%)" strokeWidth={2.5} dot={false} />
                            <Line type="monotone" dataKey="bookings" stroke="hsl(14 100% 56%)" strokeWidth={2.5} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="dashboard-panel p-5 md:p-6">
                      <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Next actions</p>
                      <div className="mt-5 space-y-3">
                        {conversations
                          .filter(c => (c.status ?? "").toLowerCase() === "needs response")
                          .slice(0, 3)
                          .map(c => (
                            <div key={c.id} className="flex items-start gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
                              <span className="mt-1 h-2.5 w-2.5 rounded-full bg-primary" />
                              <p className="text-sm text-foreground/90">Reply to {c.name ?? c.id}</p>
                            </div>
                          ))}
                        {bookings
                          .filter(b => (b.status ?? "").toLowerCase() === "confirmed")
                          .slice(0, 3)
                          .map(b => (
                            <div key={b.id} className="flex items-start gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
                              <span className="mt-1 h-2.5 w-2.5 rounded-full bg-primary" />
                              <p className="text-sm text-foreground/90">
                                Confirm {b.name ?? "lead"} for {b.booking_date ?? "—"} at {b.booking_time ?? "—"}
                              </p>
                            </div>
                          ))}
                        {conversations.length === 0 && bookings.length === 0 && (
                          <p className="text-sm text-muted-foreground">No actions waiting. Add leads or bookings to populate.</p>
                        )}
                      </div>
                    </div>

                    <div className="dashboard-panel p-5 md:p-6">
                      <div className="flex items-center justify-between">
                        <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{industry.lead} sources</p>
                        <p className="text-sm text-muted-foreground">All time</p>
                      </div>
                      {sourceData.length === 0 ? (
                        <p className="mt-5 text-sm text-muted-foreground">No bookings yet.</p>
                      ) : (
                        <div className="mt-5 grid gap-5 md:grid-cols-[180px_1fr] md:items-center">
                          <div className="mx-auto h-[180px] w-[180px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie data={sourceData} innerRadius={48} outerRadius={76} dataKey="value" stroke="none">
                                  {sourceData.map(item => (
                                    <Cell key={item.name} fill={item.color} />
                                  ))}
                                </Pie>
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="space-y-4">
                            {sourceData.map(item => (
                              <div key={item.name} className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="flex items-center gap-2 text-foreground/80">
                                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                                    {item.name}
                                  </span>
                                  <span className="text-foreground">{item.value}%</span>
                                </div>
                                <div className="h-2 rounded-full bg-white/[0.06]">
                                  <div className="h-2 rounded-full" style={{ width: `${item.value}%`, backgroundColor: item.color }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeView === "bookings" && (
                <div className="dashboard-panel h-full overflow-hidden">
                  <div className="flex flex-col gap-4 border-b border-white/[0.06] px-4 py-4 md:flex-row md:items-center md:px-5">
                    <div className="relative flex-1">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={search}
                        onChange={event => setSearch(event.target.value)}
                        placeholder="Search name or phone..."
                        className="h-12 rounded-2xl border-white/10 bg-white/[0.04] pl-10 text-foreground placeholder:text-muted-foreground"
                      />
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <label className="fit-filter">
                        <span>Status:</span>
                        <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
                          <option>All</option><option>Confirmed</option><option>Booked</option><option>Attended</option><option>{industry.converted}</option>
                        </select>
                      </label>
                      <label className="fit-filter">
                        <span>Source:</span>
                        <select value={sourceFilter} onChange={event => setSourceFilter(event.target.value)}>
                          <option>All</option><option>Instagram</option><option>Walk-in</option><option>Referral</option>
                        </select>
                      </label>
                    </div>
                  </div>

                  <div className="hidden grid-cols-[44px_1.2fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground lg:grid">
                    <span /><span>Name</span><span>Phone</span><span>Status</span><span>Source</span><span>Preferred day</span><span>Preferred time</span>
                  </div>

                  <div className="max-h-[calc(100vh-260px)] overflow-auto px-3 pb-3 md:px-4">
                    {bookingsState.loading && <p className="px-4 py-6 text-sm text-muted-foreground">Loading bookings…</p>}
                    {!bookingsState.loading && filteredBookings.length === 0 && (
                      <div className="px-4 pb-6 pt-2">
                        <EmptyState
                          title={bookingsState.error ? "Unable to load bookings" : "No bookings yet"}
                          hint={bookingsState.error ? "Unable to load bookings right now." : "Bookings will appear here as leads schedule trials."}
                        />
                      </div>
                    )}
                    {filteredBookings.map(booking => {
                      const expanded = expandedBookingId === booking.id;
                      return (
                        <div key={booking.id} className="mb-3 overflow-hidden rounded-[26px] border border-white/[0.06] bg-white/[0.025]">
                          <button
                            type="button"
                            className="grid w-full grid-cols-[36px_1fr] gap-3 px-4 py-4 text-left transition-colors hover:bg-white/[0.03] lg:grid-cols-[44px_1.2fr_1fr_1fr_1fr_1fr_1fr] lg:items-center lg:gap-4 lg:px-5"
                            onClick={() => setExpandedBookingId(expanded ? null : booking.id)}
                          >
                            <span className="flex items-center justify-center text-muted-foreground">
                              {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </span>
                            <div className="space-y-2 lg:space-y-0">
                              <p className="font-medium text-foreground">{displayName(booking.name)}</p>
                              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground lg:hidden">
                                <span>{displayDash(booking.phone)}</span><span>•</span><span>{titleCase(booking.source)}</span><span>•</span><span>{displayDash(booking.booking_date)}</span>
                              </div>
                            </div>
                            <p className="hidden text-muted-foreground lg:block">{displayDash(booking.phone)}</p>
                            <div className="hidden lg:block">
                              <span className={cn("inline-flex rounded-full border px-3 py-1 text-xs font-medium", statusClasses(booking.status ?? ""))}>
                                {titleCase(booking.status)}
                              </span>
                            </div>
                            <p className="hidden text-muted-foreground lg:block">{titleCase(booking.source)}</p>
                            <p className="hidden text-foreground/80 lg:block">{displayDash(booking.booking_date)}</p>
                            <p className="hidden text-foreground/80 lg:block">{displayDash(booking.booking_time)}</p>
                          </button>

                          {expanded && (
                            <div className="border-t border-white/[0.06] px-5 py-5 md:px-6">
                              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                                <div>
                                  <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Booking details</p>
                                  <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                                    <div><p className="fit-label">Full name</p><p className="fit-value">{displayName(booking.name)}</p></div>
                                    <div><p className="fit-label">Phone number</p><p className="fit-value">{displayDash(booking.phone)}</p></div>
                                    <div><p className="fit-label">Source</p><p className="fit-value">{titleCase(booking.source)}</p></div>
                                    <div><p className="fit-label">Preferred day</p><p className="fit-value">{displayDash(booking.booking_date)}</p></div>
                                    <div><p className="fit-label">Preferred time</p><p className="fit-value">{displayDash(booking.booking_time)}</p></div>
                                    <div><p className="fit-label">Created at</p><p className="fit-value">{formatDateTime(booking.created_at)}</p></div>
                                  </div>
                                </div>
                                <span className={cn("inline-flex rounded-full border px-3 py-1 text-xs font-medium", statusClasses(booking.status ?? ""))}>
                                  {titleCase(booking.status)}
                                </span>
                              </div>
                              <div className="mt-5 grid gap-4 xl:grid-cols-2">
                                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
                                  <p className="fit-label">Location</p>
                                  <p className="mt-3 text-sm leading-6 text-foreground/90">{booking.location ?? "—"}</p>
                                </div>
                                <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
                                  <p className="fit-label">{industry.lead} reference</p>
                                  <p className="mt-3 text-sm leading-6 text-foreground/90">{booking.contact_id}</p>
                                </div>
                              </div>
                              <div className="mt-5">
                                <p className="fit-label">Update status</p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {["Confirmed", "Attended", industry.converted, "Cancelled"].map(s => {
                                    const active = (booking.status ?? "").toLowerCase() === s.toLowerCase();
                                    return (
                                      <Button
                                        key={s}
                                        type="button"
                                        size="sm"
                                        variant={active ? "default" : "outline"}
                                        disabled={updatingBookingId === booking.id || active}
                                        onClick={() => updateBookingStatus(booking, s)}
                                        className={cn(
                                          "rounded-full border-white/10 bg-white/[0.04] text-foreground/90 hover:bg-white/[0.08]",
                                          active && "bg-primary text-primary-foreground hover:bg-primary",
                                        )}
                                      >
                                        {updatingBookingId === booking.id && !active ? "Saving…" : s}
                                      </Button>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeView === "calendar" && (
                <div className="dashboard-panel h-full p-4 md:p-5">
                  <div className="flex flex-col gap-4 border-b border-white/[0.06] pb-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
                        <button type="button" onClick={goPrev} className="p-3 text-foreground/80 hover:bg-white/[0.06]"><ChevronLeft className="h-4 w-4" /></button>
                        <button type="button" onClick={goNext} className="border-l border-white/10 p-3 text-foreground/80 hover:bg-white/[0.06]"><ChevronRight className="h-4 w-4" /></button>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => setCalendarDate(new Date())}
                        className="rounded-2xl border-white/10 bg-white/[0.04] text-foreground/90 hover:bg-white/[0.08] hover:text-foreground"
                      >
                        Today
                      </Button>
                    </div>
                    <div className="text-center">
                      <p className="font-display text-xl font-semibold uppercase tracking-[0.14em] text-foreground">
                        {calendarView === "month" ? monthLabel : weekLabel}
                      </p>
                    </div>
                    <div className="flex items-center rounded-2xl border border-white/10 bg-white/[0.04] p-1">
                      <button
                        type="button"
                        onClick={() => setCalendarView("month")}
                        className={cn(
                          "rounded-xl px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em]",
                          calendarView === "month" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        Month
                      </button>
                      <button
                        type="button"
                        onClick={() => setCalendarView("week")}
                        className={cn(
                          "rounded-xl px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em]",
                          calendarView === "week" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        Week
                      </button>
                    </div>
                  </div>

                  {calendarView === "month" && (
                    <div className="mt-4 grid grid-cols-7 border border-white/[0.06]">
                      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                        <div key={day} className="border-b border-white/[0.06] px-3 py-3 text-center text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          {day}
                        </div>
                      ))}
                      {calendarCells.map((cell, index) => (
                        <div
                          key={`${cell.day}-${index}`}
                          className={cn(
                            "min-h-[110px] border-b border-r border-white/[0.06] p-3 align-top last:border-r-0 xl:min-h-[126px]",
                            cell.emphasis && "bg-primary/[0.08]"
                          )}
                        >
                          <p className={cn("text-right text-sm font-medium", cell.muted ? "text-muted-foreground/40" : "text-muted-foreground")}>
                            {cell.day}
                          </p>
                          {cell.event && (
                            <div className="mt-8 flex items-center gap-2 rounded-full bg-white/[0.04] px-2.5 py-1.5 text-xs text-foreground xl:text-sm">
                              <span className="h-2 w-2 rounded-full bg-primary" />
                              <span className="truncate">{cell.event}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {calendarView === "week" && (
                    <div className="mt-4 overflow-x-auto">
                      <div className="min-w-[760px] border border-white/[0.06]">
                        {/* Header row: time gutter + 7 days */}
                        <div className="grid grid-cols-[72px_repeat(7,minmax(0,1fr))] border-b border-white/[0.06] bg-white/[0.02]">
                          <div className="border-r border-white/[0.06] px-2 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            Time
                          </div>
                          {weekDays.map((d, i) => {
                            const isToday =
                              d.toDateString() === new Date().toDateString();
                            return (
                              <div
                                key={i}
                                className={cn(
                                  "border-r border-white/[0.06] px-2 py-3 text-center last:border-r-0",
                                  isToday && "bg-primary/[0.08]"
                                )}
                              >
                                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                  {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][i]}
                                </p>
                                <p className={cn("font-display text-lg font-semibold", isToday ? "text-primary" : "text-foreground")}>
                                  {d.getDate()}
                                </p>
                              </div>
                            );
                          })}
                        </div>

                        {/* Hour rows */}
                        {WEEK_HOURS.map(hour => (
                          <div
                            key={hour}
                            className="grid grid-cols-[72px_repeat(7,minmax(0,1fr))] border-b border-white/[0.06] last:border-b-0"
                          >
                            <div className="border-r border-white/[0.06] px-2 py-2 text-right text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                              {formatHourLabel(hour)}
                            </div>
                            {Array.from({ length: 7 }, (_, dayIdx) => {
                              const slotEvents = weekEvents.filter(
                                e => e.dayIdx === dayIdx && e.hour === hour,
                              );
                              return (
                                <div
                                  key={dayIdx}
                                  className="relative min-h-[60px] border-r border-white/[0.06] p-1 last:border-r-0"
                                >
                                  {slotEvents.map(ev => (
                                    <div
                                      key={ev.id}
                                      className="mb-1 rounded-lg bg-primary/15 px-2 py-1 text-[11px] leading-tight text-foreground ring-1 ring-primary/30"
                                    >
                                      <p className="truncate font-semibold text-primary">{ev.time || formatHourLabel(hour)}</p>
                                      <p className="truncate text-foreground/90">{ev.name}</p>
                                    </div>
                                  ))}
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeView === "analytics" && (
                <div className="grid h-full gap-4 xl:grid-cols-[1.35fr_0.65fr]">
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      {[
                        { label: `Total ${industry.lead.toLowerCase()}s`, value: String(metrics.totalLeads) },
                        { label: "Conversion rate", value: `${metrics.conversionRate}%` },
                        { label: industry.converted, value: String(metrics.converted) },
                        { label: `${industry.booking}s booked`, value: String(metrics.trialsBooked) },
                      ].map(card => (
                        <div key={card.label} className="dashboard-panel p-5 md:p-6">
                          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{card.label}</p>
                          <p className="font-display mt-5 text-3xl font-semibold text-primary">{card.value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="dashboard-panel h-[360px] p-5 md:p-6">
                      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{industry.lead}s & {industry.booking.toLowerCase()}s — last 30 days</p>
                      <div className="mt-6 h-[270px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={analyticsSeries}>
                            <CartesianGrid stroke="hsl(0 0% 100% / 0.05)" vertical={false} />
                            <XAxis dataKey="day" stroke="hsl(230 8% 45%)" tickLine={false} axisLine={false} fontSize={12} />
                            <YAxis stroke="hsl(230 8% 45%)" tickLine={false} axisLine={false} fontSize={12} />
                            <Tooltip
                              cursor={{ stroke: "hsl(36 94% 56% / 0.18)", strokeWidth: 1 }}
                              contentStyle={{
                                backgroundColor: "hsl(235 22% 11%)",
                                border: "1px solid hsl(0 0% 100% / 0.08)",
                                borderRadius: 16,
                                color: "hsl(40 18% 92%)",
                              }}
                            />
                            <Line type="monotone" dataKey="leads" stroke="hsl(36 94% 56%)" strokeWidth={2.5} dot={false} />
                            <Line type="monotone" dataKey="bookings" stroke="hsl(14 100% 56%)" strokeWidth={2.5} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="dashboard-panel p-5 md:p-6">
                      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{industry.lead} sources</p>
                      {sourceData.length === 0 ? (
                        <p className="mt-5 text-sm text-muted-foreground">Awaiting first booking.</p>
                      ) : (
                        <>
                          <div className="mx-auto mt-3 h-[220px] w-full max-w-[260px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie data={sourceData} innerRadius={54} outerRadius={84} dataKey="value" stroke="none">
                                  {sourceData.map(item => (
                                    <Cell key={item.name} fill={item.color} />
                                  ))}
                                </Pie>
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="space-y-3">
                            {sourceData.map(item => (
                              <div key={item.name} className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-sm">
                                <span className="flex items-center gap-2 text-foreground/90">
                                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                                  {item.name}
                                </span>
                                <span className="text-foreground">{item.value}%</span>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>

                    <div className="dashboard-panel p-5 md:p-6">
                      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Bookings by day of week</p>
                      <div className="mt-5 space-y-4">
                        {bookingsByDay.map(item => {
                          const max = Math.max(1, ...bookingsByDay.map(d => d.value));
                          const pct = (item.value / max) * 100;
                          return (
                            <div key={item.label} className="space-y-2">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-foreground/80">{item.label}</span>
                                <span className="text-foreground">{item.value}</span>
                              </div>
                              <div className="h-2 rounded-full bg-white/[0.06]">
                                <div className="h-2 rounded-full bg-gradient-fire" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeView === "inbox" && (
                <InboxView
                  gymName={gym?.workspace_name ?? gymName}
                  quickReplies={quickReplies}
                  onOpened={refreshInboxBadge}
                  initialConversationId={inboxInitialConversationId}
                />
              )}

              {activeView === "contacts" && (
                <ContactsView
                  onOpenConversation={(id) => {
                    setInboxInitialConversationId(id);
                    setActiveView("inbox");
                  }}
                />
              )}

              {activeView === "feedback" && <FeedbackView />}

              {activeView === "ai-configurator" && (
                <div className="grid h-full gap-4 xl:grid-cols-2">
                  {/* LEFT COLUMN */}
                  <div className="space-y-4">
                    {/* AI Identity */}
                    <div className="dashboard-panel p-5 md:p-6">
                      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">AI Identity</p>
                      <h2 className="mt-2 text-lg font-semibold text-foreground">Your AI assistant</h2>
                      <p className="mt-1 text-sm text-muted-foreground">Give your AI a name and a personality. This is how it introduces itself to leads.</p>
                      <div className="mt-5 space-y-4">
                        <div>
                          <p className="fit-label mb-2">AI Name</p>
                          <input
                            value={aiName}
                            onChange={e => setAiName(e.target.value)}
                            placeholder="e.g. Sam, Jamie, Alex"
                            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/50 placeholder:text-muted-foreground/40"
                          />
                        </div>
                        <div>
                          <p className="fit-label mb-2">AI Personality</p>
                          <div className="flex flex-wrap gap-2">
                            {(["Professional", "Friendly", "Energetic", "Chill", "Luxury"] as const).map(p => (
                              <button
                                key={p}
                                type="button"
                                onClick={() => setAiPersonality(p.toLowerCase())}
                                className={cn("rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors", aiPersonality === p.toLowerCase() ? "border-primary bg-primary/20 text-primary" : "border-white/10 bg-white/[0.03] text-muted-foreground hover:border-white/20 hover:text-foreground")}
                              >
                                {p}
                              </button>
                            ))}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => { upsertBusinessConfig({ ai_name: aiName, persona: { personality: aiPersonality } }); toast.success("AI identity saved."); }}
                          className="rounded-2xl bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
                        >
                          Save
                        </button>
                      </div>
                    </div>

                    {/* Quick Setup */}
                    <div className="dashboard-panel p-5 md:p-6">
                      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Quick Setup</p>
                      <h2 className="mt-2 text-lg font-semibold text-foreground">Set up your AI in 2 minutes</h2>
                      <p className="mt-1 text-sm text-muted-foreground">Chat with our AI and it'll configure everything for you automatically.</p>
                      <button
                        type="button"
                        onClick={() => setShowOnboarding(true)}
                        className="mt-5 w-full rounded-2xl bg-gradient-to-r from-primary to-violet-500 px-5 py-3 text-sm font-semibold text-white shadow-lg hover:opacity-90 transition-opacity"
                      >
                        ✨ Generate my AI config
                      </button>
                    </div>

                    {/* Knowledge Base */}
                    <div className="dashboard-panel p-5 md:p-6">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Knowledge Base</p>
                          <h2 className="mt-2 text-lg font-semibold text-foreground">What your AI knows about your business</h2>
                        </div>
                        <button type="button" className="mt-0.5 flex shrink-0 items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                          <Plus className="h-3.5 w-3.5" />Add knowledge
                        </button>
                      </div>
                      <div className="mt-5 space-y-3">
                        {([
                          { label: "PRICING", value: knowledgePricing, set: setKnowledgePricing, placeholder: "Describe your pricing..." },
                          { label: "OPENING HOURS", value: knowledgeHours, set: setKnowledgeHours, placeholder: "Describe your opening hours..." },
                          { label: "LOCATION", value: knowledgeLocation, set: setKnowledgeLocation, placeholder: "Describe your location..." },
                        ]).map(kw => (
                          <div key={kw.label} className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
                            <div className="mb-2 flex items-center justify-between">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{kw.label}</p>
                              <button
                                type="button"
                                onClick={() => { kw.set(""); upsertBusinessConfig({ knowledge: { pricing: kw.label === "PRICING" ? "" : knowledgePricing, opening_hours: kw.label === "OPENING HOURS" ? "" : knowledgeHours, location: kw.label === "LOCATION" ? "" : knowledgeLocation } }); }}
                                className="text-muted-foreground/50 hover:text-red-400 transition-colors"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <textarea
                              value={kw.value}
                              onChange={e => kw.set(e.target.value)}
                              onBlur={() => upsertBusinessConfig({ knowledge: { pricing: knowledgePricing, opening_hours: knowledgeHours, location: knowledgeLocation } })}
                              placeholder={kw.placeholder}
                              rows={3}
                              className="w-full resize-none rounded-xl border border-white/10 bg-[hsl(233_30%_8%)] px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50 placeholder:text-muted-foreground/40"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Goals */}
                    <div className="dashboard-panel p-5 md:p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Goals</p>
                          <h2 className="mt-2 text-lg font-semibold text-foreground">Performance targets</h2>
                        </div>
                        <button type="button" onClick={() => setShowGoalForm(v => !v)} className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                          <Plus className="h-3.5 w-3.5" />Add goal
                        </button>
                      </div>
                      {showGoalForm && (
                        <div className="mt-4 space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                          <input value={newGoalTitle} onChange={e => setNewGoalTitle(e.target.value)} placeholder="Goal name (e.g. Monthly bookings)" className="w-full rounded-xl border border-white/10 bg-[hsl(233_30%_8%)] px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50 placeholder:text-muted-foreground/40" />
                          <div className="flex gap-2">
                            <input type="number" min={1} value={newGoalTarget} onChange={e => setNewGoalTarget(Number(e.target.value))} className="w-24 rounded-xl border border-white/10 bg-[hsl(233_30%_8%)] px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50" />
                            <select value={newGoalMetric} onChange={e => setNewGoalMetric(e.target.value)} className="flex-1 rounded-xl border border-white/10 bg-[hsl(233_30%_8%)] px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50">
                              {["Bookings", "Leads", "Conversions", "Revenue", "Custom"].map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                          </div>
                          <button type="button" onClick={() => { if (!newGoalTitle.trim()) return; const g = { id: `goal-${Date.now()}`, title: newGoalTitle.trim(), target: newGoalTarget, metric: newGoalMetric, current: 0 }; const upd = [...goals, g]; setGoals(upd); upsertBusinessConfig({ goals: upd }); setNewGoalTitle(""); setNewGoalTarget(10); setShowGoalForm(false); }} className="w-full rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors">Add goal</button>
                        </div>
                      )}
                      <div className="mt-4 space-y-3">
                        {goals.length === 0 && !showGoalForm && (
                          <p className="text-sm text-muted-foreground">No goals yet. Click + Add goal to create your first performance target.</p>
                        )}
                        {goals.map(g => {
                          const pct = Math.min(100, Math.round(((g.current ?? 0) / Math.max(1, g.target)) * 100));
                          return (
                            <div key={g.id} className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-medium text-foreground">{g.title}</p>
                                  <p className="mt-0.5 text-xs text-muted-foreground">{g.metric} · {g.current ?? 0} / {g.target}</p>
                                </div>
                                <div className="flex shrink-0 items-center gap-1">
                                  <button type="button" className="p-1 text-muted-foreground/60 hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                                  <button type="button" onClick={() => { const upd = goals.filter(x => x.id !== g.id); setGoals(upd); upsertBusinessConfig({ goals: upd }); }} className="p-1 text-muted-foreground/60 hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
                                </div>
                              </div>
                              <div className="mt-3 h-1.5 rounded-full bg-white/[0.06]">
                                <div className="h-1.5 rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Demo Mode */}
                    <div className="dashboard-panel p-5 md:p-6">
                      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Demo Mode</p>
                      <h2 className="mt-2 text-lg font-semibold text-foreground">Let prospects test your AI</h2>
                      <p className="mt-1 text-sm text-muted-foreground">When someone DMs the activation keyword, the AI activates for 10 minutes so they can try it out.</p>
                      <div className="mt-5 space-y-4">
                        <div className="flex items-start justify-between gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3.5">
                          <div>
                            <p className="text-sm font-medium text-foreground">Enable demo mode</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">Allow anyone to activate your AI by sending the keyword</p>
                          </div>
                          <button type="button" onClick={() => { const next = !demoEnabled; setDemoEnabled(next); upsertBusinessConfig({ demo_mode: next }); }} className={cn("relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors", demoEnabled ? "bg-primary" : "bg-white/[0.15]")}>
                            <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", demoEnabled ? "left-5" : "left-0.5")} />
                          </button>
                        </div>
                        <div>
                          <p className="fit-label mb-2">Activation keyword</p>
                          <input
                            value={demoKeyword}
                            onChange={e => setDemoKeyword(e.target.value)}
                            onBlur={() => upsertBusinessConfig({ demo_trigger_word: demoKeyword })}
                            className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/50"
                          />
                          <p className="mt-1.5 text-xs text-muted-foreground">The word someone must type to start the AI demo. Default is 'ai' but you can change it to anything.</p>
                        </div>
                        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-sm text-muted-foreground">
                          When someone DMs <span className="font-mono text-primary">"{demoKeyword || "ai"}"</span> → AI activates for 10 minutes
                        </div>
                      </div>
                    </div>

                    {/* Follow-Up */}
                    <div className="dashboard-panel p-5 md:p-6">
                      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Follow-Up</p>
                      <h2 className="mt-2 text-lg font-semibold text-foreground">Automatic re-engagement for silent leads</h2>
                      <div className="mt-5 space-y-2.5">
                        <div className="flex items-start justify-between gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3.5">
                          <div>
                            <p className="text-sm font-medium text-foreground">Enable follow-ups</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">AI automatically re-engages leads who go silent</p>
                          </div>
                          <button type="button" onClick={() => { const next = !followUpEnabled; setFollowUpEnabled(next); saveFollowUp(next, followUpDelayHours, followUpMax, followUpTone); }} className={cn("relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors", followUpEnabled ? "bg-primary" : "bg-white/[0.15]")}>
                            <span className={cn("inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform", followUpEnabled ? "translate-x-6" : "translate-x-1")} />
                          </button>
                        </div>
                        {followUpEnabled && (
                          <>
                            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3.5">
                              <div className="flex items-center justify-between gap-4">
                                <p className="text-sm font-medium text-foreground">Follow up after</p>
                                <div className="flex items-center gap-2">
                                  <input type="number" min={1} value={followUpDelayHours} onChange={e => setFollowUpDelayHours(Number(e.target.value))} onBlur={() => saveFollowUp(followUpEnabled, followUpDelayHours, followUpMax, followUpTone)} className="w-20 rounded-xl border border-white/10 bg-[hsl(233_30%_8%)] px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary/50 text-center" />
                                  <span className="text-xs text-muted-foreground">hours</span>
                                </div>
                              </div>
                            </div>
                            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3.5">
                              <div className="flex items-center justify-between gap-4">
                                <p className="text-sm font-medium text-foreground">Max follow-ups per lead</p>
                                <input type="number" min={1} max={3} value={followUpMax} onChange={e => setFollowUpMax(Math.min(3, Math.max(1, Number(e.target.value))))} onBlur={() => saveFollowUp(followUpEnabled, followUpDelayHours, followUpMax, followUpTone)} className="w-20 rounded-xl border border-white/10 bg-[hsl(233_30%_8%)] px-3 py-1.5 text-sm text-foreground outline-none focus:border-primary/50 text-center" />
                              </div>
                            </div>
                            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3.5">
                              <p className="text-sm font-medium text-foreground">Tone</p>
                              <div className="mt-3 flex flex-wrap gap-2">
                                {([{ value: "casual", label: "Casual check-in" }, { value: "value-add", label: "Share something useful" }, { value: "last-attempt", label: "Create urgency" }] as const).map(option => (
                                  <button key={option.value} type="button" onClick={() => { setFollowUpTone(option.value); saveFollowUp(followUpEnabled, followUpDelayHours, followUpMax, option.value); }} className={cn("rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors", followUpTone === option.value ? "border-primary bg-primary/20 text-primary" : "border-white/10 bg-white/[0.03] text-muted-foreground hover:border-white/20 hover:text-foreground")}>{option.label}</button>
                                ))}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* RIGHT COLUMN */}
                  <div className="space-y-4">
                    {/* Qualification Flow */}
                    <div className="dashboard-panel p-5 md:p-6">
                      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Qualification Flow</p>
                      <h2 className="mt-2 text-lg font-semibold text-foreground">Screening questions</h2>
                      <p className="mt-1 text-sm text-muted-foreground">Questions the AI asks before a lead can book.</p>
                      <div className="mt-5 space-y-2.5">
                        {qualQuestions.length === 0 && (
                          <p className="text-sm text-muted-foreground">No screening questions yet.</p>
                        )}
                        {qualQuestions.map((q, qi) => (
                          <div key={q.id} className="flex items-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3">
                            <p className="flex-1 text-sm text-foreground/90">{q.text}</p>
                            <button type="button" className="p-1 text-muted-foreground/60 hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                            <button type="button" onClick={() => { const upd = qualQuestions.filter((_, j) => j !== qi); setQualQuestions(upd); upsertBusinessConfig({ qualification_questions: upd }); }} className="p-1 text-muted-foreground/60 hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 flex gap-2">
                        <input
                          value={newQuestionInput}
                          onChange={e => setNewQuestionInput(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); const t = newQuestionInput.trim(); if (!t) return; const upd = [...qualQuestions, { id: `q-${Date.now()}`, text: t, expanded: false }]; setQualQuestions(upd); setNewQuestionInput(""); upsertBusinessConfig({ qualification_questions: upd }); } }}
                          placeholder="Type a question..."
                          className="flex-1 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/50 placeholder:text-muted-foreground/40"
                        />
                        <button
                          type="button"
                          onClick={() => { const t = newQuestionInput.trim(); if (!t) return; const upd = [...qualQuestions, { id: `q-${Date.now()}`, text: t, expanded: false }]; setQualQuestions(upd); setNewQuestionInput(""); upsertBusinessConfig({ qualification_questions: upd }); }}
                          className="rounded-2xl bg-primary px-3.5 py-2.5 text-white hover:bg-primary/90 transition-colors"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="mt-4">
                        <p className="fit-label mb-2">Strictness</p>
                        <select
                          value={qualificationStrictness}
                          onChange={e => { setQualificationStrictness(e.target.value); upsertBusinessConfig({ qualification_strictness: e.target.value }); }}
                          className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium — balanced</option>
                          <option value="high">High — all questions must be answered</option>
                        </select>
                      </div>
                      <div className="mt-4">
                        <p className="fit-label mb-2">Bad Lead</p>
                        <textarea
                          value={badLeadDefinition}
                          onChange={e => setBadLeadDefinition(e.target.value)}
                          onBlur={() => upsertBusinessConfig({ bad_lead_definition: badLeadDefinition || null })}
                          placeholder="Describe who the AI should politely reject or not push to book..."
                          rows={3}
                          className="w-full resize-none rounded-xl border border-white/10 bg-[hsl(233_30%_8%)] px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50 placeholder:text-muted-foreground/40"
                        />
                      </div>
                    </div>

                    {/* Escalation Rules */}
                    <div className="dashboard-panel p-5 md:p-6">
                      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Escalation Rules</p>
                      <h2 className="mt-2 text-lg font-semibold text-foreground">Choose what triggers a human handoff</h2>
                      <div className="mt-5 space-y-2.5">
                        {([
                          ["cantAnswer", cantAnswer, "AI can't answer a question", "Escalate when AI has no info"],
                          ["angryLead", angryLead, "Lead is angry or frustrated", "Negative tone detected"],
                          ["competitorMentioned", competitorMentioned, "Competitor mentioned", "Lead mentions a competitor"],
                          ["injuryConcern", injuryConcern, "Injury or medical concern", "e.g. bad back, surgery, health issue"],
                          ["readyToBuy", readyToBuy, "Lead says they're ready to buy", "e.g. 'I'm in', 'let's do it'"],
                          ["callbackRequest", callbackRequest, "Lead requests a callback", "e.g. 'can someone call me'"],
                          ["botQuestion", botQuestion, "Lead asks if it's a bot more than once", "Trust breaking down"],
                          ["leadSilent", leadSilentEnabled, "Lead goes silent", "No response from lead for a set period"],
                          ["conversationTooLong", conversationTooLong, "Conversation too long with no booking", "Too many back-and-forth messages without conversion"],
                          ["bulkVip", bulkVipInquiry, "Bulk or VIP inquiry", "e.g. whole team, 10+ people, corporate booking"],
                          ["specificKeywords", specificKeywordsEnabled, "Specific keywords", "Trigger handoff when these words appear in a message"],
                        ] as [string, boolean, string, string][]).map(([key, val, title, sub]) => (
                          <div key={key} className="flex items-start justify-between gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3.5">
                            <div>
                              <p className="text-sm font-medium text-foreground">{title}</p>
                              <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
                            </div>
                            <button
                              type="button"
                              role="switch"
                              aria-checked={val}
                              onClick={() => {
                                const next = !val;
                                if (key === "cantAnswer") setCantAnswer(next);
                                else if (key === "angryLead") setAngryLead(next);
                                else if (key === "competitorMentioned") setCompetitorMentioned(next);
                                else if (key === "injuryConcern") setInjuryConcern(next);
                                else if (key === "readyToBuy") setReadyToBuy(next);
                                else if (key === "callbackRequest") setCallbackRequest(next);
                                else if (key === "botQuestion") setBotQuestion(next);
                                else if (key === "leadSilent") setLeadSilentEnabled(next);
                                else if (key === "conversationTooLong") setConversationTooLong(next);
                                else if (key === "bulkVip") setBulkVipInquiry(next);
                                else if (key === "specificKeywords") setSpecificKeywordsEnabled(next);
                                upsertBusinessConfig({ escalation_rules: {
                                  cant_answer: key === "cantAnswer" ? next : cantAnswer,
                                  angry: key === "angryLead" ? next : angryLead,
                                  competitor: key === "competitorMentioned" ? next : competitorMentioned,
                                  injury: key === "injuryConcern" ? next : injuryConcern,
                                  ready_to_buy: key === "readyToBuy" ? next : readyToBuy,
                                  callback_request: key === "callbackRequest" ? next : callbackRequest,
                                  repeated_questions: repeatedQuestions,
                                  bot_question: key === "botQuestion" ? next : botQuestion,
                                  silence_enabled: key === "leadSilent" ? next : leadSilentEnabled,
                                  conversation_too_long: key === "conversationTooLong" ? next : conversationTooLong,
                                  vip_inquiry: key === "bulkVip" ? next : bulkVipInquiry,
                                } });
                              }}
                              className={cn("relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors", val ? "bg-primary" : "bg-white/10")}
                            >
                              <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", val ? "left-5" : "left-0.5")} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeView === "settings" && (
                <div className="grid h-full gap-4 xl:grid-cols-[1.1fr_0.9fr]">
                  <div className="space-y-4">
                    <div className="dashboard-panel p-5 md:p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Theme</p>
                          <h2 className="mt-2 text-lg font-semibold text-foreground">Interface appearance</h2>
                        </div>
                      </div>

                      <div className="mt-5 grid gap-4 sm:grid-cols-2">
                        {themes.map(t => {
                          const active = theme === t.name;
                          return (
                            <button
                              type="button"
                              key={t.name}
                              onClick={() => setTheme(t.name)}
                              className={cn(
                                "text-left rounded-[26px] border p-4 transition-all",
                                active
                                  ? "border-primary shadow-[0_0_0_1px_hsl(var(--primary)/0.35)] bg-primary/[0.06]"
                                  : "border-white/[0.08] bg-white/[0.025] hover:border-white/[0.18]"
                              )}
                            >
                              <div className="h-12 rounded-2xl border border-white/[0.06]" style={{ background: t.swatch }} />
                              <div className="mt-3 flex items-center justify-between text-sm text-foreground/90">
                                <span>{t.name}</span>
                                <span className={cn("h-5 w-5 rounded-full border", active ? "border-primary bg-primary" : "border-white/20 bg-transparent")} />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="dashboard-panel p-5 md:p-6">
                      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Workspace</p>
                      <h2 className="mt-2 text-lg font-semibold text-foreground">
                        {gym?.workspace_name ?? <span className="italic text-muted-foreground/70">e.g. Iron Forge Strength Co.</span>}
                      </h2>
                      <div className="mt-5 grid gap-4 sm:grid-cols-2">
                        <div>
                          <p className="fit-label">Manager</p>
                          <p className="fit-value">{gym?.manager_name ?? <span className="italic text-muted-foreground/70">e.g. Alex Johnson</span>}</p>
                        </div>
                        <div>
                          <p className="fit-label">Escalation contact</p>
                          <p className="fit-value">{gym?.escalation_contact ?? <span className="italic text-muted-foreground/70">e.g. +1 555 123 4567</span>}</p>
                        </div>
                        <div>
                          <p className="fit-label">Model</p>
                          <p className="fit-value">{gym?.model ?? <span className="italic text-muted-foreground/70">e.g. GPT-4o, Claude Sonnet</span>}</p>
                        </div>
                      </div>
                    </div>

                  </div>

                  <div className="space-y-4">
                    <div className="dashboard-panel p-5 md:p-6">
                      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Invite code — Manager</p>
                      <h2 className="mt-2 text-lg font-semibold text-foreground">Manager access</h2>
                      <p className="mt-1 text-sm text-muted-foreground">Full access to all views. Share with managers and admins.</p>
                      <div className="mt-5 flex items-center gap-2">
                        <Input
                          readOnly
                          value={inviteCode}
                          placeholder="FLR-••••••••"
                          className="rounded-2xl border-white/10 bg-white/[0.04] font-mono tracking-[0.3em] text-foreground"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={copyInviteCode}
                          disabled={!inviteCode}
                          className="rounded-2xl border-white/10 bg-white/[0.04] text-foreground/90 hover:bg-white/[0.08] hover:text-foreground"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="mt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={regenerateInviteCode}
                          disabled={inviteLoading || !user}
                          className="rounded-2xl border-white/10 bg-white/[0.04] text-foreground/90 hover:bg-white/[0.08] hover:text-foreground"
                        >
                          <RefreshCw className={cn("h-4 w-4", inviteLoading && "animate-spin")} />
                          Regenerate manager code
                        </Button>
                      </div>
                    </div>

                    <div className="dashboard-panel p-5 md:p-6">
                      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Invite code — Staff</p>
                      <h2 className="mt-2 text-lg font-semibold text-foreground">Staff access</h2>
                      <p className="mt-1 text-sm text-muted-foreground">Limited access — Inbox and Escalations only. Share with front-line staff.</p>
                      <div className="mt-5 flex items-center gap-2">
                        <Input
                          readOnly
                          value={staffInviteCode}
                          placeholder="STF-••••••••"
                          className="rounded-2xl border-white/10 bg-white/[0.04] font-mono tracking-[0.3em] text-foreground"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={copyStaffInviteCode}
                          disabled={!staffInviteCode}
                          className="rounded-2xl border-white/10 bg-white/[0.04] text-foreground/90 hover:bg-white/[0.08] hover:text-foreground"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="mt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={regenerateStaffInviteCode}
                          disabled={staffInviteLoading || !user}
                          className="rounded-2xl border-white/10 bg-white/[0.04] text-foreground/90 hover:bg-white/[0.08] hover:text-foreground"
                        >
                          <RefreshCw className={cn("h-4 w-4", staffInviteLoading && "animate-spin")} />
                          Regenerate staff code
                        </Button>
                      </div>
                    </div>

                    <div className="dashboard-panel p-5 md:p-6">
                      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Account</p>
                      <h2 className="mt-2 text-lg font-semibold text-foreground">{user?.email ?? "Signed in"}</h2>
                      <div className="mt-5 flex flex-wrap gap-3">
                        <Button
                          variant="outline"
                          className="rounded-2xl border-white/10 bg-white/[0.04] text-foreground/90 hover:bg-white/[0.08] hover:text-foreground"
                          onClick={() => signOut()}
                        >
                          Sign out
                        </Button>
                      </div>
                    </div>

                    <div className="dashboard-panel p-5 md:p-6">
                      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Contact</p>
                      <h2 className="mt-2 text-lg font-semibold text-foreground">Operations contact</h2>
                      <p className="mt-1 text-sm text-muted-foreground">This number or email is used for escalation alerts and bookings workflow notifications.</p>
                      <div className="mt-5 space-y-3">
                        <div>
                          <p className="fit-label mb-2">Phone number</p>
                          <input
                            type="tel"
                            value={contactPhone}
                            onChange={e => setContactPhone(e.target.value)}
                            placeholder="e.g. +971 50 123 4567"
                            className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/50 placeholder:text-muted-foreground/40"
                          />
                        </div>
                        <div>
                          <p className="fit-label mb-2">Email</p>
                          <input
                            type="email"
                            value={contactEmail}
                            onChange={e => setContactEmail(e.target.value)}
                            placeholder="e.g. ops@yourbusiness.com"
                            className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/50 placeholder:text-muted-foreground/40"
                          />
                        </div>
                      </div>
                      <div className="mt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => { upsertBusinessConfig({ contact_phone: contactPhone || null, contact_email: contactEmail || null }); toast.success("Contact saved"); }}
                          className="rounded-2xl border-white/10 bg-white/[0.04] text-foreground/90 hover:bg-white/[0.08] hover:text-foreground"
                        >
                          Save contact
                        </Button>
                      </div>
                    </div>

                    <div className="dashboard-panel p-5 md:p-6">
                      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Escalation notifications</p>
                      <h2 className="mt-2 text-lg font-semibold text-foreground">Notification channel</h2>
                      <div className="mt-5 grid gap-4 sm:grid-cols-2">
                        {([
                          { key: "email",     label: "Email",        Icon: Mail          },
                          { key: "sms",       label: "Phone (SMS)",  Icon: Phone         },
                          { key: "whatsapp",  label: "WhatsApp",     Icon: MessageCircle },
                          { key: "instagram", label: "Instagram DM", Icon: Instagram     },
                        ] as const).map(({ key, label, Icon }) => {
                          const active = escalationChannel === key;
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => {
                                setEscalationChannel(key);
                                upsertBusinessConfig({ escalation_channel: key });
                              }}
                              className={cn(
                                "text-left rounded-[26px] border p-4 transition-all",
                                active
                                  ? "border-primary shadow-[0_0_0_1px_hsl(var(--primary)/0.35)] bg-primary/[0.06]"
                                  : "border-white/[0.08] bg-white/[0.025] hover:border-white/[0.18]"
                              )}
                            >
                              <div className="flex h-12 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03]">
                                <Icon className={cn("h-5 w-5", active ? "text-primary" : "text-muted-foreground")} />
                              </div>
                              <div className="mt-3 flex items-center justify-between text-sm text-foreground/90">
                                <span>{label}</span>
                                <span className={cn("h-5 w-5 rounded-full border", active ? "border-primary bg-primary" : "border-white/20 bg-transparent")} />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                  </div>
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
    <OnboardingChat
      isOpen={showOnboarding}
      onClose={() => setShowOnboarding(false)}
      onApplyConfig={handleApplyOnboardingConfig}
      businessId={businessId}
    />
    </>
  );
};

export default Index;

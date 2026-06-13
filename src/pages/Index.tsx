import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  BarChart3,
  BellDot,
  CalendarDays,
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
  Upload,
  Users,
  X,
} from "lucide-react";
import { InboxView, useInboxBadge } from "@/components/inbox/InboxView";
import { InboxPauseAllButton } from "@/components/inbox/InboxPauseAllButton";
import { InboxBroadcastButton } from "@/components/inbox/InboxBroadcastButton";
import { ChatThread } from "@/components/chat/ChatThread";
import { EscalationsView } from "@/components/escalations/EscalationsView";
import { AnalyticsView } from "@/components/analytics/AnalyticsView";
import { ContactsView } from "@/components/contacts/ContactsView";
import { useFeedback } from "@/contexts/FeedbackContext";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react";
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
  useConversations,
  useDashboardMetrics,
  useGymConfigs,
  type BookingRow,
  type ChatMessage,
  type ConversationRow,
} from "@/hooks/useDashboardData";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { APP_NAME, displayName, displayDash, resolvePreferredDay } from "@/lib/displayHelpers";
import { OnboardingChat, type ConfigData } from "@/components/OnboardingChat";
import { FollowUpStepsBuilder, type FollowUpStep } from "@/components/configurator/FollowUpStepsBuilder";
import { AiSuggestionBar } from "@/components/AiSuggestionBar";
import { useAiSuggestion } from "@/hooks/useAiSuggestion";
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

const CONFIGURATOR_CARD_STYLE = {
  background: "#0d0a1e",
  border: "1px solid rgba(168, 85, 247, 0.55)",
  boxShadow: "0 0 0 1px rgba(168, 85, 247, 0.1), inset 0 1px 0 rgba(255,255,255,0.04)",
};

const RESPONSE_LENGTH_OPTIONS: Array<{
  value: "concise" | "balanced" | "detailed";
  label: string;
  subtitle: string;
}> = [
  { value: "concise", label: "Concise", subtitle: "Short & punchy. 1-2 bubbles max. Best for fast back-and-forth." },
  { value: "balanced", label: "Balanced", subtitle: "Conversational. Enough detail without overwhelming." },
  { value: "detailed", label: "Detailed", subtitle: "Thorough replies. Handles objections and explains fully in one go." },
];

const VIEW_SUBTITLES: Record<ViewKey, string> = {
  overview: "Snapshot of leads, bookings and conversions.",
  bookings: "All bookings created by your AI or added manually.",
  calendar: "Scheduled bookings and follow-ups.",
  analytics: "Lead momentum and source breakdown.",
  inbox: "Replies, escalations and AI suggestions.",
  contacts: "Every lead in your workspace at a glance.",
  feedback: "Conversations that need your attention.",
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

function conversationLeadTemp(c: ConversationRow): string {
  const cs = c.conversation_state as unknown;
  if (cs && typeof cs === "object" && !Array.isArray(cs)) {
    const t = (cs as Record<string, unknown>).lead_temp;
    if (typeof t === "string") return t.toLowerCase();
  }
  return "";
}

function lastUserMessageTimestamp(c: ConversationRow): string | null {
  const msgs = c.messages;
  if (!Array.isArray(msgs)) return null;
  for (let i = msgs.length - 1; i >= 0; i--) {
    const m = msgs[i] as Record<string, unknown> | null;
    if (m && typeof m === "object" && m.role === "user") {
      return typeof m.timestamp === "string" ? m.timestamp : null;
    }
  }
  return null;
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

/* ---------- Calendar event types ---------- */
type CalendarEvent = {
  id: string;
  type: "booking" | "followup";
  title: string;
  date: string;
  time: string;
  status: string | null;
  contactId: string | null;
};

/* ---------- Calendar grid for current month ---------- */
function buildMonthGrid(date: Date, events: CalendarEvent[]) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const first = new Date(year, month, 1);
  const startOffset = first.getDay(); // Sun=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();

  const eventsByDay = new Map<number, CalendarEvent[]>();
  events.forEach(ev => {
    if (!ev.date) return;
    const [y, m, d] = ev.date.split("-").map(Number);
    if (!y || !m || !d) return;
    if (y === year && m - 1 === month) {
      const arr = eventsByDay.get(d) ?? [];
      arr.push(ev);
      eventsByDay.set(d, arr);
    }
  });

  const cells: { day: number; muted?: boolean; events?: CalendarEvent[]; emphasis?: boolean }[] = [];
  for (let i = startOffset; i > 0; i--) cells.push({ day: prevDays - i + 1, muted: true });
  for (let d = 1; d <= daysInMonth; d++) {
    const dayEvents = eventsByDay.get(d);
    cells.push({
      day: d,
      events: dayEvents,
      emphasis: !!dayEvents && d === new Date().getDate() && month === new Date().getMonth(),
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

const buildSystemPrompt = (config: {
  ai_name?: string;
  ai_personality?: string;
  workspace_name?: string;
  knowledge?: Record<string, string>;
  qualification_questions?: { question: string }[];
  qualification_strictness?: string;
  bad_lead_definition?: string;
  escalation_rules?: Record<string, boolean>;
  goals?: { goal: string }[];
}) => {
  const knowledgeLines = Object.entries(config.knowledge || {})
    .filter(([_, value]) => value?.trim())
    .map(([key, value]) => `${key.toUpperCase()}: ${value}`)
    .join("\n");

  const questionLines = (config.qualification_questions || [])
    .map((q, i) => `${i + 1}. ${q.question}`)
    .join("\n");

  const escalationMap: Record<string, string> = {
    cant_answer: "Escalate when AI cannot answer a question",
    angry: "Escalate when lead is angry or frustrated",
    competitor: "Escalate when a competitor is mentioned",
    injury: "Escalate when lead mentions injury or medical concern",
    ready_to_buy: "Escalate when lead says they are ready to buy",
    callback_request: "Escalate when lead requests a callback",
    repeated_questions: "Escalate when lead asks if it's a bot more than once",
    silence_enabled: "Escalate when lead goes silent",
    too_long_no_booking: "Escalate when conversation is too long with no booking",
    vip_inquiry: "Escalate for bulk or VIP inquiries",
    specific_keywords: "Escalate when specific trigger keywords are detected",
  };

  const activeEscalations = Object.entries(config.escalation_rules || {})
    .filter(([_, enabled]) => enabled)
    .map(([key]) => `- ${escalationMap[key] ?? key}`)
    .join("\n");

  const goalLines = (config.goals || [])
    .map((g, i) => `${i + 1}. ${g.goal}`)
    .join("\n");

  return `You are ${config.ai_name || "an AI assistant"}, representing ${config.workspace_name || "this business"}.

PERSONALITY:
${config.ai_personality || "Professional and helpful."}

KNOWLEDGE BASE:
${knowledgeLines || "No knowledge added yet."}

QUALIFICATION:
Ask these screening questions one at a time before booking:
${questionLines || "No screening questions set."}
Strictness: ${config.qualification_strictness || "medium"}.

BAD LEAD:
${config.bad_lead_definition || "Not defined yet."}

ESCALATION — hand off to a human when:
${activeEscalations || "No escalation rules enabled."}

GOALS:
${goalLines || "No goals set."}

Always be concise and guide the lead toward booking.`.trim();
};

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
  const [addBookingModalOpen, setAddBookingModalOpen] = useState(false);
  const [addBookingForm, setAddBookingForm] = useState({ name: "", phone: "", date: "", time: "", notes: "" });
  const [savingAddBooking, setSavingAddBooking] = useState(false);
  const [chatFilter, setChatFilter] = useState("All");
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [inboxInitialConversationId, setInboxInitialConversationId] = useState<string | null>(null);
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState<"month" | "week">("month");
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [bookingModalDate, setBookingModalDate] = useState("");
  const [bookingForm, setBookingForm] = useState({ name: "", phone: "", time: "", notes: "" });
  const [savingBooking, setSavingBooking] = useState(false);
  const [welcomeGymName, setWelcomeGymName] = useState<string>("");
  const [welcomeUserName, setWelcomeUserName] = useState<string>("there");
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
  const [followUpSteps, setFollowUpSteps] = useState<FollowUpStep[]>([
    { step: 1, delay_hours: 2, message_instruction: "Soft check-in, remind them what they asked about", tone: "friendly" },
    { step: 2, delay_hours: 24, message_instruction: "Create urgency, mention limited availability", tone: "direct" },
  ]);
  const followUpStepsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Extended AI Configurator state
  const [aiName, setAiName] = useState("");
  const [aiPersonality, setAiPersonality] = useState("professional");
  const [businessType, setBusinessType] = useState("");
  const [niche, setNiche] = useState("");
  const [knowledgePricing, setKnowledgePricing] = useState("");
  const [knowledgeHours, setKnowledgeHours] = useState("");
  const [knowledgeLocation, setKnowledgeLocation] = useState("");
  const [extraKnowledge, setExtraKnowledge] = useState<Record<string, string>>({});
  const [goals, setGoals] = useState<Array<{ id: string; title: string; target: number; metric: string; current?: number }>>([]);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [newGoalTarget, setNewGoalTarget] = useState(10);
  const [newGoalMetric, setNewGoalMetric] = useState("Bookings");
  const [demoEnabled, setDemoEnabled] = useState(false);
  const [demoKeyword, setDemoKeyword] = useState("fluario");
  const [demoSaved, setDemoSaved] = useState(false);
  const demoKeywordDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const demoSavedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [responseLengthStyle, setResponseLengthStyle] = useState<"concise" | "balanced" | "detailed">("balanced");
  const [responseStyleSaved, setResponseStyleSaved] = useState(false);
  const responseStyleSavedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  const [userRole, setUserRole] = useState<"admin" | "manager" | "staff" | "user" | null>(null);

  // Photos state
  const [photos, setPhotos] = useState<Array<{ id: string; url: string; description: string | null; tag_key: string | null; tags: string[] | null }>>([]);
  const [pendingFiles, setPendingFiles] = useState<Array<{ id: string; file: File; previewUrl: string; tag: string; description: string; tagError?: boolean }>>([]);
  const [savingPhotos, setSavingPhotos] = useState(false);
  const [photoDropActive, setPhotoDropActive] = useState(false);

  const bookingsState = useBookings();
  const conversationsState = useConversations();
  const gymsState = useGymConfigs();
  const { metrics } = useDashboardMetrics();

  const bookings = bookingsState.data ?? [];
  const conversations = conversationsState.data ?? [];
  const gym = gymsState.data?.[0];

  const overviewMetrics = useMemo(() => {
    const totalLeads = conversations.length;
    const hotLeads = conversations.filter(
      c => conversationLeadTemp(c) === "hot" || (c.score ?? "").toLowerCase() === "hot",
    ).length;
    const totalBookings = bookings.length;
    const conversionRate = totalLeads > 0 ? ((totalBookings / totalLeads) * 100).toFixed(1) : "0";
    const escalatedNow = conversations.filter(c => c.ai_paused === true).length;
    const activeToday = conversations.filter(c => {
      const ts = lastUserMessageTimestamp(c);
      if (!ts) return false;
      return Date.now() - new Date(ts).getTime() < 86400000;
    }).length;

    const last30 = Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      return d.toISOString().split("T")[0];
    });
    const chartData = last30.map(date => ({
      date: date.slice(5),
      leads: conversations.filter(c => c.created_at?.startsWith(date)).length,
    }));

    const platforms = conversations.reduce((acc, c) => {
      const p = c.platform || "Unknown";
      acc[p] = (acc[p] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return { totalLeads, hotLeads, totalBookings, conversionRate, escalatedNow, activeToday, chartData, platforms };
  }, [conversations, bookings]);

  const nextActions = useMemo(() => {
    const { escalatedNow, hotLeads, totalBookings } = overviewMetrics;
    const actions: Array<{ label: string; view: ViewKey | null; urgent: boolean }> = [];
    if (escalatedNow > 0) {
      actions.push({ label: `${escalatedNow} escalation${escalatedNow > 1 ? "s" : ""} need your reply`, view: "feedback", urgent: true });
    }
    if (hotLeads > 0) {
      actions.push({ label: `${hotLeads} hot lead${hotLeads > 1 ? "s" : ""} ready to book`, view: "contacts", urgent: false });
    }
    if (totalBookings === 0) {
      actions.push({ label: "No bookings yet — set up your AI config", view: "ai-configurator", urgent: false });
    }
    if (actions.length === 0) {
      actions.push({ label: "All clear — AI is running smoothly", view: null, urgent: false });
    }
    return actions;
  }, [overviewMetrics]);
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

  const openAddManualBookingModal = () => {
    setAddBookingForm({ name: "", phone: "", date: "", time: "", notes: "" });
    setAddBookingModalOpen(true);
  };

  const saveManualBooking = async () => {
    if (!addBookingForm.name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!addBookingForm.date) {
      toast.error("Date is required");
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) {
      toast.error("No active session.");
      return;
    }

    setSavingAddBooking(true);

    const { data: profile, error: profileError } = await (supabase as any)
      .from("profiles")
      .select("business_id")
      .eq("id", session.user.id)
      .single();

    if (profileError || !profile?.business_id) {
      toast.error(`Could not create booking: ${profileError?.message ?? "no business found"}`);
      setSavingAddBooking(false);
      return;
    }

    const { data: contactRow, error: contactError } = await (supabase as any)
      .from("contacts")
      .insert({
        business_id: profile.business_id,
        name: addBookingForm.name,
        phone: addBookingForm.phone || null,
        platform: "manual",
        status: "active",
      })
      .select("id")
      .single();

    if (contactError || !contactRow) {
      toast.error(`Could not create booking: ${contactError?.message ?? "unknown error"}`);
      setSavingAddBooking(false);
      return;
    }

    const { error: bookingError } = await (supabase as any)
      .from("bookings")
      .insert({
        business_id: profile.business_id,
        contact_id: contactRow.id,
        name: addBookingForm.name,
        phone: addBookingForm.phone || null,
        booking_date: addBookingForm.date,
        booking_time: addBookingForm.time || null,
        notes: addBookingForm.notes || null,
        status: "confirmed",
        source: "manual",
      });

    setSavingAddBooking(false);

    if (bookingError) {
      toast.error(`Could not create booking: ${bookingError.message}`);
      return;
    }

    setAddBookingModalOpen(false);
    bookingsState.refetch();
    toast.success("Booking added");
  };

  useEffect(() => {
    if (!businessId) {
      setCalendarEvents([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const [{ data: bookingsData }, { data: followUpsData }] = await Promise.all([
        (supabase as any)
          .from("bookings")
          .select("id, name, phone, booking_date, booking_time, status, contact_id")
          .eq("business_id", businessId)
          .not("booking_date", "is", null),
        (supabase as any)
          .from("contacts")
          .select("id, name, follow_up_scheduled_at")
          .eq("business_id", businessId)
          .not("follow_up_scheduled_at", "is", null),
      ]);
      if (cancelled) return;

      const events: CalendarEvent[] = [
        ...((bookingsData ?? []) as any[]).map(b => ({
          id: b.id,
          type: "booking" as const,
          title: b.name || "Booking",
          date: b.booking_date,
          time: b.booking_time || "",
          status: b.status,
          contactId: b.contact_id,
        })),
        ...((followUpsData ?? []) as any[]).map(f => ({
          id: f.id,
          type: "followup" as const,
          title: `Follow-up: ${f.name || "Lead"}`,
          date: f.follow_up_scheduled_at?.split("T")[0],
          time: "",
          status: "scheduled",
          contactId: f.id,
        })),
      ];
      setCalendarEvents(events);
    })();
    return () => {
      cancelled = true;
    };
  }, [businessId]);

  const openAddBookingModal = (year: number, month: number, day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    setBookingModalDate(dateStr);
    setBookingForm({ name: "", phone: "", time: "", notes: "" });
    setBookingModalOpen(true);
  };

  const saveBooking = async () => {
    if (!businessId) {
      toast.error("No business selected for this account.");
      return;
    }
    if (!bookingForm.name.trim()) {
      toast.error("Lead name is required");
      return;
    }
    setSavingBooking(true);

    const { data: contactRow, error: contactError } = await (supabase as any)
      .from("contacts")
      .insert({
        business_id: businessId,
        name: bookingForm.name,
        phone: bookingForm.phone || null,
        platform: "manual",
        status: "active",
      })
      .select("id")
      .single();

    if (contactError || !contactRow) {
      toast.error(`Could not create booking: ${contactError?.message ?? "unknown error"}`);
      setSavingBooking(false);
      return;
    }

    const { data: bookingRow, error: bookingError } = await (supabase as any)
      .from("bookings")
      .insert({
        business_id: businessId,
        contact_id: contactRow.id,
        name: bookingForm.name,
        phone: bookingForm.phone || null,
        booking_date: bookingModalDate,
        booking_time: bookingForm.time || null,
        notes: bookingForm.notes || null,
        status: "confirmed",
        source: "manual",
      })
      .select("id, name, phone, booking_date, booking_time, status, contact_id")
      .single();

    setSavingBooking(false);

    if (bookingError || !bookingRow) {
      toast.error(`Could not create booking: ${bookingError?.message ?? "unknown error"}`);
      return;
    }

    setCalendarEvents(prev => [
      ...prev,
      {
        id: bookingRow.id,
        type: "booking",
        title: bookingRow.name || "Booking",
        date: bookingRow.booking_date,
        time: bookingRow.booking_time || "",
        status: bookingRow.status,
        contactId: bookingRow.contact_id,
      },
    ]);

    setBookingModalOpen(false);
    toast.success("Booking added");
  };

  const calendarCells = useMemo(() => buildMonthGrid(calendarDate, calendarEvents), [calendarDate, calendarEvents]);
  const monthHasEvents = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    return calendarEvents.some(ev => {
      if (!ev.date) return false;
      const [y, m] = ev.date.split("-").map(Number);
      return y === year && m - 1 === month;
    });
  }, [calendarDate, calendarEvents]);
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
    : userRole === "staff"
    ? navigation.filter(n => n.key !== "ai-configurator")
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
      setUserRole((data?.role as "admin" | "manager" | "staff" | "user") ?? null);
    })();
  }, [user]);

  useEffect(() => {
    if (!user) { setWelcomeUserName("there"); return; }
    let cancelled = false;
    (async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, business_id")
        .eq("id", user.id)
        .single();
      if (cancelled) return;
      setWelcomeUserName(profile?.full_name || "there");
    })();
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    if (userRole === "staff" && activeView === "ai-configurator") {
      setActiveView("overview");
    }
  }, [userRole, activeView]);

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
        .select("qualification_strictness, bad_lead_definition, lead_silent_hours, specific_keywords, follow_up_enabled, follow_up_delay_hours, follow_up_max, follow_up_tone, follow_up_steps, ai_name, persona, knowledge, goals, demo_mode, demo_trigger_word, response_length_style, qualification_questions, escalation_rules, contact_phone, contact_email, escalation_channel, business_type, niche")
        .eq("business_id", businessId)
        .maybeSingle();
      if (cancelled || !rawCfg) return;
      if (rawCfg.business_type) setBusinessType(rawCfg.business_type);
      if (rawCfg.niche) setNiche(rawCfg.niche);
      if (rawCfg.qualification_strictness) setQualificationStrictness(rawCfg.qualification_strictness);
      if (rawCfg.bad_lead_definition != null) setBadLeadDefinition(rawCfg.bad_lead_definition ?? "");
      if (rawCfg.lead_silent_hours != null) { setLeadSilentEnabled(true); setLeadSilentHours(Number(rawCfg.lead_silent_hours)); }
      if (Array.isArray(rawCfg.specific_keywords)) { setSpecificKeywords(rawCfg.specific_keywords as string[]); if ((rawCfg.specific_keywords as string[]).length > 0) setSpecificKeywordsEnabled(true); }
      if (typeof rawCfg.follow_up_enabled === "boolean") setFollowUpEnabled(rawCfg.follow_up_enabled);
      if (rawCfg.follow_up_delay_hours != null) setFollowUpDelayHours(Number(rawCfg.follow_up_delay_hours));
      if (rawCfg.follow_up_max != null) setFollowUpMax(Number(rawCfg.follow_up_max));
      if (rawCfg.follow_up_tone) setFollowUpTone(rawCfg.follow_up_tone as "casual" | "value-add" | "last-attempt");
      if (Array.isArray((rawCfg as any).follow_up_steps) && (rawCfg as any).follow_up_steps.length > 0) setFollowUpSteps((rawCfg as any).follow_up_steps as FollowUpStep[]);
      if (rawCfg.ai_name != null) setAiName(rawCfg.ai_name ?? "");
      if ((rawCfg.persona as any)?.personality) setAiPersonality((rawCfg.persona as any).personality);
      if (rawCfg.knowledge) {
        const k = rawCfg.knowledge as Record<string, string>;
        if (k.pricing != null) setKnowledgePricing(k.pricing ?? "");
        if (k.opening_hours != null) setKnowledgeHours(k.opening_hours ?? "");
        if (k.location != null) setKnowledgeLocation(k.location ?? "");
        const standardKeys = new Set(["pricing", "opening_hours", "location"]);
        const extra: Record<string, string> = {};
        Object.entries(k).forEach(([key, value]) => { if (!standardKeys.has(key) && value) extra[key] = value as string; });
        if (Object.keys(extra).length) setExtraKnowledge(extra);
      }
      if (Array.isArray(rawCfg.goals)) setGoals(rawCfg.goals as Array<{ id: string; title: string; target: number; metric: string; current?: number }>);
      if (typeof rawCfg.demo_mode === "boolean") setDemoEnabled(rawCfg.demo_mode);
      if (rawCfg.demo_trigger_word) setDemoKeyword(rawCfg.demo_trigger_word);
      if (rawCfg.response_length_style) setResponseLengthStyle(rawCfg.response_length_style as "concise" | "balanced" | "detailed");
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

  useEffect(() => {
    console.log("businessId on mount:", businessId);
    if (!businessId) return;
    let cancelled = false;
    (async () => {
      const { data: photoRows } = await (supabase as any)
        .from("business_assets")
        .select("id, url, description, tag_key, tags")
        .eq("business_id", businessId)
        .eq("asset_type", "photo")
        .order("created_at", { ascending: false });
      if (cancelled) return;
      setPhotos(photoRows || []);
    })();
    return () => { cancelled = true; };
  }, [businessId]);

  const businessContext = useMemo(
    () => ({ business_type: businessType, niche, ai_name: aiName }),
    [businessType, niche, aiName],
  );
  const screeningQuestionSuggestion = useAiSuggestion({ fieldType: "screening_question", businessContext });
  const badLeadSuggestion = useAiSuggestion({ fieldType: "bad_lead", businessContext });

  const upsertBusinessConfig = async (patch: Record<string, unknown>) => {
    if (!businessId) return;
    const { error } = await (supabase as any)
      .from("business_configs")
      .update(patch)
      .eq("business_id", businessId);
    if (error) {
      console.error("[config save] failed", error);
      toast.error(`Could not save: ${error.message}`);
    }
  };

  // Saves a Demo Mode field and flashes a "Saved" confirmation that fades after 2s.
  const saveDemoConfig = useCallback(async (patch: Record<string, unknown>) => {
    if (!businessId) return;
    const { error } = await (supabase as any)
      .from("business_configs")
      .update(patch)
      .eq("business_id", businessId);
    if (error) {
      console.error("[config save] failed", error);
      toast.error(`Could not save: ${error.message}`);
      return;
    }
    setDemoSaved(true);
    if (demoSavedTimeoutRef.current) clearTimeout(demoSavedTimeoutRef.current);
    demoSavedTimeoutRef.current = setTimeout(() => setDemoSaved(false), 2000);
  }, [businessId]);

  // Clean up any pending demo-mode timers on unmount
  useEffect(() => {
    return () => {
      if (demoKeywordDebounceRef.current) clearTimeout(demoKeywordDebounceRef.current);
      if (demoSavedTimeoutRef.current) clearTimeout(demoSavedTimeoutRef.current);
      if (responseStyleSavedTimeoutRef.current) clearTimeout(responseStyleSavedTimeoutRef.current);
    };
  }, []);

  // Saves the AI's response length style and flashes a "Saved" confirmation that fades after 1.5s.
  const saveResponseLengthStyle = useCallback(async (value: "concise" | "balanced" | "detailed") => {
    if (!businessId) return;
    setResponseLengthStyle(value);
    const { error } = await (supabase as any)
      .from("business_configs")
      .update({ response_length_style: value })
      .eq("business_id", businessId);
    if (error) {
      console.error("[config save] failed", error);
      toast.error(`Could not save: ${error.message}`);
      return;
    }
    setResponseStyleSaved(true);
    if (responseStyleSavedTimeoutRef.current) clearTimeout(responseStyleSavedTimeoutRef.current);
    responseStyleSavedTimeoutRef.current = setTimeout(() => setResponseStyleSaved(false), 1500);
  }, [businessId]);

  const addFilesToQueue = (files: FileList | File[]) => {
    const newItems = Array.from(files).map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      previewUrl: URL.createObjectURL(file),
      tag: "",
      description: "",
    }));
    if (newItems.length === 0) return;
    setPendingFiles(prev => [...prev, ...newItems]);
  };

  const openPhotoPicker = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.accept = "image/jpeg,image/png,image/gif,image/webp";
    input.onchange = (e: Event) => {
      const files = (e.target as HTMLInputElement).files;
      console.log("[PHOTO] files from picker:", files?.length);
      if (files && files.length > 0) {
        console.log("[PHOTO] setting pendingFiles:", files.length);
        addFilesToQueue(files);
      }
    };
    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
  };

  const handlePhotoDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setPhotoDropActive(false);
    const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith("image/"));
    addFilesToQueue(files);
  };

  const updatePendingFile = (id: string, patch: Partial<{ tag: string; description: string; tagError: boolean }>) => {
    setPendingFiles(prev => prev.map(p => (p.id === id ? { ...p, ...patch } : p)));
  };

  const removePendingFile = (id: string) => {
    setPendingFiles(prev => {
      const item = prev.find(p => p.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter(p => p.id !== id);
    });
  };

  const saveAllPhotos = async () => {
    if (pendingFiles.length === 0) return;
    const hasMissingTag = pendingFiles.some(item => !item.tag.trim());
    if (hasMissingTag) {
      setPendingFiles(prev => prev.map(p => ({ ...p, tagError: !p.tag.trim() })));
      toast.error("Add a tag for each photo before saving.");
      return;
    }

    // Re-read businessId at upload time in case state is stale
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.error("No session");
      return;
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("business_id")
      .eq("id", session.user.id)
      .single();
    const resolvedBusinessId = profile?.business_id;
    if (!resolvedBusinessId) {
      console.error("Still no businessId after re-fetch");
      return;
    }
    console.log("[PHOTO] uploading with businessId:", resolvedBusinessId);

    setSavingPhotos(true);
    try {
      const saved = await Promise.all(pendingFiles.map(async item => {
        const ext = item.file.name.split(".").pop() || "jpg";
        const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const path = `${resolvedBusinessId}/${filename}`;
        console.log("Uploading to path:", path);
        const { error: uploadError } = await supabase.storage.from("business-photos").upload(path, item.file, { contentType: item.file.type });
        if (uploadError) {
          console.error("storage upload error:", uploadError);
          throw uploadError;
        }
        const url = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/business-photos/${path}`;
        console.log("Photo URL:", url);
        const tagKey = item.tag.trim().toLowerCase().replace(/\s+/g, "_");
        const { data, error } = await (supabase as any)
          .from("business_assets")
          .insert({
            business_id: resolvedBusinessId,
            url,
            description: item.description.trim(),
            tag_key: tagKey,
            tags: [tagKey],
            asset_type: "photo",
          })
          .select()
          .single();
        if (error) {
          console.error("business_assets insert error:", error);
          throw error;
        }
        return data;
      }));
      setPhotos(prev => [...saved, ...prev]);
      pendingFiles.forEach(item => URL.revokeObjectURL(item.previewUrl));
      setPendingFiles([]);
    } catch (err) {
      toast.error(`Could not save photos: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
    setSavingPhotos(false);
  };

  const deletePhoto = async (photo: { id: string; url: string }) => {
    const path = photo.url.split("/business-photos/")[1];
    if (path) await supabase.storage.from("business-photos").remove([path]);
    await (supabase as any).from("business_assets").delete().eq("id", photo.id);
    setPhotos(prev => prev.filter(p => p.id !== photo.id));
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

  const saveFollowUpSteps = useCallback(async (steps: FollowUpStep[]) => {
    if (!businessId) return;
    const { error } = await (supabase as any).from("business_configs").upsert(
      { business_id: businessId, follow_up_steps: steps },
      { onConflict: "business_id" },
    );
    if (error) toast.error(`Could not save steps: ${error.message}`);
  }, [businessId]);

  const rebuildAndSavePrompt = useCallback(async (overrides: {
    aiNameOverride?: string;
    aiPersonalityOverride?: string;
    knowledgeOverride?: Record<string, string>;
    questionsOverride?: { question: string }[];
    strictnessOverride?: string;
    badLeadOverride?: string;
    escalationRulesOverride?: Record<string, boolean>;
    goalsOverride?: { goal: string }[];
  } = {}) => {
    if (!businessId) return;
    const prompt = buildSystemPrompt({
      ai_name: overrides.aiNameOverride ?? aiName,
      ai_personality: overrides.aiPersonalityOverride ?? aiPersonality,
      workspace_name: welcomeGymName,
      knowledge: overrides.knowledgeOverride ?? { pricing: knowledgePricing, opening_hours: knowledgeHours, location: knowledgeLocation, ...extraKnowledge },
      qualification_questions: overrides.questionsOverride ?? qualQuestions.map(q => ({ question: q.text })),
      qualification_strictness: overrides.strictnessOverride ?? qualificationStrictness,
      bad_lead_definition: overrides.badLeadOverride ?? badLeadDefinition,
      escalation_rules: overrides.escalationRulesOverride ?? {
        cant_answer: cantAnswer,
        angry: angryLead,
        competitor: competitorMentioned,
        injury: injuryConcern,
        ready_to_buy: readyToBuy,
        callback_request: callbackRequest,
        repeated_questions: repeatedQuestions,
        bot_question: botQuestion,
        silence_enabled: leadSilentEnabled,
        conversation_too_long: conversationTooLong,
        vip_inquiry: bulkVipInquiry,
        specific_keywords: specificKeywordsEnabled,
      },
      goals: overrides.goalsOverride ?? goals.map(g => ({ goal: g.title })),
    });
    await (supabase as any)
      .from("business_configs")
      .update({ system_prompt: prompt })
      .eq("business_id", businessId);
  }, [businessId, aiName, aiPersonality, welcomeGymName, knowledgePricing, knowledgeHours, knowledgeLocation, extraKnowledge, qualQuestions, qualificationStrictness, badLeadDefinition, cantAnswer, angryLead, competitorMentioned, injuryConcern, readyToBuy, callbackRequest, repeatedQuestions, botQuestion, leadSilentEnabled, conversationTooLong, bulkVipInquiry, specificKeywordsEnabled, goals]);

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

  const handleApplyOnboardingConfig = async (
    cfg: ConfigData,
    messages?: { role: "user" | "assistant"; content: string }[],
  ) => {
    if (!businessId) return;

    // Use the conversation messages to extract a complete config via the extraction function.
    // The remote chat edge function often returns incomplete config_data, so we re-derive
    // everything from the full transcript instead.
    let extracted: ConfigData = { ...cfg };
    if (messages && messages.length > 0) {
      try {
        const { data: parsed, error } = await supabase.functions.invoke(
          "parse-onboarding-config",
          { body: { messages } },
        );
        if (!error && parsed && typeof parsed === "object") {
          // Merge: extracted fields override the sparse ones from the remote edge function
          extracted = { ...cfg, ...(parsed as ConfigData) };
        }
      } catch (e) {
        console.error("parse-onboarding-config failed, falling back to cfg:", e);
      }
    }

    const c = extracted;

    // Save the full config via the Configautofill edge function (service-role write to business_configs)
    const { error: fillError } = await supabase.functions.invoke("Configautofill", {
      body: { business_id: businessId, config_data: c },
    });

    if (fillError) {
      toast.error(`Could not save config: ${fillError.message}`);
      return;
    }

    // Re-fetch the full row so the UI reflects exactly what was persisted
    const { data: freshConfig, error: fetchError } = await (supabase as any)
      .from("business_configs")
      .select("*")
      .eq("business_id", businessId)
      .single();

    if (fetchError || !freshConfig) {
      toast.error("Config saved, but could not refresh the dashboard.");
      return;
    }

    console.log("freshConfig after Configautofill:", freshConfig);

    // Sync all relevant React state so the configurator UI reflects the saved values immediately
    setAiName(freshConfig.ai_name ?? "");
    setAiPersonality(freshConfig.ai_personality ?? (freshConfig.persona as any)?.personality ?? "professional");
    if (freshConfig.business_type) setBusinessType(freshConfig.business_type);
    if (freshConfig.niche) setNiche(freshConfig.niche);
    if (freshConfig.workspace_name) setWelcomeGymName(freshConfig.workspace_name);
    // ai_goal, system_prompt, onboarding_complete are stored in DB — no local state variable for them

    const k = (freshConfig.knowledge as Record<string, string>) || {};
    setKnowledgePricing(k.pricing ?? "");
    setKnowledgeHours(k.opening_hours ?? "");
    setKnowledgeLocation(k.location ?? "");
    const standardKeys = new Set(["pricing", "opening_hours", "location"]);
    const extra: Record<string, string> = {};
    Object.entries(k).forEach(([key, value]) => { if (!standardKeys.has(key) && value) extra[key] = value as string; });
    setExtraKnowledge(extra);

    setQualQuestions((freshConfig.qualification_questions as Array<{ id: string; text: string; expanded: boolean }>) || []);
    if (freshConfig.qualification_strictness) setQualificationStrictness(freshConfig.qualification_strictness);
    setBadLeadDefinition(freshConfig.bad_lead_definition ?? "");
    setGoals((freshConfig.goals as Array<{ id: string; title: string; target: number; metric: string; current?: number }>) || []);

    const er = (freshConfig.escalation_rules as Record<string, boolean | number | null>) || {};
    setCantAnswer(!!er.cant_answer);
    setAngryLead(!!er.angry);
    setCompetitorMentioned(!!er.competitor);
    setInjuryConcern(!!er.injury);
    setReadyToBuy(!!er.ready_to_buy);
    setCallbackRequest(!!er.callback_request);
    setBotQuestion(!!er.bot_question);
    setConversationTooLong(!!er.conversation_too_long);
    setBulkVipInquiry(!!er.vip_inquiry);
    setRepeatedQuestions(!!er.repeated_questions);

    if (freshConfig.lead_silent_hours != null) {
      setLeadSilentEnabled(true);
      setLeadSilentHours(Number(freshConfig.lead_silent_hours));
    } else {
      setLeadSilentEnabled(false);
      setLeadSilentHours(null);
    }
    const keywords = (freshConfig.specific_keywords as string[]) || [];
    setSpecificKeywords(keywords);
    setSpecificKeywordsEnabled(keywords.length > 0);

    if (typeof freshConfig.follow_up_enabled === "boolean") setFollowUpEnabled(freshConfig.follow_up_enabled);
    if (freshConfig.follow_up_delay_hours != null) setFollowUpDelayHours(Number(freshConfig.follow_up_delay_hours));
    if (freshConfig.follow_up_max != null) setFollowUpMax(Number(freshConfig.follow_up_max));
    if (freshConfig.follow_up_tone) setFollowUpTone(freshConfig.follow_up_tone as "casual" | "value-add" | "last-attempt");

    setDemoEnabled(!!freshConfig.demo_mode);
    if (freshConfig.demo_trigger_word) setDemoKeyword(freshConfig.demo_trigger_word);

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
                {activeView === "overview" ? (
                  <p className="mt-1.5 text-sm font-normal tracking-[0.02em] text-muted-foreground">
                    Welcome back, <span className="text-foreground/90">{welcomeUserName}</span>
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
                        { label: "Total leads", value: String(overviewMetrics.totalLeads), icon: Users },
                        { label: "Hot leads", value: String(overviewMetrics.hotLeads), icon: TrendingUp },
                        { label: "Bookings", value: String(overviewMetrics.totalBookings), icon: CalendarDays },
                        { label: "Active today", value: String(overviewMetrics.activeToday), icon: MessageCircle },
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
                          <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Lead momentum</p>
                          <h2 className="mt-2 text-lg font-semibold text-foreground">New leads — last 30 days</h2>
                        </div>
                        <div className="flex items-center gap-5 text-sm text-muted-foreground">
                          <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-primary" /> Leads</span>
                        </div>
                      </div>
                      <div className="mt-6 h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={overviewMetrics.chartData}>
                            <CartesianGrid stroke="hsl(0 0% 100% / 0.05)" vertical={false} />
                            <XAxis dataKey="date" stroke="hsl(230 8% 45%)" tickLine={false} axisLine={false} fontSize={12} />
                            <YAxis stroke="hsl(230 8% 45%)" tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} />
                            <Tooltip
                              cursor={{ stroke: "hsl(262 83% 58% / 0.18)", strokeWidth: 1 }}
                              contentStyle={{
                                backgroundColor: "hsl(235 22% 11%)",
                                border: "1px solid hsl(0 0% 100% / 0.08)",
                                borderRadius: 16,
                                color: "hsl(40 18% 92%)",
                              }}
                            />
                            <Line type="monotone" dataKey="leads" name="Leads" stroke="hsl(262 83% 58%)" strokeWidth={2.5} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="dashboard-panel p-5 md:p-6">
                      <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Next actions</p>
                      <div className="mt-5 space-y-3">
                        {nextActions.map((action, i) => (
                          <div
                            key={i}
                            onClick={() => action.view && setActiveView(action.view)}
                            className={cn(
                              "flex items-start gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3",
                              action.view && "cursor-pointer transition-colors hover:bg-white/[0.05]"
                            )}
                          >
                            <span className={cn("mt-1 h-2.5 w-2.5 rounded-full", action.urgent ? "bg-red-400" : "bg-emerald-400")} />
                            <p className="text-sm text-foreground/90">{action.label}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="dashboard-panel p-5 md:p-6">
                      <div className="flex items-center justify-between">
                        <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Platform breakdown</p>
                        <p className="text-sm text-muted-foreground">All time</p>
                      </div>
                      {Object.keys(overviewMetrics.platforms).length === 0 ? (
                        <p className="mt-5 text-sm text-muted-foreground">No leads yet.</p>
                      ) : (
                        <div className="mt-5 space-y-4">
                          {Object.entries(overviewMetrics.platforms).map(([name, count]) => {
                            const pct = overviewMetrics.totalLeads > 0 ? (count / overviewMetrics.totalLeads) * 100 : 0;
                            return (
                              <div key={name} className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-foreground/80">{titleCase(name)}</span>
                                  <span className="text-foreground">{count}</span>
                                </div>
                                <div className="h-2 rounded-full bg-white/[0.06]">
                                  <div className="h-2 rounded-full bg-primary" style={{ width: `${pct}%` }} />
                                </div>
                              </div>
                            );
                          })}
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
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="fit-filter">
                        <span>Status:</span>
                        <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)}>
                          <option>All</option><option>Confirmed</option><option>Booked</option><option>Attended</option><option>{industry.converted}</option>
                        </select>
                      </label>
                      <label className="fit-filter">
                        <span>Source:</span>
                        <select value={sourceFilter} onChange={event => setSourceFilter(event.target.value)}>
                          <option>All</option><option>Instagram</option><option>Walk-in</option><option>Referral</option><option>Manual</option><option>AI</option>
                        </select>
                      </label>
                      <Button onClick={() => openAddManualBookingModal()} className="ml-auto">
                        <Plus className="mr-1.5 h-4 w-4" />
                        Add booking
                      </Button>
                    </div>
                  </div>

                  <div className="hidden grid-cols-[44px_1.2fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-5 py-4 text-[11px] font-semibold uppercase tracking-[0.25em] text-muted-foreground lg:grid">
                    <span /><span>Name</span><span>Phone</span><span>Status</span><span>Source</span><span>Date</span><span>Time</span>
                  </div>

                  <div className="max-h-[calc(100vh-260px)] overflow-auto px-3 pb-3 md:px-4">
                    {bookingsState.loading && <p className="px-4 py-6 text-sm text-muted-foreground">Loading bookings…</p>}
                    {!bookingsState.loading && filteredBookings.length === 0 && (
                      <div className="px-4 pb-6 pt-2">
                        <EmptyState
                          title={bookingsState.error ? "Unable to load bookings" : "No bookings yet"}
                          hint={bookingsState.error ? "Unable to load bookings right now." : "Bookings appear here when your AI books a lead or you add one manually."}
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

                  <Dialog open={addBookingModalOpen} onOpenChange={setAddBookingModalOpen}>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Add Booking</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="manual-booking-name">Name</Label>
                          <Input
                            id="manual-booking-name"
                            value={addBookingForm.name}
                            onChange={e => setAddBookingForm(f => ({ ...f, name: e.target.value }))}
                            placeholder="Lead name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="manual-booking-phone">Phone</Label>
                          <Input
                            id="manual-booking-phone"
                            value={addBookingForm.phone}
                            onChange={e => setAddBookingForm(f => ({ ...f, phone: e.target.value }))}
                            placeholder="Optional"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="manual-booking-date">Date</Label>
                            <Input
                              id="manual-booking-date"
                              type="date"
                              value={addBookingForm.date}
                              onChange={e => setAddBookingForm(f => ({ ...f, date: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="manual-booking-time">Time</Label>
                            <Input
                              id="manual-booking-time"
                              type="time"
                              value={addBookingForm.time}
                              onChange={e => setAddBookingForm(f => ({ ...f, time: e.target.value }))}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="manual-booking-notes">Notes</Label>
                          <Textarea
                            id="manual-booking-notes"
                            value={addBookingForm.notes}
                            onChange={e => setAddBookingForm(f => ({ ...f, notes: e.target.value }))}
                            placeholder="Optional"
                            rows={3}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setAddBookingModalOpen(false)} disabled={savingAddBooking}>
                          Cancel
                        </Button>
                        <Button onClick={saveManualBooking} disabled={savingAddBooking}>
                          {savingAddBooking ? "Saving…" : "Save"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
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
                    <div className="relative mt-4">
                      <div className="grid grid-cols-7 border border-white/[0.06]">
                        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
                          <div key={day} className="border-b border-white/[0.06] px-3 py-3 text-center text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            {day}
                          </div>
                        ))}
                        {calendarCells.map((cell, index) => {
                          const dayEvents = cell.events ?? [];
                          const visibleEvents = dayEvents.slice(0, 2);
                          const extraCount = dayEvents.length - visibleEvents.length;
                          return (
                            <div
                              key={`${cell.day}-${index}`}
                              onClick={() => {
                                if (cell.muted) return;
                                openAddBookingModal(calendarDate.getFullYear(), calendarDate.getMonth(), cell.day);
                              }}
                              className={cn(
                                "min-h-[110px] border-b border-r border-white/[0.06] p-3 align-top last:border-r-0 xl:min-h-[126px]",
                                cell.emphasis && "bg-primary/[0.08]",
                                !cell.muted && "cursor-pointer hover:bg-white/[0.02]"
                              )}
                            >
                              <p className={cn("text-right text-sm font-medium", cell.muted ? "text-muted-foreground/40" : "text-muted-foreground")}>
                                {cell.day}
                              </p>
                              {visibleEvents.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  {visibleEvents.map(ev => (
                                    <div
                                      key={ev.id}
                                      className={cn(
                                        "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] xl:text-xs",
                                        ev.type === "booking"
                                          ? "bg-primary/15 text-primary"
                                          : "bg-teal-500/15 text-teal-300"
                                      )}
                                    >
                                      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", ev.type === "booking" ? "bg-primary" : "bg-teal-400")} />
                                      <span className="truncate">{ev.title}</span>
                                    </div>
                                  ))}
                                  {extraCount > 0 && (
                                    <p className="px-2.5 text-[11px] text-muted-foreground">+{extraCount} more</p>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      {!monthHasEvents && (
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center pt-12">
                          <p className="text-sm text-muted-foreground">
                            No bookings this month. Click any date to add one.
                          </p>
                        </div>
                      )}
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

                  <Dialog open={bookingModalOpen} onOpenChange={setBookingModalOpen}>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Add Booking</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="booking-name">Lead name</Label>
                          <Input
                            id="booking-name"
                            value={bookingForm.name}
                            onChange={e => setBookingForm(f => ({ ...f, name: e.target.value }))}
                            placeholder="Lead name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="booking-phone">Phone</Label>
                          <Input
                            id="booking-phone"
                            value={bookingForm.phone}
                            onChange={e => setBookingForm(f => ({ ...f, phone: e.target.value }))}
                            placeholder="Optional"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="booking-date">Date</Label>
                            <Input
                              id="booking-date"
                              type="date"
                              value={bookingModalDate}
                              onChange={e => setBookingModalDate(e.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="booking-time">Time</Label>
                            <Input
                              id="booking-time"
                              type="time"
                              value={bookingForm.time}
                              onChange={e => setBookingForm(f => ({ ...f, time: e.target.value }))}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="booking-notes">Notes</Label>
                          <Textarea
                            id="booking-notes"
                            value={bookingForm.notes}
                            onChange={e => setBookingForm(f => ({ ...f, notes: e.target.value }))}
                            placeholder="Optional"
                            rows={3}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setBookingModalOpen(false)} disabled={savingBooking}>
                          Cancel
                        </Button>
                        <Button onClick={saveBooking} disabled={savingBooking}>
                          {savingBooking ? "Saving…" : "Save"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              )}

              {activeView === "analytics" && <AnalyticsView />}

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

              {activeView === "feedback" && (
                <EscalationsView
                  onOpenConversation={(id) => {
                    setInboxInitialConversationId(id);
                    setActiveView("inbox");
                  }}
                />
              )}

              {activeView === "ai-configurator" && (
                <div className="grid h-full gap-4 xl:grid-cols-2">
                  {/* LEFT COLUMN */}
                  <div className="space-y-4">
                    {/* AI Identity */}
                    <div className="dashboard-panel p-5 md:p-6" style={CONFIGURATOR_CARD_STYLE}>
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
                          onClick={() => { upsertBusinessConfig({ ai_name: aiName, persona: { personality: aiPersonality } }); rebuildAndSavePrompt(); toast.success("AI identity saved."); }}
                          className="rounded-2xl bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors"
                        >
                          Save
                        </button>
                      </div>
                    </div>

                    {/* Response Style */}
                    <div className="dashboard-panel p-5 md:p-6" style={CONFIGURATOR_CARD_STYLE}>
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Response Style</p>
                          <h2 className="mt-2 text-lg font-semibold text-foreground">How long should replies be?</h2>
                        </div>
                        <span
                          className={cn(
                            "shrink-0 text-xs font-semibold text-emerald-400 transition-opacity duration-500",
                            responseStyleSaved ? "opacity-100" : "opacity-0",
                          )}
                        >
                          Saved ✓
                        </span>
                      </div>
                      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                        {RESPONSE_LENGTH_OPTIONS.map(opt => {
                          const selected = responseLengthStyle === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => saveResponseLengthStyle(opt.value)}
                              className={cn(
                                "rounded-2xl border p-4 text-left transition-colors",
                                selected
                                  ? "border-[#6366F1] bg-[#6366F1]/10"
                                  : "border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.06]"
                              )}
                            >
                              <p className={cn("text-sm font-semibold", selected ? "text-[#A5A8FF]" : "text-foreground")}>
                                {opt.label}
                              </p>
                              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{opt.subtitle}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Quick Setup */}
                    <div className="dashboard-panel p-5 md:p-6" style={CONFIGURATOR_CARD_STYLE}>
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
                    <div className="dashboard-panel p-5 md:p-6" style={CONFIGURATOR_CARD_STYLE}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Knowledge Base</p>
                          <h2 className="mt-2 text-lg font-semibold text-foreground">What your AI knows about your business</h2>
                        </div>
                        <button type="button" onClick={() => { const name = window.prompt("Section name (e.g. FAQs, Amenities):"); if (!name?.trim()) return; const key = name.trim().toLowerCase().replace(/\s+/g, "_"); const reserved = new Set(["pricing", "opening_hours", "location"]); if (reserved.has(key) || key in extraKnowledge) return; setExtraKnowledge(prev => ({ ...prev, [key]: "" })); }} className="mt-0.5 flex shrink-0 items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
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
                                onClick={() => { kw.set(""); const updatedKnowledge = { pricing: kw.label === "PRICING" ? "" : knowledgePricing, opening_hours: kw.label === "OPENING HOURS" ? "" : knowledgeHours, location: kw.label === "LOCATION" ? "" : knowledgeLocation, ...extraKnowledge }; upsertBusinessConfig({ knowledge: updatedKnowledge }); rebuildAndSavePrompt({ knowledgeOverride: updatedKnowledge }); }}
                                className="text-muted-foreground/50 hover:text-red-400 transition-colors"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <textarea
                              value={kw.value}
                              onChange={e => kw.set(e.target.value)}
                              onBlur={() => { const fullKnowledge = { pricing: knowledgePricing, opening_hours: knowledgeHours, location: knowledgeLocation, ...extraKnowledge }; upsertBusinessConfig({ knowledge: fullKnowledge }); rebuildAndSavePrompt({ knowledgeOverride: fullKnowledge }); }}
                              placeholder={kw.placeholder}
                              rows={3}
                              className="w-full resize-none rounded-xl border border-white/10 bg-[hsl(233_30%_8%)] px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50 placeholder:text-muted-foreground/40"
                            />
                          </div>
                        ))}
                        {Object.entries(extraKnowledge).map(([ekKey, ekValue]) => (
                          <div key={ekKey} className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
                            <div className="mb-2 flex items-center justify-between">
                              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{ekKey.replace(/_/g, " ")}</p>
                              <button
                                type="button"
                                onClick={async () => { const updated = { ...extraKnowledge }; delete updated[ekKey]; setExtraKnowledge(updated); const fullKnowledge = { pricing: knowledgePricing, opening_hours: knowledgeHours, location: knowledgeLocation, ...updated }; await (supabase as any).from("business_configs").update({ knowledge: fullKnowledge }).eq("business_id", businessId); rebuildAndSavePrompt({ knowledgeOverride: fullKnowledge }); }}
                                className="text-muted-foreground/50 hover:text-red-400 transition-colors"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            <textarea
                              value={ekValue}
                              onChange={e => setExtraKnowledge(prev => ({ ...prev, [ekKey]: e.target.value }))}
                              onBlur={async () => { const fullKnowledge = { pricing: knowledgePricing, opening_hours: knowledgeHours, location: knowledgeLocation, ...extraKnowledge }; await (supabase as any).from("business_configs").update({ knowledge: fullKnowledge }).eq("business_id", businessId); rebuildAndSavePrompt({ knowledgeOverride: fullKnowledge }); }}
                              placeholder={`Describe ${ekKey.replace(/_/g, " ")}...`}
                              rows={3}
                              className="w-full resize-none rounded-xl border border-white/10 bg-[hsl(233_30%_8%)] px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50 placeholder:text-muted-foreground/40"
                            />
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Photos */}
                    <div className="dashboard-panel p-5 md:p-6" style={CONFIGURATOR_CARD_STYLE}>
                      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Photos</p>
                      <h2 className="mt-2 text-lg font-semibold text-foreground">Images your AI can send</h2>
                      <p className="mt-1 text-sm text-muted-foreground">The AI sends these when relevant. Give each one a clear tag so it knows when to use it.</p>

                      <div className="mt-5 space-y-3">
                        <label
                          onClick={openPhotoPicker}
                          onDragOver={e => { e.preventDefault(); setPhotoDropActive(true); }}
                          onDragLeave={() => setPhotoDropActive(false)}
                          onDrop={handlePhotoDrop}
                          style={{
                            cursor: businessId ? "pointer" : "not-allowed",
                            opacity: businessId ? 1 : 0.5,
                            pointerEvents: businessId ? "auto" : "none",
                          }}
                          className={cn("flex w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed bg-white/[0.02] p-6 text-center transition-colors hover:border-white/20", photoDropActive ? "border-[rgba(168,85,247,1)]" : "border-white/10")}
                        >
                          <Upload className="h-5 w-5 text-muted-foreground" />
                          <p className="text-sm text-foreground/90">Upload photo</p>
                          <p className="text-xs text-muted-foreground">jpg, png, gif, webp · 8MB max</p>
                        </label>
                        <button
                          type="button"
                          disabled={!businessId}
                          onClick={openPhotoPicker}
                          className="flex shrink-0 items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Plus className="h-3.5 w-3.5" />Add photos
                        </button>

                        {pendingFiles.length > 0 && (
                          <div className="space-y-2.5">
                            {pendingFiles.map(item => (
                              <div key={item.id} className="rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
                                <div className="flex items-start gap-3">
                                  <img src={item.previewUrl} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
                                  <div className="flex-1 space-y-2">
                                    <input
                                      value={item.tag}
                                      onChange={e => updatePendingFile(item.id, { tag: e.target.value.toLowerCase().replace(/\s+/g, "_"), tagError: false })}
                                      placeholder="e.g. gym_interior"
                                      className={cn("w-full rounded-xl border bg-[hsl(233_30%_8%)] px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50 placeholder:text-muted-foreground/40", item.tagError ? "border-red-500" : "border-white/10")}
                                    />
                                    <input
                                      value={item.description}
                                      onChange={e => updatePendingFile(item.id, { description: e.target.value })}
                                      placeholder="When should the AI send this?"
                                      className="w-full rounded-xl border border-white/10 bg-[hsl(233_30%_8%)] px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50 placeholder:text-muted-foreground/40"
                                    />
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => removePendingFile(item.id)}
                                    className="shrink-0 p-1 text-muted-foreground/60 hover:text-red-400 transition-colors"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                            <button
                              type="button"
                              onClick={saveAllPhotos}
                              disabled={savingPhotos}
                              className="rounded-2xl bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
                            >
                              {savingPhotos ? "Saving..." : "Save all"}
                            </button>
                          </div>
                        )}

                        {photos.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No photos yet. Upload one above.</p>
                        ) : (
                          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                            {photos.map(photo => (
                              <div key={photo.id} className="group rounded-2xl border border-white/[0.06] bg-white/[0.03] p-2">
                                <div className="relative aspect-square overflow-hidden rounded-xl">
                                  <img src={photo.url} alt={photo.tag_key ?? ""} className="h-full w-full object-cover" />
                                  <button
                                    type="button"
                                    onClick={() => deletePhoto(photo)}
                                    className="absolute right-1.5 top-1.5 rounded-lg bg-black/50 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-400"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                                {photo.tag_key && (
                                  <p className="mt-2 inline-block rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[11px] font-medium text-foreground/80">
                                    {photo.tag_key}
                                  </p>
                                )}
                                {photo.description && (
                                  <p className="mt-1 text-xs text-muted-foreground">{photo.description}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Goals */}
                    <div className="dashboard-panel p-5 md:p-6" style={CONFIGURATOR_CARD_STYLE}>
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

                    {/* Follow-Up */}
                    <div className="dashboard-panel p-5 md:p-6" style={CONFIGURATOR_CARD_STYLE}>
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
                          <FollowUpStepsBuilder
                            steps={followUpSteps}
                            onChange={steps => {
                              setFollowUpSteps(steps);
                              if (followUpStepsDebounceRef.current) clearTimeout(followUpStepsDebounceRef.current);
                              followUpStepsDebounceRef.current = setTimeout(() => saveFollowUpSteps(steps), 800);
                            }}
                            businessContext={businessContext}
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* RIGHT COLUMN */}
                  <div className="space-y-4">
                    {/* Qualification Flow */}
                    <div className="dashboard-panel p-5 md:p-6" style={CONFIGURATOR_CARD_STYLE}>
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
                            <button type="button" onClick={async () => { const upd = qualQuestions.filter((_, j) => j !== qi); setQualQuestions(upd); await (supabase as any).from("business_configs").update({ qualification_questions: upd }).eq("business_id", businessId); rebuildAndSavePrompt({ questionsOverride: upd.map(q => ({ question: q.text })) }); }} className="p-1 text-muted-foreground/60 hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 flex gap-2">
                        <input
                          value={newQuestionInput}
                          onChange={e => { setNewQuestionInput(e.target.value); screeningQuestionSuggestion.triggerSuggestion(e.target.value); }}
                          onKeyDown={async e => { if (e.key === "Enter") { e.preventDefault(); const t = newQuestionInput.trim(); if (!t) return; const upd = [...qualQuestions, { id: `q-${Date.now()}`, text: t, expanded: false }]; setQualQuestions(upd); setNewQuestionInput(""); screeningQuestionSuggestion.dismiss(); await (supabase as any).from("business_configs").update({ qualification_questions: upd }).eq("business_id", businessId); rebuildAndSavePrompt({ questionsOverride: upd.map(q => ({ question: q.text })) }); } }}
                          placeholder="Type a question..."
                          className="flex-1 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary/50 placeholder:text-muted-foreground/40"
                        />
                        <button
                          type="button"
                          onClick={async () => { const t = newQuestionInput.trim(); if (!t) return; const upd = [...qualQuestions, { id: `q-${Date.now()}`, text: t, expanded: false }]; setQualQuestions(upd); setNewQuestionInput(""); screeningQuestionSuggestion.dismiss(); await (supabase as any).from("business_configs").update({ qualification_questions: upd }).eq("business_id", businessId); rebuildAndSavePrompt({ questionsOverride: upd.map(q => ({ question: q.text })) }); }}
                          className="rounded-2xl bg-primary px-3.5 py-2.5 text-white hover:bg-primary/90 transition-colors"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      <AiSuggestionBar
                        suggestion={screeningQuestionSuggestion.suggestion}
                        loading={screeningQuestionSuggestion.loading}
                        onAccept={value => { setNewQuestionInput(value); screeningQuestionSuggestion.dismiss(); }}
                        onDismiss={screeningQuestionSuggestion.dismiss}
                      />
                      <div className="mt-4">
                        <p className="fit-label mb-2">Strictness</p>
                        <select
                          value={qualificationStrictness}
                          onChange={e => { setQualificationStrictness(e.target.value); upsertBusinessConfig({ qualification_strictness: e.target.value }); rebuildAndSavePrompt({ strictnessOverride: e.target.value }); }}
                          className="w-full rounded-2xl border border-white/10 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                          style={{ backgroundColor: "#1e1e35", color: "#ffffff", border: "1px solid #2a2a4a" }}
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
                          onChange={e => { setBadLeadDefinition(e.target.value); badLeadSuggestion.triggerSuggestion(e.target.value); }}
                          onBlur={async () => { await (supabase as any).from("business_configs").update({ bad_lead_definition: badLeadDefinition || null }).eq("business_id", businessId); rebuildAndSavePrompt(); }}
                          placeholder="Describe who the AI should politely reject or not push to book..."
                          rows={3}
                          className="w-full resize-none rounded-xl border border-white/10 bg-[hsl(233_30%_8%)] px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50 placeholder:text-muted-foreground/40"
                        />
                        <AiSuggestionBar
                          suggestion={badLeadSuggestion.suggestion}
                          loading={badLeadSuggestion.loading}
                          onAccept={async value => {
                            setBadLeadDefinition(value);
                            badLeadSuggestion.dismiss();
                            await (supabase as any).from("business_configs").update({ bad_lead_definition: value || null }).eq("business_id", businessId);
                            rebuildAndSavePrompt({ badLeadOverride: value });
                          }}
                          onDismiss={badLeadSuggestion.dismiss}
                        />
                      </div>
                    </div>

                    {/* Escalation Rules */}
                    <div className="dashboard-panel p-5 md:p-6" style={CONFIGURATOR_CARD_STYLE}>
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
                              onClick={async () => {
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
                                const updatedRules = {
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
                                  specific_keywords: key === "specificKeywords" ? next : specificKeywordsEnabled,
                                };
                                upsertBusinessConfig({ escalation_rules: updatedRules });
                                await rebuildAndSavePrompt({ escalationRulesOverride: updatedRules });
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

                    <div className="dashboard-panel p-5 md:p-6">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Demo Mode</p>
                          <h2 className="mt-2 text-lg font-semibold text-foreground">Let prospects test your AI</h2>
                        </div>
                        <span
                          className={cn(
                            "shrink-0 text-xs font-semibold text-emerald-400 transition-opacity duration-500",
                            demoSaved ? "opacity-100" : "opacity-0",
                          )}
                        >
                          Saved ✓
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">When someone DMs the activation keyword, the AI activates for 10 minutes so they can try it out.</p>
                      <div className="mt-5 space-y-4">
                        <div className="flex items-start justify-between gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3.5">
                          <div>
                            <p className="text-sm font-medium text-foreground">Enable demo mode</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">Allow anyone to activate your AI by sending the keyword</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const next = !demoEnabled;
                              setDemoEnabled(next);
                              saveDemoConfig({ demo_mode: next, trial_mode: next });
                            }}
                            className={cn("relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors", demoEnabled ? "bg-primary" : "bg-white/[0.15]")}
                          >
                            <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", demoEnabled ? "left-5" : "left-0.5")} />
                          </button>
                        </div>
                        <div>
                          <p className="fit-label mb-2">Activation keyword</p>
                          <input
                            value={demoKeyword}
                            disabled={!demoEnabled}
                            onChange={e => {
                              const val = e.target.value;
                              setDemoKeyword(val);
                              if (demoKeywordDebounceRef.current) clearTimeout(demoKeywordDebounceRef.current);
                              demoKeywordDebounceRef.current = setTimeout(() => {
                                const normalized = val.trim().toLowerCase();
                                setDemoKeyword(normalized);
                                saveDemoConfig({ demo_trigger_word: normalized, trial_mode: demoEnabled });
                              }, 500);
                            }}
                            onBlur={() => {
                              if (demoKeywordDebounceRef.current) {
                                clearTimeout(demoKeywordDebounceRef.current);
                                demoKeywordDebounceRef.current = null;
                              }
                              const normalized = demoKeyword.trim().toLowerCase();
                              setDemoKeyword(normalized);
                              saveDemoConfig({ demo_trigger_word: normalized, trial_mode: demoEnabled });
                            }}
                            className={cn(
                              "w-full rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-foreground outline-none transition-opacity focus:border-primary/50",
                              !demoEnabled && "cursor-not-allowed opacity-40",
                            )}
                          />
                          <p className="mt-1.5 text-xs text-muted-foreground">The word someone must type to start the AI demo. Default is 'ai' but you can change it to anything.</p>
                        </div>
                        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-sm text-muted-foreground">
                          When someone DMs <span className="font-mono text-primary">"{demoKeyword || "ai"}"</span> → AI activates for 10 minutes
                        </div>
                      </div>
                    </div>

                  </div>

                  <div className="space-y-4">
                    {userRole !== "staff" && (
                      <>
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
                      </>
                    )}

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

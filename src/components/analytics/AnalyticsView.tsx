import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useGymContext } from "@/hooks/useGymContext";
import { cn } from "@/lib/utils";

type ContactRow = {
  id: string;
  score: string | null;
  status: string | null;
  ai_paused: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  messages: unknown;
  conversation_state: unknown;
  platform: string | null;
};

type BookingRow = {
  id: string;
  created_at: string | null;
  status: string | null;
  booking_date: string | null;
};

const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  facebook: "Facebook",
  whatsapp: "WhatsApp",
  unknown: "Unknown",
};

function platformLabel(key: string): string {
  return PLATFORM_LABELS[key.toLowerCase()] ?? key.charAt(0).toUpperCase() + key.slice(1);
}

function messageCount(c: ContactRow): number {
  return Array.isArray(c.messages) ? c.messages.length : 0;
}

function leadTemp(c: ContactRow): string {
  const cs = c.conversation_state;
  if (cs && typeof cs === "object" && !Array.isArray(cs)) {
    const t = (cs as Record<string, unknown>).lead_temp;
    if (typeof t === "string") return t.toLowerCase();
  }
  return "";
}

const TEMP_ROWS: Array<{ key: "hot" | "warm" | "cold"; label: string; emoji: string; color: string }> = [
  { key: "hot", label: "Hot", emoji: "🔴", color: "#ef4444" },
  { key: "warm", label: "Warm", emoji: "🟡", color: "#eab308" },
  { key: "cold", label: "Cold", emoji: "🔵", color: "#3b82f6" },
];

export function AnalyticsView() {
  const { businessId } = useGymContext();
  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data: contactsData }, { data: bookingsData }] = await Promise.all([
        (supabase as any)
          .from("contacts")
          .select("id, score, status, ai_paused, created_at, updated_at, messages, conversation_state, platform")
          .eq("business_id", businessId),
        (supabase as any)
          .from("bookings")
          .select("id, created_at, status, booking_date")
          .eq("business_id", businessId),
      ]);
      if (cancelled) return;
      setContacts((contactsData ?? []) as ContactRow[]);
      setBookings((bookingsData ?? []) as BookingRow[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [businessId]);

  const m = useMemo(() => {
    const totalLeads = contacts.length;
    const activeConvos = contacts.filter((c) => messageCount(c) > 0).length;

    const hotLeads = contacts.filter(
      (c) => leadTemp(c) === "hot" || (c.score ?? "").toLowerCase() === "hot",
    ).length;
    const warmLeads = contacts.filter(
      (c) => leadTemp(c) === "warm" || (c.score ?? "").toLowerCase() === "warm",
    ).length;
    const coldLeads = contacts.filter((c) => {
      const score = (c.score ?? "").toLowerCase();
      const temp = leadTemp(c);
      return temp === "cold" || score === "cold" || (!score && !temp);
    }).length;

    const totalBookings = bookings.length;
    const conversionRate = totalLeads > 0 ? ((totalBookings / totalLeads) * 100).toFixed(1) : "0";
    const escalatedNow = contacts.filter((c) => c.ai_paused === true).length;
    const totalMessages = contacts.reduce((sum, c) => sum + messageCount(c), 0);

    const last30 = Array.from({ length: 30 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (29 - i));
      return d.toISOString().split("T")[0];
    });
    const leadsByDay = last30.map((date) => ({
      date,
      leads: contacts.filter((c) => c.created_at?.startsWith(date)).length,
      bookings: bookings.filter((b) => b.created_at?.startsWith(date)).length,
    }));

    const platforms = contacts.reduce((acc, c) => {
      const key = c.platform || "unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const leadsThisWeek = contacts.filter(
      (c) => c.created_at && new Date(c.created_at).getTime() >= sevenDaysAgo,
    ).length;
    const leadsThisMonth = contacts.filter(
      (c) => c.created_at && new Date(c.created_at).getTime() >= thirtyDaysAgo,
    ).length;

    const avgMessagesPerLead = (totalMessages / totalLeads || 0).toFixed(1);

    return {
      totalLeads,
      activeConvos,
      hotLeads,
      warmLeads,
      coldLeads,
      totalBookings,
      conversionRate,
      escalatedNow,
      totalMessages,
      leadsByDay,
      platforms,
      leadsThisWeek,
      leadsThisMonth,
      avgMessagesPerLead,
    };
  }, [contacts, bookings]);

  const platformEntries = Object.entries(m.platforms).filter(([, count]) => count > 0);

  return (
    <div className="grid h-full gap-4 xl:grid-cols-[1.35fr_0.65fr]">
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Total leads", value: String(m.totalLeads), subtext: "All time contacts" },
            { label: "Active convos", value: String(m.activeConvos), subtext: "Have had messages" },
            { label: "Bookings", value: String(m.totalBookings), subtext: `${m.conversionRate}% conversion` },
            {
              label: "Escalated now",
              value: String(m.escalatedNow),
              subtext: "Need human attention",
              alert: m.escalatedNow > 0,
            },
          ].map((card) => (
            <div key={card.label} className="dashboard-panel p-5 md:p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{card.label}</p>
              <p
                className={cn(
                  "font-display mt-5 text-3xl font-semibold",
                  card.alert ? "text-red-400" : "text-primary",
                )}
              >
                {loading ? "—" : card.value}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{card.subtext}</p>
            </div>
          ))}
        </div>

        <div className="dashboard-panel h-[360px] p-5 md:p-6">
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
            Leads & bookings — last 30 days
          </p>
          <div className="mt-6 h-[270px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={m.leadsByDay}>
                <CartesianGrid stroke="hsl(0 0% 100% / 0.05)" vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke="hsl(230 8% 45%)"
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  interval={4}
                  tickFormatter={(d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                />
                <YAxis stroke="hsl(230 8% 45%)" tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} />
                <Tooltip
                  cursor={{ stroke: "hsl(262 83% 58% / 0.18)", strokeWidth: 1 }}
                  contentStyle={{
                    backgroundColor: "hsl(235 22% 11%)",
                    border: "1px solid hsl(0 0% 100% / 0.08)",
                    borderRadius: 16,
                    color: "hsl(40 18% 92%)",
                  }}
                  labelFormatter={(d) => new Date(d as string).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                />
                <Line type="monotone" dataKey="leads" name="Leads" stroke="hsl(262 83% 58%)" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="bookings" name="Bookings" stroke="hsl(142 71% 45%)" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="dashboard-panel p-5 md:p-6">
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Lead temperature</p>
          <div className="mt-5 space-y-4">
            {TEMP_ROWS.map((row) => {
              const count = row.key === "hot" ? m.hotLeads : row.key === "warm" ? m.warmLeads : m.coldLeads;
              const pct = m.totalLeads > 0 ? (count / m.totalLeads) * 100 : 0;
              return (
                <div key={row.key} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-foreground/80">
                      <span aria-hidden>{row.emoji}</span> {row.label}
                    </span>
                    <span className="text-foreground">{loading ? "—" : count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/[0.06]">
                    <div className="h-2 rounded-full" style={{ width: `${pct}%`, backgroundColor: row.color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="dashboard-panel p-5 md:p-6">
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Platform sources</p>
          {loading ? (
            <p className="mt-5 text-sm text-muted-foreground">Loading…</p>
          ) : platformEntries.length === 0 ? (
            <p className="mt-5 text-sm text-muted-foreground">No leads yet.</p>
          ) : (
            <div className="mt-5 space-y-3">
              {platformEntries.length === 1 && (
                <p className="text-sm text-muted-foreground">
                  All leads from {platformLabel(platformEntries[0][0])}
                </p>
              )}
              {platformEntries.map(([key, count]) => (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-sm"
                >
                  <span className="text-foreground/90">{platformLabel(key)}</span>
                  <span className="text-foreground">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="dashboard-panel p-5 md:p-6">
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Quick stats</p>
          <div className="mt-5 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Total messages sent</p>
              <p className="mt-1 text-xl font-semibold text-foreground">{loading ? "—" : m.totalMessages}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Avg messages / lead</p>
              <p className="mt-1 text-xl font-semibold text-foreground">{loading ? "—" : m.avgMessagesPerLead}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Leads this week</p>
              <p className="mt-1 text-xl font-semibold text-foreground">{loading ? "—" : m.leadsThisWeek}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Leads this month</p>
              <p className="mt-1 text-xl font-semibold text-foreground">{loading ? "—" : m.leadsThisMonth}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

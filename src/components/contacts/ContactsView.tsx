import { useEffect, useMemo, useState } from "react";
import { Search, AlertTriangle, Power, PowerOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useGymContext } from "@/hooks/useGymContext";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { displayName, displayDash } from "@/lib/displayHelpers";

type Contact = {
  user_id: string;
  conversation_id: string;
  name: string;
  phone: string | null;
  lead_status: string | null;
  bookings_count: number;
  last_message_at: string | null;
  escalation_reason: string | null;
  ai_paused: boolean;
};

const LEAD_PILL: Record<string, { bg: string; fg: string; emoji: string }> = {
  Hot: { bg: "#4C1D95", fg: "#DDD6FE", emoji: "🔥" },
  Warm: { bg: "#854F0B", fg: "#FAEEDA", emoji: "⚡" },
  Cold: { bg: "#0C447C", fg: "#B5D4F4", emoji: "🧊" },
};

function normalizeStatus(raw: string | null | undefined): "Hot" | "Warm" | "Cold" | null {
  if (!raw) return null;
  const s = raw.toLowerCase();
  if (s.includes("hot")) return "Hot";
  if (s.includes("warm")) return "Warm";
  if (s.includes("cold")) return "Cold";
  return null;
}

function timeAgo(iso: string | null) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} day${d === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString();
}

type Props = {
  onOpenConversation: (conversationId: string) => void;
};

export function ContactsView({ onOpenConversation }: Props) {
  const { businessId } = useGymContext();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"All" | "Hot" | "Warm" | "Cold">("All");

  useEffect(() => {
    if (!businessId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [convosRes, bookingsRes] = await Promise.all([
        (supabase as any)
          .from("contacts")
          .select("id, name, score, updated_at, escalation_reason, ai_paused")
          .eq("business_id", businessId)
          .order("updated_at", { ascending: false, nullsFirst: false }),
        (supabase as any).from("bookings").select("contact_id, phone, name").eq("business_id", businessId),
      ]);
      if (cancelled) return;

      const bookingPhone = new Map<string, string | null>();
      const bookingName = new Map<string, string | null>();
      const bookingCount = new Map<string, number>();
      (bookingsRes.data ?? []).forEach((b: any) => {
        bookingCount.set(b.contact_id, (bookingCount.get(b.contact_id) ?? 0) + 1);
        if (b.phone && !bookingPhone.has(b.contact_id)) bookingPhone.set(b.contact_id, b.phone);
        if (b.name && !bookingName.has(b.contact_id)) bookingName.set(b.contact_id, b.name);
      });

      const seen = new Set<string>();
      const list: Contact[] = [];
      (convosRes.data ?? []).forEach((c: any) => {
        if (seen.has(c.id)) return;
        seen.add(c.id);
        list.push({
          user_id: c.id,
          conversation_id: c.id,
          name: c.name || bookingName.get(c.id) || "",
          phone: bookingPhone.get(c.id) ?? null,
          lead_status: c.score ?? null,
          bookings_count: bookingCount.get(c.id) ?? 0,
          last_message_at: c.updated_at,
          escalation_reason: c.escalation_reason,
          ai_paused: !!c.ai_paused,
        });
      });

      setContacts(list);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [businessId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contacts.filter((c) => {
      if (q && !c.name.toLowerCase().includes(q)) return false;
      if (filter !== "All") {
        const norm = normalizeStatus(c.lead_status);
        if (norm !== filter) return false;
      }
      return true;
    });
  }, [contacts, search, filter]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name…"
            className="border-white/10 bg-white/[0.04] pl-9 text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {(["All", "Hot", "Warm", "Cold"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-xs font-medium transition-colors",
                filter === f
                  ? "border-primary/50 bg-primary/15 text-primary"
                  : "border-white/10 bg-white/[0.04] text-muted-foreground hover:text-foreground",
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="dashboard-panel min-h-0 flex-1 overflow-hidden p-0">
        <div className="h-full overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-card/90 backdrop-blur">
              <tr className="border-b border-white/[0.06] text-left text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Phone</th>
                <th className="px-5 py-3 font-medium">Lead Status</th>
                <th className="px-5 py-3 font-medium">Bookings</th>
                <th className="px-5 py-3 font-medium">Last Message</th>
                <th className="px-5 py-3 font-medium">Escalated</th>
                <th className="px-5 py-3 font-medium">AI Status</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-muted-foreground">
                    Loading contacts…
                  </td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-muted-foreground">
                    No contacts found.
                  </td>
                </tr>
              )}
              {!loading &&
                filtered.map((c) => {
                  const norm = normalizeStatus(c.lead_status);
                  const pill = norm ? LEAD_PILL[norm] : null;
                  return (
                    <tr
                      key={c.user_id}
                      onClick={() => onOpenConversation(c.conversation_id)}
                      className="cursor-pointer border-b border-white/[0.04] transition-colors hover:bg-white/[0.03]"
                    >
                      <td className="px-5 py-3 font-medium text-foreground">{displayName(c.name)}</td>
                      <td className="px-5 py-3 text-muted-foreground">{displayDash(c.phone)}</td>
                      <td className="px-5 py-3">
                        {pill ? (
                          <span
                            className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium"
                            style={{ backgroundColor: pill.bg, color: pill.fg }}
                          >
                            <span aria-hidden>{pill.emoji}</span>
                            {norm}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-foreground/90">{c.bookings_count}</td>
                      <td className="px-5 py-3 text-muted-foreground">{timeAgo(c.last_message_at)}</td>
                      <td className="px-5 py-3">
                        {c.escalation_reason ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                            <AlertTriangle className="h-3 w-3" />
                            Escalated
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 text-[11px] font-medium",
                            c.ai_paused ? "text-red-400" : "text-emerald-400",
                          )}
                          title={c.ai_paused ? "AI auto-reply paused" : "AI auto-reply active"}
                        >
                          {c.ai_paused ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                          {c.ai_paused ? "Paused" : "Active"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

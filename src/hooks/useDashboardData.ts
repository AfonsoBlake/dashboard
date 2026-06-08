import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useGymContext } from "./useGymContext";

export type BookingRow = Tables<"bookings">;
export type ConversationRow = Tables<"contacts">;
export type GymConfigRow = Tables<"business_configs">;
export type FollowUpRow = Tables<"follow_ups">;

export type ChatMessage = {
  role?: string;
  from?: "lead" | "team";
  content?: string;
  text?: string;
  type?: string;
  image_url?: string | null;
  timestamp?: string;
  time?: string;
};

type State<T> = { data: T; loading: boolean; error: string | null };

function useGymScopedTable<T>(
  loader: (businessId: string) => Promise<{ data: T | null; error: { message: string } | null }>,
) {
  const { businessId, loading: gymLoading, error: gymError } = useGymContext();
  const [state, setState] = useState<State<T | null>>({ data: null, loading: true, error: null });

  useEffect(() => {
    let cancelled = false;

    if (gymLoading) {
      setState(s => ({ ...s, loading: true }));
      return;
    }
    if (gymError) {
      setState({ data: null, loading: false, error: gymError });
      return;
    }
    if (!businessId) {
      // No business linked — return empty rather than error.
      setState({ data: null, loading: false, error: null });
      return;
    }

    setState(s => ({ ...s, loading: true, error: null }));
    loader(businessId).then(({ data, error }) => {
      if (cancelled) return;
      setState({ data: data ?? null, loading: false, error: error?.message ?? null });
    });

    return () => {
      cancelled = true;
    };
  }, [businessId, gymLoading, gymError]);

  return state;
}

export function useBookings() {
  return useGymScopedTable<BookingRow[]>(async (businessId) => {
    const { data, error } = await (supabase as any)
      .from("bookings")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false });
    return { data, error };
  });
}

export function useConversations() {
  return useGymScopedTable<ConversationRow[]>(async (businessId) => {
    const { data, error } = await (supabase as any)
      .from("contacts")
      .select("*")
      .eq("business_id", businessId)
      .order("updated_at", { ascending: false, nullsFirst: false });
    return { data, error };
  });
}

export function useFollowUps() {
  return useGymScopedTable<FollowUpRow[]>(async (businessId) => {
    const { data, error } = await (supabase as any)
      .from("follow_ups")
      .select("*")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false });
    return { data, error };
  });
}

export function useGymConfigs() {
  // business_configs.id is the businesses.config_id (text), not the businesses.id UUID.
  // We need to look it up via the business row.
  const { businessId, loading: gymLoading, error: gymError } = useGymContext();
  const [state, setState] = useState<State<GymConfigRow[] | null>>({ data: null, loading: true, error: null });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;

    if (gymLoading) {
      setState(s => ({ ...s, loading: true }));
      return;
    }
    if (gymError) {
      setState({ data: null, loading: false, error: gymError });
      return;
    }
    if (!businessId) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    setState(s => ({ ...s, loading: true, error: null }));
    (async () => {
      const { data: business, error: bizErr } = await supabase
        .from("businesses")
        .select("config_id")
        .eq("id", businessId)
        .maybeSingle();
      if (cancelled) return;
      if (bizErr) { setState({ data: null, loading: false, error: bizErr.message }); return; }
      if (!business?.config_id) { setState({ data: [], loading: false, error: null }); return; }
      const { data, error } = await supabase
        .from("business_configs")
        .select("*")
        .eq("id", business.config_id);
      if (cancelled) return;
      setState({ data: data ?? null, loading: false, error: error?.message ?? null });
    })();

    return () => { cancelled = true; };
  }, [businessId, gymLoading, gymError, tick]);

  const refetch = useCallback(() => setTick(t => t + 1), []);

  return { ...state, refetch };
}

/* --------- Aggregations --------- */

export function useDashboardMetrics() {
  const bookingsState = useBookings();

  const metrics = useMemo(() => {
    const bookings = bookingsState.data ?? [];

    const totalLeads = new Set(bookings.map(b => b.contact_id)).size;

    const converted = bookings.filter(
      b => (b.status ?? "").toLowerCase() === "converted",
    ).length;

    const trialsBooked = bookings.length;
    const conversionRate = totalLeads > 0 ? Math.round((converted / totalLeads) * 100) : 0;

    return {
      totalLeads,
      conversionRate,
      converted,
      trialsBooked,
    };
  }, [bookingsState.data]);

  return { metrics, loading: bookingsState.loading };
}

export function useLeadSourceBreakdown() {
  const { data, loading } = useBookings();

  const breakdown = useMemo(() => {
    const rows = data ?? [];
    if (!rows.length) return [] as { name: string; value: number; color: string }[];

    const counts = new Map<string, number>();
    rows.forEach(r => {
      const src = (r.source ?? "Unknown").toString();
      const label = src.charAt(0).toUpperCase() + src.slice(1);
      counts.set(label, (counts.get(label) ?? 0) + 1);
    });

    const total = rows.length;
    const palette = ["hsl(36 94% 56%)", "hsl(22 100% 58%)", "hsl(14 100% 56%)", "hsl(200 80% 55%)"];

    return [...counts.entries()].map(([name, count], i) => ({
      name,
      value: Math.round((count / total) * 100),
      color: palette[i % palette.length],
    }));
  }, [data]);

  return { breakdown, loading };
}

export function useBookingsByDay() {
  const { data, loading } = useBookings();

  const byDay = useMemo(() => {
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const counts = new Map<string, number>(days.map(d => [d, 0]));
    (data ?? []).forEach(b => {
      if (!b.booking_date) return;
      const day = new Date(b.booking_date).toLocaleDateString("en-US", { weekday: "short" });
      const key = days.find(d => d.toLowerCase() === day.toLowerCase());
      if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return days.map(label => ({ label, value: counts.get(label) ?? 0 }));
  }, [data]);

  return { byDay, loading };
}

export function useLeadMomentum() {
  const bookingsState = useBookings();

  const series = useMemo(() => {
    const bookings = bookingsState.data ?? [];

    // Last 30 days bucketed every ~2 days
    const today = new Date();
    const buckets: { day: string; date: Date; leads: number; bookings: number }[] = [];
    for (let i = 30; i >= 0; i -= 2) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      buckets.push({
        day: d.toLocaleDateString("en-US", { day: "numeric", month: "short" }),
        date: d,
        leads: 0,
        bookings: 0,
      });
    }

    const bucketIndex = (ts: string | null) => {
      if (!ts) return -1;
      const t = new Date(ts).getTime();
      for (let i = buckets.length - 1; i >= 0; i--) {
        if (t >= buckets[i].date.getTime()) return i;
      }
      return -1;
    };

    bookings.forEach(b => {
      const i = bucketIndex(b.created_at);
      if (i >= 0) buckets[i].bookings += 1;
    });

    return buckets.map(({ day, leads, bookings }) => ({ day, leads, bookings }));
  }, [bookingsState.data]);

  return { series, loading: bookingsState.loading };
}

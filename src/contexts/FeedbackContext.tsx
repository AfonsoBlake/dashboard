import { createContext, useContext, useEffect, useRef, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useGymContext } from "@/hooks/useGymContext";
import { toast } from "sonner";

type FeedbackRow = {
  id: string;
  business_id: string;
  contact_id: string;
  contact_name: string | null;
  message: string;
  platform: string | null;
  created_at: string;
  status: string;
  ai_reply: string | null;
};

type FeedbackContextValue = {
  unreadCount: number;
  setUnreadCount: (n: number) => void;
  isOnFeedbackPage: boolean;
  setIsOnFeedbackPage: (v: boolean) => void;
  onNewFeedback: (cb: (row: FeedbackRow) => void) => () => void;
};

const Ctx = createContext<FeedbackContextValue>({
  unreadCount: 0,
  setUnreadCount: () => {},
  isOnFeedbackPage: false,
  setIsOnFeedbackPage: () => {},
  onNewFeedback: () => () => {},
});

export const FeedbackProvider = ({ children }: { children: ReactNode }) => {
  const { businessId } = useGymContext();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOnFeedbackPage, setIsOnFeedbackPage] = useState(false);
  const onPageRef = useRef(false);
  const listenersRef = useRef<Set<(row: FeedbackRow) => void>>(new Set());

  useEffect(() => { onPageRef.current = isOnFeedbackPage; }, [isOnFeedbackPage]);

  // Initial unread count
  useEffect(() => {
    if (!businessId) return;
    (async () => {
      const { count } = await supabase
        .from("feedback")
        .select("id", { count: "exact", head: true })
        .eq("business_id", String(businessId))
        .eq("status", "unread");
      setUnreadCount(count ?? 0);
    })();
  }, [businessId]);

  // Realtime subscription
  useEffect(() => {
    if (!businessId) return;
    const channel = supabase
      .channel(`feedback_${businessId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "feedback", filter: `business_id=eq.${businessId}` },
        (payload) => {
          const row = payload.new as FeedbackRow;
          listenersRef.current.forEach((cb) => cb(row));

          if (onPageRef.current) {
            // Mark as read immediately if user is on feedback page
            supabase.from("feedback").update({ status: "read" }).eq("id", row.id).then();
          } else {
            if (row.status === "unread") {
              setUnreadCount((c) => c + 1);
              toast(`New feedback from ${row.contact_name ?? "Unknown"}`);
            }
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [businessId]);

  const onNewFeedback = useCallback((cb: (row: FeedbackRow) => void) => {
    listenersRef.current.add(cb);
    return () => { listenersRef.current.delete(cb); };
  }, []);

  return (
    <Ctx.Provider value={{ unreadCount, setUnreadCount, isOnFeedbackPage, setIsOnFeedbackPage, onNewFeedback }}>
      {children}
    </Ctx.Provider>
  );
};

export const useFeedback = () => useContext(Ctx);
export type { FeedbackRow };

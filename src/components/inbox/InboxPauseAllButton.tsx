import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useGymContext } from "@/hooks/useGymContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
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

export function InboxPauseAllButton() {
  const { gymId } = useGymContext();
  const [total, setTotal] = useState(0);
  const [pausedCount, setPausedCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const refresh = useCallback(async () => {
    if (!gymId) return;
    const { data, error } = await (supabase as any)
      .from("contacts")
      .select("ai_paused")
      .eq("business_id", gymId);
    if (error || !data) return;
    setTotal(data.length);
    setPausedCount(
      data.filter((r: { ai_paused: boolean | null }) => r.ai_paused === true).length,
    );
  }, [gymId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!gymId) return;
    const channel = supabase
      .channel(`inbox-pauseall-${gymId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "contacts", filter: `business_id=eq.${gymId}` },
        () => refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [gymId, refresh]);

  const allPaused = total > 0 && pausedCount === total;

  async function setAll(paused: boolean) {
    if (!gymId) return;
    setBusy(true);
    const payload: { ai_paused: boolean; ai_paused_at: string | null } = {
      ai_paused: paused,
      ai_paused_at: paused ? new Date().toISOString() : null,
    };
    const { error } = await (supabase as any)
      .from("contacts")
      .update(payload)
      .eq("business_id", gymId);
    setBusy(false);
    setDialogOpen(false);
    if (error) {
      toast.error(`Bulk update failed: ${error.message}`);
      return;
    }
    toast.success(paused ? "AI paused for all conversations" : "AI resumed for all conversations");
    refresh();
  }

  return (
    <>
      <button
        type="button"
        disabled={total === 0 || busy}
        onClick={() => {
          if (allPaused) setAll(false);
          else setDialogOpen(true);
        }}
        className={cn(
          "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold uppercase tracking-wider text-white transition-colors disabled:opacity-50",
          allPaused ? "bg-zinc-500 hover:bg-zinc-400" : "bg-red-600 hover:bg-red-500",
        )}
        title={allPaused ? "All conversations paused — click to resume" : "Pause AI for all conversations"}
      >
        {allPaused && (
          <span aria-hidden className="h-2 w-2 rounded-full bg-white/90 ring-2 ring-white/30" />
        )}
        Pause All
      </button>
      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pause AI for all conversations?</AlertDialogTitle>
            <AlertDialogDescription>
              This will pause AI auto-replies for all {total} conversations in this gym. Replies
              will be manual only until you resume.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                setAll(true);
              }}
              className="bg-red-600 hover:bg-red-500"
            >
              {busy ? "Working…" : "Pause All"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

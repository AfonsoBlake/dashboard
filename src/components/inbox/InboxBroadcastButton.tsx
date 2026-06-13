import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useGymContext } from "@/hooks/useGymContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Megaphone } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const BETTER_ZAP_URL = "https://ldkrxbpoixookrwmdufk.supabase.co";
const BETTER_ZAP_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxka3J4YnBvaXhvb2tyd21kdWZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxMzU5NzQsImV4cCI6MjA4ODcxMTk3NH0.ED2WltgKqUfl149-EwW34vsGgNSn7l1jC7b16Pw68Ow";

type FilterKey = "all" | "hot" | "warm" | "cold" | "booked";

type Convo = { id: string; score: string | null; conversation_tag: string | null };

const FILTER_LABEL: Record<FilterKey, string> = {
  all: "All Contacts",
  hot: "Hot Leads only",
  warm: "Warm Leads only",
  cold: "Cold Leads only",
  booked: "Booked contacts only",
};

function matches(c: Convo, f: FilterKey): boolean {
  const ls = (c.score ?? "").toLowerCase();
  const tag = (c.conversation_tag ?? "").toLowerCase();
  switch (f) {
    case "all":
      return true;
    case "hot":
      return ls === "hot";
    case "warm":
      return ls === "warm";
    case "cold":
      return ls === "cold";
    case "booked":
      return ls === "booked" || tag === "booked";
  }
}

export function InboxBroadcastButton() {
  const { businessId } = useGymContext();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [convos, setConvos] = useState<Convo[]>([]);
  const [sending, setSending] = useState(false);

  const refresh = useCallback(async () => {
    if (!businessId) return;
    const { data, error } = await (supabase as any)
      .from("contacts")
      .select("id, score, conversation_tag")
      .eq("business_id", businessId);
    if (error || !data) return;
    setConvos(data as Convo[]);
  }, [businessId]);

  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  const targets = useMemo(() => convos.filter((c) => matches(c, filter)), [convos, filter]);
  const count = targets.length;

  async function handleSend() {
    const text = message.trim();
    if (!text) {
      toast.error("Please enter a message");
      return;
    }
    if (count === 0) {
      toast.error("No contacts match this filter");
      return;
    }
    setSending(true);
    let ok = 0;
    let fail = 0;
    for (const c of targets) {
      try {
        const res = await fetch(`${BETTER_ZAP_URL}/functions/v1/send-manual-reply`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${BETTER_ZAP_ANON}`,
            apikey: BETTER_ZAP_ANON,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ contact_id: c.id, business_id: businessId, message: text }),
        });
        if (res.ok) ok++;
        else fail++;
      } catch {
        fail++;
      }
    }
    setSending(false);
    if (fail === 0) {
      toast.success(`Broadcast sent to ${ok} contact${ok === 1 ? "" : "s"}`);
      setOpen(false);
      setMessage("");
    } else {
      toast.error(`Sent ${ok}, failed ${fail}`);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold uppercase tracking-wider text-foreground/90 transition-colors hover:bg-white/10",
        )}
        title="Broadcast a message to multiple contacts"
      >
        <Megaphone className="h-4 w-4" />
        Broadcast
      </button>
      <Dialog open={open} onOpenChange={(v) => !sending && setOpen(v)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Broadcast message</DialogTitle>
            <DialogDescription>
              Send a manual message to a group of contacts via ManyChat.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-muted-foreground">
                Message
              </label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write your broadcast message…"
                rows={5}
                disabled={sending}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-muted-foreground">
                Send to
              </label>
              <Select
                value={filter}
                onValueChange={(v) => setFilter(v as FilterKey)}
                disabled={sending}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(FILTER_LABEL) as FilterKey[]).map((k) => (
                    <SelectItem key={k} value={k}>
                      {FILTER_LABEL[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={sending}
              className="rounded-full border border-white/15 bg-transparent px-4 py-2 text-sm font-medium text-foreground/80 hover:bg-white/5 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={sending || count === 0 || !message.trim()}
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold uppercase tracking-wider text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {sending ? "Sending…" : `Send to ${count} contact${count === 1 ? "" : "s"}`}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

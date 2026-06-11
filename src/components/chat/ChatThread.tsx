import { Fragment } from "react";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/hooks/useDashboardData";

type ChatThreadProps = {
  messages: ChatMessage[];
  emptyText?: string;
  className?: string;
  endRef?: React.RefObject<HTMLDivElement>;
};

function isFromTeam(m: ChatMessage): boolean {
  const role = (m.role ?? "").toLowerCase();
  return role === "staff" || role === "assistant" || role === "team" || m.from === "team";
}

function teamLabel(m: ChatMessage): string {
  const role = (m.role ?? "").toLowerCase();
  if (role === "staff") return "Staff";
  if (role === "assistant") return "Bot";
  return "Bot";
}

function formatTime(ts: string | undefined | null): string {
  if (!ts) return "";
  return new Date(ts).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function dayKey(ts: string | undefined | null): string {
  if (!ts) return "unknown";
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function dayLabel(ts: string | undefined | null): string {
  if (!ts) return "";
  const d = new Date(ts);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  if (target.getTime() === today.getTime()) return "Today";
  if (target.getTime() === yesterday.getTime()) return "Yesterday";
  return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

export function ChatThread({ messages, emptyText = "No messages yet.", className, endRef }: ChatThreadProps) {
  if (messages.length === 0) {
    return <p className={cn("text-sm text-muted-foreground", className)}>{emptyText}</p>;
  }

  let lastDay = "";

  return (
    <div className={cn("flex flex-col", className)}>
      {messages.map((m, i) => {
        const ts = m.timestamp ?? null;
        const k = dayKey(ts);
        const showDivider = ts && k !== lastDay;
        if (ts) lastDay = k;
        const fromTeam = isFromTeam(m);
        const text = m.content ?? m.text ?? "";

        return (
          <Fragment key={i}>
            {showDivider && (
              <div className="my-3 flex items-center gap-3 px-1">
                <div className="h-px flex-1 bg-white/[0.08]" />
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  {dayLabel(ts)}
                </span>
                <div className="h-px flex-1 bg-white/[0.08]" />
              </div>
            )}
            <div
              className={cn(
                "mb-4 flex flex-col",
                fromTeam ? "items-end" : "items-start",
              )}
            >
              <div
                className={cn(
                  "max-w-[75%] text-sm leading-6",
                  fromTeam
                    ? "bg-gradient-fire text-primary-foreground rounded-[12px] rounded-br-[4px] px-4 py-3"
                    : "text-foreground rounded-[12px] rounded-bl-[4px] px-4 py-3 border border-white/[0.06]",
                )}
                style={fromTeam ? undefined : { backgroundColor: "#1e2030" }}
              >
                {text}
              </div>
              <div className="mt-1 flex items-center gap-2 px-1">
                {fromTeam && (
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {teamLabel(m)}
                  </span>
                )}
                <span className="text-[11px] text-muted-foreground">{formatTime(ts)}</span>
              </div>
            </div>
          </Fragment>
        );
      })}
      {endRef && <div ref={endRef} />}
    </div>
  );
}

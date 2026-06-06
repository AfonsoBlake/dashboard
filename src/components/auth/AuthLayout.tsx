import { ReactNode } from "react";
import { Dumbbell } from "lucide-react";

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  showRestrictedNotice?: boolean;
}

export const AuthLayout = ({
  title,
  subtitle,
  children,
  footer,
  showRestrictedNotice = true,
}: AuthLayoutProps) => {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0b0510] text-foreground">
      {/* Gradient backdrop: purple → orange */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(60% 50% at 15% 20%, hsl(280 70% 30% / 0.85) 0%, transparent 60%), radial-gradient(55% 50% at 85% 25%, hsl(28 95% 50% / 0.75) 0%, transparent 60%), radial-gradient(80% 60% at 50% 100%, hsl(18 95% 52% / 0.85) 0%, transparent 65%), linear-gradient(180deg, #1a0a1f 0%, #2a0d18 60%, #4a1a0a 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-40 mix-blend-overlay"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.08) 0%, transparent 40%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.05) 0%, transparent 40%)",
        }}
      />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-10">
        {/* Brand */}
        <div className="mb-8 flex items-center gap-3">
          <Dumbbell className="h-6 w-6 text-white" strokeWidth={2.5} />
          <span className="font-display text-xl font-bold uppercase tracking-[0.2em] text-white">
            Fluario
          </span>
        </div>

        {/* Glass card */}
        <div
          className="w-full max-w-3xl rounded-2xl border border-white/10 px-8 py-10 shadow-[0_30px_80px_rgba(0,0,0,0.45)] md:px-12 md:py-12"
          style={{
            background:
              "linear-gradient(180deg, rgba(20,10,25,0.55) 0%, rgba(40,15,20,0.55) 100%)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
          }}
        >
          <div className="mb-8 text-center">
            <h1 className="font-display text-2xl font-bold uppercase tracking-[0.18em] text-white md:text-3xl">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-3 text-sm text-white/70 md:text-base">{subtitle}</p>
            )}
          </div>

          {children}

          {footer && <div className="mt-6 text-center text-sm text-white/80">{footer}</div>}
        </div>

        {showRestrictedNotice && (
          <div className="mt-6 flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-4 py-2 text-xs text-white/80 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Access restricted to authorised accounts only
          </div>
        )}
      </div>
    </div>
  );
};

export const AuthLabel = ({ children }: { children: ReactNode }) => (
  <label className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-white">
    {children}
  </label>
);

export const AuthInput = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    {...props}
    className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3.5 text-base text-white placeholder:text-white/40 outline-none transition focus:border-primary/60 focus:bg-white/10 focus:ring-2 focus:ring-primary/30"
  />
);

export const AuthButton = ({
  children,
  loading,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) => (
  <button
    {...props}
    disabled={loading || props.disabled}
    className="w-full rounded-xl bg-gradient-to-r from-[#ff3d00] via-[#ff6a00] to-[#ffa500] px-6 py-4 text-sm font-bold uppercase tracking-[0.15em] text-white shadow-[0_10px_30px_rgba(255,80,0,0.35)] transition hover:brightness-110 active:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
  >
    {loading ? "Please wait…" : children}
  </button>
);

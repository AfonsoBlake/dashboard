import { ReactNode } from "react";
import fluarioLogo from "@/assets/fluario-logo-mark.png";

interface AuthShellProps {
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

export const Brand = () => (
  <div className="mb-2 flex items-center justify-center">
    <img
      src={fluarioLogo}
      alt="Fluario"
      style={{ height: 80, width: "auto", objectFit: "contain", mixBlendMode: "screen" }}
    />
  </div>
);

export const AuthShell = ({ title, children, footer }: AuthShellProps) => {
  return (
    <div
      className="relative min-h-screen w-full overflow-hidden"
      style={{ background: "#1E1B4B" }}
    >
      <style>{`
        @keyframes float1 { 
          from { transform: translate(0px, 0px) scale(1); }
          to { transform: translate(80px, 60px) scale(1.1); } 
        }
        @keyframes float2 { 
          from { transform: translate(0px, 0px) scale(1); }
          to { transform: translate(-70px, 80px) scale(0.95); } 
        }
        @keyframes float3 { 
          from { transform: translate(0px, 0px) scale(1); }
          to { transform: translate(50px, -60px) scale(1.05); } 
        }
      `}</style>

      {/* Aurora orbs */}
      <div
        className="pointer-events-none absolute"
        style={{
          top: "-100px", left: "-100px", width: 700, height: 700,
          borderRadius: "50%", background: "#6B6FD4", opacity: 0.6,
          filter: "blur(80px)", animation: "float1 8s ease-in-out infinite alternate",
        }}
      />
      <div
        className="pointer-events-none absolute"
        style={{
          bottom: "-50px", right: "-50px", width: 500, height: 500,
          borderRadius: "50%", background: "#C4B8F0", opacity: 0.5,
          filter: "blur(90px)", animation: "float2 10s ease-in-out infinite alternate",
        }}
      />
      <div
        className="pointer-events-none absolute"
        style={{
          top: "30%", left: "30%", width: 600, height: 600,
          borderRadius: "50%", background: "#3B3A8A", opacity: 0.7,
          filter: "blur(70px)", animation: "float3 12s ease-in-out infinite alternate",
        }}
      />
      <div
        className="pointer-events-none absolute"
        style={{
          top: "10%", right: "20%", width: 300, height: 300,
          borderRadius: "50%", background: "#C4B8F0", opacity: 0.4,
          filter: "blur(60px)", animation: "float1 9s ease-in-out infinite alternate-reverse",
        }}
      />
      <div
        className="pointer-events-none absolute"
        style={{
          bottom: "20%", left: "10%", width: 400, height: 400,
          borderRadius: "50%", background: "#6B6FD4", opacity: 0.5,
          filter: "blur(85px)", animation: "float2 11s ease-in-out infinite alternate-reverse",
        }}
      />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 gap-7 py-10">
        <div className="animate-fade-down">
          <Brand />
        </div>

        <div
          className="w-full max-w-[400px] mx-auto flex flex-col animate-fade-up delay-80"
          style={{
            backgroundColor: "rgba(30, 27, 75, 0.5)",
            padding: "40px",
            borderRadius: 16,
            border: "1px solid rgba(196, 184, 240, 0.15)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
          }}
        >
          <h1
            className="mb-6 text-white font-black uppercase text-center"
            style={{ fontSize: 22, letterSpacing: "2px" }}
          >
            {title}
          </h1>
          {children}
          {footer && (
            <div className="mt-6 text-center text-sm text-white/80">{footer}</div>
          )}
        </div>

        <div
          className="flex animate-fade-up delay-180 items-center gap-2 rounded-full px-4 py-2"
          style={{
            background: "rgba(0,0,0,0.35)",
            border: "1px solid rgba(255,255,255,0.1)",
            fontSize: 11,
            letterSpacing: "1px",
            color: "rgba(255,255,255,0.85)",
            textTransform: "uppercase",
          }}
        >
          <span
            className="pulse-dot inline-block h-2 w-2 rounded-full"
            style={{ background: "#7C3AED" }}
          />
          Access restricted to authorised accounts only
        </div>
      </div>
    </div>
  );
};

export const FieldLabel = ({ children }: { children: ReactNode }) => (
  <label
    className="mb-2 block text-white"
    style={{ fontSize: 11, letterSpacing: "1.5px", fontWeight: 700, textTransform: "uppercase" }}
  >
    {children}
  </label>
);

export const FieldInput = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    {...props}
    className="w-full rounded-lg px-4 py-3 text-white outline-none transition placeholder:text-white/45 focus:border-white/60"
    style={{
      background: "rgba(255,255,255,0.06)",
      border: "1px solid rgba(255,255,255,0.15)",
      fontSize: 14,
    }}
  />
);

export const PrimaryButton = ({
  children,
  loading,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) => (
  <button
    {...props}
    disabled={loading || props.disabled}
    className="w-full rounded-lg text-white transition active:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
    style={{
      padding: "14px 18px",
      background: "#7C3AED",
      fontSize: 12,
      fontWeight: 700,
      letterSpacing: "2.5px",
      textTransform: "uppercase",
      boxShadow: "0 10px 30px rgba(124,58,237,0.3)",
    }}
    onMouseEnter={(e) => (e.currentTarget.style.background = "#6D28D9")}
    onMouseLeave={(e) => (e.currentTarget.style.background = "#7C3AED")}
  >
    {loading ? "Please wait…" : children}
  </button>
);

export const FieldError = ({ children }: { children: ReactNode }) =>
  children ? (
    <p className="mt-1 text-xs" style={{ color: "#fca5a5" }}>
      {children}
    </p>
  ) : null;

export const FieldHelper = ({ children }: { children: ReactNode }) => (
  <p className="mt-1 text-xs text-white/60">{children}</p>
);

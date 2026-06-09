import { useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import fluarioLogo from "@/assets/fluario-logo-mark.png";
import {
  FieldLabel,
  FieldInput,
  PrimaryButton,
  FieldError,
} from "@/components/auth/AuthShell";

type Step = "entry" | "invite-form";

const KeyIcon = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#A78BFA" }}>
    <circle cx="7.5" cy="15.5" r="5.5" />
    <path d="m21 2-9.6 9.6" />
    <path d="m15.5 7.5 3 3L22 7l-3-3" />
  </svg>
);

const BuildingIcon = () => (
  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "rgba(167,139,250,0.4)" }}>
    <rect x="3" y="9" width="18" height="13" />
    <path d="M8 22v-9" />
    <path d="M16 22v-9" />
    <path d="m2 9 10-7 10 7" />
  </svg>
);

const Orbs = () => (
  <>
    <style>{`
      @keyframes float1 { from { transform: translate(0px,0px) scale(1); } to { transform: translate(80px,60px) scale(1.1); } }
      @keyframes float2 { from { transform: translate(0px,0px) scale(1); } to { transform: translate(-70px,80px) scale(0.95); } }
      @keyframes float3 { from { transform: translate(0px,0px) scale(1); } to { transform: translate(50px,-60px) scale(1.05); } }
    `}</style>
    <div className="pointer-events-none absolute" style={{ top: "-100px", left: "-100px", width: 700, height: 700, borderRadius: "50%", background: "#6B6FD4", opacity: 0.6, filter: "blur(80px)", animation: "float1 8s ease-in-out infinite alternate" }} />
    <div className="pointer-events-none absolute" style={{ bottom: "-50px", right: "-50px", width: 500, height: 500, borderRadius: "50%", background: "#C4B8F0", opacity: 0.5, filter: "blur(90px)", animation: "float2 10s ease-in-out infinite alternate" }} />
    <div className="pointer-events-none absolute" style={{ top: "30%", left: "30%", width: 600, height: 600, borderRadius: "50%", background: "#3B3A8A", opacity: 0.7, filter: "blur(70px)", animation: "float3 12s ease-in-out infinite alternate" }} />
    <div className="pointer-events-none absolute" style={{ top: "10%", right: "20%", width: 300, height: 300, borderRadius: "50%", background: "#C4B8F0", opacity: 0.4, filter: "blur(60px)", animation: "float1 9s ease-in-out infinite alternate-reverse" }} />
    <div className="pointer-events-none absolute" style={{ bottom: "20%", left: "10%", width: 400, height: 400, borderRadius: "50%", background: "#6B6FD4", opacity: 0.5, filter: "blur(85px)", animation: "float2 11s ease-in-out infinite alternate-reverse" }} />
  </>
);

const SignupPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("entry");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!inviteCode.trim()) {
      setError("Invite code is required.");
      return;
    }
    if (!fullName.trim() || !email.trim() || !password) {
      setError("All fields must be filled.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    const { data, error: rpcErr } = await supabase.rpc('validate_invite_code', { code: inviteCode.trim().toUpperCase() });

    if (rpcErr || !data?.[0]?.valid) {
      setLoading(false);
      setError("Invalid invite code. Check with your manager or leave blank.");
      return;
    }

    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          invite_code: inviteCode.trim().toUpperCase(),
          full_name: fullName.trim(),
        },
      },
    });

    if (signUpError) {
      setLoading(false);
      setError(signUpError.message);
      return;
    }

    await new Promise((r) => setTimeout(r, 500));

    const userId = authData.user?.id;
    if (!userId) {
      setLoading(false);
      navigate("/pending-verification", { replace: true });
      return;
    }

    const { data: prof } = await supabase
      .from("profiles")
      .select("approval_status")
      .eq("id", userId)
      .maybeSingle();

    setLoading(false);
    if (prof?.approval_status === "approved") navigate("/dashboard", { replace: true });
    else navigate("/pending-verification", { replace: true });
  };

  const cardBase: React.CSSProperties = {
    background: "rgba(30, 27, 75, 0.5)",
    border: "1px solid rgba(196, 184, 240, 0.15)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    borderRadius: 16,
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden" style={{ background: "#1E1B4B" }}>
      <Orbs />

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 gap-7 py-10">
        <div className="animate-fade-down mb-2 flex items-center justify-center">
          <img src={fluarioLogo} alt="Fluario" style={{ height: 80, width: "auto", objectFit: "contain", mixBlendMode: "screen" }} />
        </div>

        {step === "entry" ? (
          <div className="w-full max-w-[560px] mx-auto animate-fade-up">
            <h1 className="mb-8 text-white font-black uppercase text-center" style={{ fontSize: 22, letterSpacing: "2px" }}>
              GET STARTED
            </h1>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setStep("invite-form")}
                className="flex flex-col items-center justify-center text-center p-8 transition-all active:scale-95"
                style={{ ...cardBase, cursor: "pointer" }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "rgba(167,139,250,0.4)")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(196,184,240,0.15)")}
              >
                <div className="mb-4">
                  <KeyIcon />
                </div>
                <div className="text-white font-bold text-sm mb-2">I have an invite code</div>
                <div className="text-white/60 text-xs">Join an existing workspace</div>
              </button>

              <div
                className="flex flex-col items-center justify-center text-center p-8 cursor-not-allowed select-none"
                style={{ ...cardBase, background: "rgba(30, 27, 75, 0.25)", borderColor: "rgba(196,184,240,0.07)", opacity: 0.55 }}
              >
                <div className="mb-4">
                  <BuildingIcon />
                </div>
                <div className="text-white font-bold text-sm mb-2">Create a new workspace</div>
                <div className="text-white/60 text-xs mb-3">Set up Fluario for your business</div>
                <span
                  className="text-xs font-bold uppercase px-3 py-1 rounded-full"
                  style={{ background: "rgba(124,58,237,0.25)", color: "#C4B8F0", letterSpacing: "1.5px" }}
                >
                  Coming soon
                </span>
              </div>
            </div>

            <div className="mt-6 text-center text-sm text-white/80">
              Already have access?{" "}
              <Link to="/login" className="font-bold hover:opacity-80" style={{ color: "#A78BFA" }}>
                Sign in
              </Link>
            </div>
          </div>
        ) : (
          <div
            className="w-full max-w-[400px] mx-auto flex flex-col animate-fade-up"
            style={{ ...cardBase, padding: "40px" }}
          >
            <button
              onClick={() => { setStep("entry"); setError(null); }}
              className="mb-5 flex items-center gap-1 text-xs text-white/50 hover:text-white/80 transition self-start"
            >
              &larr; Back
            </button>
            <h1 className="mb-6 text-white font-black uppercase text-center" style={{ fontSize: 22, letterSpacing: "2px" }}>
              JOIN A WORKSPACE
            </h1>
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <FieldLabel>Invite Code</FieldLabel>
                <FieldInput
                  type="text"
                  placeholder="FLR-XXXX"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  autoComplete="off"
                  required
                />
              </div>
              <div>
                <FieldLabel>Full Name</FieldLabel>
                <FieldInput
                  type="text"
                  placeholder="Jane Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                  required
                />
              </div>
              <div>
                <FieldLabel>Email Address</FieldLabel>
                <FieldInput
                  type="email"
                  placeholder="you@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
              <div>
                <FieldLabel>Password</FieldLabel>
                <FieldInput
                  type="password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>
              <FieldError>{error}</FieldError>
              <PrimaryButton type="submit" loading={loading}>
                Create Account
              </PrimaryButton>
            </form>

            <div className="mt-6 text-center text-sm text-white/80">
              Already have access?{" "}
              <Link to="/login" className="font-bold hover:opacity-80" style={{ color: "#A78BFA" }}>
                Sign in
              </Link>
            </div>
          </div>
        )}

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
          <span className="pulse-dot inline-block h-2 w-2 rounded-full" style={{ background: "#7C3AED" }} />
          Access restricted to authorised accounts only
        </div>
      </div>
    </div>
  );
};

export default SignupPage;

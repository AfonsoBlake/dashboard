import { useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  AuthShell,
  FieldLabel,
  FieldInput,
  PrimaryButton,
  FieldError,
  FieldHelper,
} from "@/components/auth/AuthShell";

type Step = "entry" | "invite";

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

    if (!fullName.trim() || !email.trim() || !password || !inviteCode.trim()) {
      setError("All required fields must be filled.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.rpc('validate_invite_code', { code: inviteCode.trim().toUpperCase() });

    if (error || !data?.[0]?.valid) {
      setLoading(false);
      setError("Invalid invite code. Check with your manager or leave blank.");
      return;
    }

    const { error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: {
          invite_code: inviteCode.trim().toUpperCase(),
          full_name: fullName.trim(),
        },
      },
    });

    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    navigate("/", { replace: true });
  };

  const sharedFooter = (
    <div>
      Already have access?{" "}
      <Link to="/login" className="font-bold hover:opacity-80" style={{ color: "#A78BFA" }}>
        Sign in
      </Link>
    </div>
  );

  if (step === "entry") {
    return (
      <AuthShell title="GET STARTED" footer={sharedFooter}>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setStep("invite")}
            className="flex-1 rounded-xl p-4 text-left transition active:scale-[0.98]"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(196, 184, 240, 0.25)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.09)";
              (e.currentTarget as HTMLButtonElement).style.border = "1px solid rgba(196,184,240,0.5)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.05)";
              (e.currentTarget as HTMLButtonElement).style.border = "1px solid rgba(196,184,240,0.25)";
            }}
          >
            <div className="mb-2 text-xl">🔑</div>
            <div className="text-sm font-bold text-white">I have an invite code</div>
            <div className="mt-1 text-xs text-white/55">Join an existing workspace</div>
          </button>

          <div
            className="flex-1 cursor-not-allowed rounded-xl p-4 text-left opacity-45"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            <div className="mb-2 text-xl">🏢</div>
            <div className="text-sm font-bold text-white">Create a new workspace</div>
            <div className="mt-1 text-xs text-white/55">Set up Fluario for your business</div>
            <div
              className="mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
              style={{ background: "rgba(124,58,237,0.25)", color: "#A78BFA" }}
            >
              Coming soon
            </div>
          </div>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="CREATE ACCOUNT" footer={sharedFooter}>
      <form onSubmit={onSubmit} className="space-y-4">
        <button
          type="button"
          onClick={() => { setStep("entry"); setError(null); }}
          className="flex items-center gap-1 text-xs text-white/55 transition hover:text-white/90"
        >
          ← Back
        </button>
        <div>
          <FieldLabel>Invite Code</FieldLabel>
          <FieldInput
            type="text"
            placeholder="FLR-59DA"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            required
          />
          <FieldHelper>Enter the code from your manager.</FieldHelper>
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
    </AuthShell>
  );
};

export default SignupPage;

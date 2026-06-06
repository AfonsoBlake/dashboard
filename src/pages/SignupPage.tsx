import { useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { industryCategories, industries } from "@/config/industries";
import { cn } from "@/lib/utils";
import {
  AuthShell,
  FieldLabel,
  FieldInput,
  PrimaryButton,
  FieldError,
  FieldHelper,
} from "@/components/auth/AuthShell";

const SignupPage = () => {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [industryId, setIndustryId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim() || !email.trim() || !password || !industryId) {
      setError("All required fields must be filled.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    const trimmedCode = inviteCode.trim();
    setLoading(true);

    if (trimmedCode) {
      const { data: v, error: rpcErr } = await supabase.rpc("validate_invite_code", {
        code: trimmedCode,
      });
      if (rpcErr || !v?.[0]?.valid) {
        setLoading(false);
        setError("Invalid invite code. Check with your gym admin or leave blank.");
        return;
      }
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/login`,
        data: {
          full_name: fullName.trim(),
          invite_code: trimmedCode || null,
          industry_id: industryId,
        },
      },
    });

    if (signUpError) {
      setLoading(false);
      setError(signUpError.message);
      return;
    }

    await new Promise((r) => setTimeout(r, 500));

    const userId = data.user?.id;
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

  return (
    <AuthShell
      title="CREATE ACCOUNT"
      footer={
        <div>
          Already have access?{" "}
          <Link to="/login" className="font-bold hover:opacity-80" style={{ color: "#A78BFA" }}>
            Sign in
          </Link>
        </div>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
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
        <div>
          <FieldLabel>What type of business are you?</FieldLabel>
          <select
            value={industryId}
            onChange={(e) => setIndustryId(e.target.value)}
            required
            className="flex h-10 w-full items-center justify-between rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="" disabled className="text-black">Select an industry...</option>
            {industryCategories.map(cat => (
              <optgroup key={cat.id} label={`${cat.icon} ${cat.name}`} className="text-black">
                {cat.niches.map(nicheId => {
                  const niche = industries.find(i => i.id === nicheId);
                  if (!niche) return null;
                  return <option key={niche.id} value={niche.id} className="text-black">{niche.name}</option>;
                })}
                {cat.id === "other" && (
                  <option value="other" className="text-black">Other (Custom)</option>
                )}
              </optgroup>
            ))}
          </select>
        </div>
        <div>
          <FieldLabel>Invite Code (optional)</FieldLabel>
          <FieldInput
            type="text"
            placeholder="ABC12345"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
          />
          <FieldHelper>
            Have a team invite code? Enter it to get instant access.
          </FieldHelper>
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

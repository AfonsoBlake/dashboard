import { useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { AuthLayout, AuthLabel, AuthInput, AuthButton } from "@/components/auth/AuthLayout";
import { toast } from "sonner";
import { industryCategories, industries } from "@/config/industries";

const schema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(100),
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(72),
  industryId: z.string().min(1, "Select a business type"),
  inviteCode: z.string().trim().max(50).optional(),
});

const Signup = () => {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [industryId, setIndustryId] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ fullName, email, password, inviteCode, industryId });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          full_name: parsed.data.fullName,
          invite_code: parsed.data.inviteCode || null,
          industry_id: parsed.data.industryId,
        },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    // Sign out (in case of auto-confirm) so they actually wait for approval
    await supabase.auth.signOut();
    navigate("/pending-verification", { replace: true });
  };

  return (
    <AuthLayout
      title="Create Account"
      subtitle="Join Fluario"
      footer={
        <>
          Already have access?{" "}
          <Link to="/login" className="font-semibold text-primary hover:text-primary/80">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <div>
          <AuthLabel>Full Name</AuthLabel>
          <AuthInput
            type="text"
            placeholder="Your full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoComplete="name"
            required
          />
        </div>
        <div>
          <AuthLabel>Email Address</AuthLabel>
          <AuthInput
            type="email"
            placeholder="you@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>
        <div>
          <AuthLabel>Password</AuthLabel>
          <AuthInput
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
        </div>
        <div>
          <AuthLabel>What type of business are you?</AuthLabel>
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
          <AuthLabel>Invite Code (Optional)</AuthLabel>
          <AuthInput
            type="text"
            placeholder="Leave blank if none"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
          />
          <p className="mt-2 text-xs text-white/60">
            Have a team invite code? Enter it to get instant access.
          </p>
        </div>
        <AuthButton type="submit" loading={loading}>
          Create Account
        </AuthButton>
      </form>
    </AuthLayout>
  );
};

export default Signup;

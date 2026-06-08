import { useState, FormEvent, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  AuthShell,
  FieldLabel,
  FieldInput,
  PrimaryButton,
  FieldError,
} from "@/components/auth/AuthShell";

const LoginPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) routeByApproval(data.session.user.id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const routeByApproval = async (userId: string) => {
    const { data: prof } = await supabase
      .from("profiles")
      .select("approval_status, business_id")
      .eq("id", userId)
      .maybeSingle();
    if (prof?.approval_status !== "approved") {
      navigate("/pending-verification", { replace: true });
      return;
    }
    let slug: string | null = null;
    if (prof?.business_id) {
      const { data: business } = await supabase
        .from("businesses")
        .select("custom_domain")
        .eq("id", prof.business_id)
        .maybeSingle();
      slug = business?.custom_domain ?? null;
    }
    if (slug) navigate(`/gym/${slug}/overview`, { replace: true });
    else navigate("/overview", { replace: true });
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }
    setLoading(true);
    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (signInError || !data.user) {
      setLoading(false);
      setError(signInError?.message ?? "Sign in failed.");
      return;
    }
    await routeByApproval(data.user.id);
    setLoading(false);
  };

  return (
    <AuthShell
      title="ENTER DASHBOARD"
      footer={
        <>
          <div>
            Don't have an account?{" "}
            <Link
              to="/signup"
              className="font-bold hover:opacity-80"
              style={{ color: "#A78BFA" }}
            >
              Create an Account
            </Link>
          </div>
          <div className="mt-2">
            <Link to="/forgot-password" className="text-white/50 hover:text-white/70">
              Forgot your password?
            </Link>
          </div>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-5">
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
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>
        <FieldError>{error}</FieldError>
        <PrimaryButton type="submit" loading={loading}>
          Access Dashboard
        </PrimaryButton>
      </form>
    </AuthShell>
  );
};

export default LoginPage;

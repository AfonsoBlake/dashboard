import { useState, FormEvent, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AuthLayout, AuthLabel, AuthInput, AuthButton } from "@/components/auth/AuthLayout";
import { toast } from "sonner";

const schema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(72),
});

const Login = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session) navigate("/", { replace: true });
  }, [session, navigate]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    navigate("/", { replace: true });
  };

  return (
    <AuthLayout
      title="Enter Dashboard"
      subtitle="Sign in with your authorised account to continue"
      footer={
        <>
          <div>
            Don't have an account?{" "}
            <Link to="/signup" className="font-semibold text-primary hover:text-primary/80">
              Create an Account
            </Link>
          </div>
          <div className="mt-2">
            <Link to="/forgot-password" className="text-white/80 hover:text-white">
              Forgot your password?
            </Link>
          </div>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-5">
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
            autoComplete="current-password"
            required
          />
        </div>
        <AuthButton type="submit" loading={loading}>
          Access Dashboard
        </AuthButton>
      </form>
    </AuthLayout>
  );
};

export default Login;

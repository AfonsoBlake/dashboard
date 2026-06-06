import { useState, FormEvent } from "react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { AuthLayout, AuthLabel, AuthInput, AuthButton } from "@/components/auth/AuthLayout";
import { toast } from "sonner";

const schema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
});

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
    toast.success("Reset link sent. Check your inbox.");
  };

  return (
    <AuthLayout
      title="Reset Password"
      subtitle="Enter your email and we'll send you a reset link"
      footer={
        <Link to="/login" className="text-white/80 hover:text-white">
          ← Back to login
        </Link>
      }
    >
      {sent ? (
        <p className="rounded-xl border border-white/15 bg-white/5 px-4 py-6 text-center text-sm text-white/85">
          If an account exists for <strong>{email}</strong>, a reset link is on its way.
        </p>
      ) : (
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
          <AuthButton type="submit" loading={loading}>
            Send Reset Link
          </AuthButton>
        </form>
      )}
    </AuthLayout>
  );
};

export default ForgotPassword;

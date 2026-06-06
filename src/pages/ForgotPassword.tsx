import { useState, FormEvent } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  AuthShell,
  FieldLabel,
  FieldInput,
  PrimaryButton,
  FieldError,
} from "@/components/auth/AuthShell";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError("Enter your email address.");
      return;
    }
    setLoading(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSent(true);
  };

  return (
    <AuthShell
      title="RESET PASSWORD"
      footer={
        <Link to="/login" className="text-white/80 hover:text-white">
          ← Back to login
        </Link>
      }
    >
      {sent ? (
        <p className="text-center text-sm text-white/85">
          Check your email for a password reset link.
        </p>
      ) : (
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
          <FieldError>{error}</FieldError>
          <PrimaryButton type="submit" loading={loading}>
            Send Reset Link
          </PrimaryButton>
        </form>
      )}
    </AuthShell>
  );
};

export default ForgotPassword;

import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  AuthShell,
  FieldLabel,
  FieldInput,
  PrimaryButton,
  FieldError,
} from "@/components/auth/AuthShell";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setDone(true);
    setTimeout(() => navigate("/login", { replace: true }), 2000);
  };

  return (
    <AuthShell title="SET NEW PASSWORD">
      {done ? (
        <p className="text-center text-sm text-white/85">
          Password updated. Redirecting to sign in…
        </p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <FieldLabel>New Password</FieldLabel>
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
            <FieldLabel>Confirm Password</FieldLabel>
            <FieldInput
              type="password"
              placeholder="••••••••"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>
          <FieldError>{error}</FieldError>
          <PrimaryButton type="submit" loading={loading}>
            Update Password
          </PrimaryButton>
        </form>
      )}
    </AuthShell>
  );
};

export default ResetPassword;

import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { AuthLayout, AuthLabel, AuthInput, AuthButton } from "@/components/auth/AuthLayout";
import { toast } from "sonner";

const schema = z
  .object({
    password: z.string().min(6, "Password must be at least 6 characters").max(72),
    confirm: z.string().min(6).max(72),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords don't match",
    path: ["confirm"],
  });

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ password, confirm });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated. Please sign in.");
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  };

  return (
    <AuthLayout title="Set New Password" subtitle="Enter your new password below">
      <form onSubmit={onSubmit} className="space-y-5">
        <div>
          <AuthLabel>New Password</AuthLabel>
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
          <AuthLabel>Confirm Password</AuthLabel>
          <AuthInput
            type="password"
            placeholder="••••••••"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            required
          />
        </div>
        <AuthButton type="submit" loading={loading}>
          Update Password
        </AuthButton>
      </form>
    </AuthLayout>
  );
};

export default ResetPassword;

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AuthShell, PrimaryButton } from "@/components/auth/AuthShell";

const PendingVerification = () => {
  const navigate = useNavigate();

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user || !mounted) return;

      // Check current status immediately in case it's already approved
      const { data: prof } = await supabase
        .from("profiles")
        .select("approval_status")
        .eq("id", user.id)
        .maybeSingle();
      if (prof?.approval_status === "approved") {
        navigate("/dashboard", { replace: true });
        return;
      }

      channel = supabase
        .channel("profile-status")
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "profiles",
            filter: `id=eq.${user.id}`,
          },
          (payload: any) => {
            if (payload.new?.approval_status === "approved") {
              navigate("/dashboard", { replace: true });
            }
          }
        )
        .subscribe();
    })();

    return () => {
      mounted = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [navigate]);

  return (
    <AuthShell title="ACCOUNT PENDING APPROVAL">
      <p className="mb-6 text-center text-sm text-white/85">
        Your account has been created and is awaiting review.
        You'll get access as soon as it's approved.
      </p>
      <PrimaryButton
        type="button"
        onClick={async () => {
          await supabase.auth.signOut();
          navigate("/login", { replace: true });
        }}
      >
        Back to Sign In
      </PrimaryButton>
    </AuthShell>
  );
};

export default PendingVerification;

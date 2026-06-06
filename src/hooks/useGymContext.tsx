import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

type GymContextValue = {
  gymConfigId: string | null;
  gymId: string | null;
  gymSlug: string | null;
  loading: boolean;
  error: string | null;
};

const GymCtx = createContext<GymContextValue>({
  gymConfigId: null,
  gymId: null,
  gymSlug: null,
  loading: true,
  error: null,
});

export const GymProvider = ({ children }: { children: ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<GymContextValue>({
    gymConfigId: null,
    gymId: null,
    gymSlug: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    if (authLoading) {
      setState(s => ({ ...s, loading: true }));
      return;
    }
    if (!user) {
      setState({ gymConfigId: null, gymId: null, gymSlug: null, loading: false, error: null });
      return;
    }

    (async () => {
      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select("business_id")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;
      if (profileErr) {
        setState({ gymConfigId: null, gymId: null, gymSlug: null, loading: false, error: profileErr.message });
        return;
      }
      if (!profile?.business_id) {
        setState({ gymConfigId: null, gymId: null, gymSlug: null, loading: false, error: null });
        return;
      }

      const { data: gym, error: gymErr } = await supabase
        .from("gyms")
        .select("gym_config_id, slug")
        .eq("id", profile.business_id)
        .maybeSingle();

      if (cancelled) return;
      if (gymErr) {
        setState({ gymConfigId: null, gymId: profile.business_id, gymSlug: null, loading: false, error: gymErr.message });
        return;
      }

      setState({
        gymConfigId: gym?.gym_config_id ?? null,
        gymId: profile.business_id,
        gymSlug: gym?.slug ?? null,
        loading: false,
        error: null,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  return <GymCtx.Provider value={state}>{children}</GymCtx.Provider>;
};

export const useGymContext = () => useContext(GymCtx);

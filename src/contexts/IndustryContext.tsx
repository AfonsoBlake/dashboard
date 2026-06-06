import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getIndustryById, Industry } from "@/config/industries";

type IndustryContextValue = {
  industryId: string;
  industry: Industry;
  customDescription: string | null;
  setIndustryId: (id: string, customDesc?: string | null) => Promise<void>;
  loading: boolean;
};

const defaultIndustry = getIndustryById("gym");

const IndustryCtx = createContext<IndustryContextValue>({
  industryId: "gym",
  industry: defaultIndustry,
  customDescription: null,
  setIndustryId: async () => {},
  loading: true,
});

export const IndustryProvider = ({ children }: { children: ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const [industryId, setIndustryIdState] = useState<string>("gym");
  const [customDescription, setCustomDescription] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    if (authLoading) {
      setLoading(true);
      return;
    }
    
    if (!user) {
      setIndustryIdState("gym");
      setCustomDescription(null);
      setLoading(false);
      return;
    }

    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("industry_id, custom_business_description")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (!error && data) {
        if (data.industry_id) {
          setIndustryIdState(data.industry_id);
        }
        if (data.custom_business_description) {
          setCustomDescription(data.custom_business_description);
        }
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  const setIndustryId = async (id: string, customDesc: string | null = null) => {
    setIndustryIdState(id);
    setCustomDescription(customDesc);
    
    if (user) {
      await supabase
        .from("profiles")
        .update({ 
          industry_id: id, 
          custom_business_description: customDesc 
        })
        .eq("id", user.id);
    }
  };

  const industry = getIndustryById(industryId);

  return (
    <IndustryCtx.Provider value={{ industryId, industry, customDescription, setIndustryId, loading }}>
      {children}
    </IndustryCtx.Provider>
  );
};

export const useIndustry = () => useContext(IndustryCtx);

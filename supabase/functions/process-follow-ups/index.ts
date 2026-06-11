import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface FollowUpStep {
  step: number;
  delay_hours: number;
  message_instruction: string;
  tone: string;
}

interface ContactRow {
  id: string;
  business_id: string;
  platform_id: string | null;
  name: string | null;
  first_message: string | null;
  follow_up_count: number | null;
  follow_up_active: boolean;
  last_follow_up_at: string | null;
  last_message_at: string | null;
  updated_at: string;
  messages: unknown;
}

interface BusinessConfig {
  business_id: string;
  follow_up_steps: FollowUpStep[] | null;
  system_prompt: string | null;
  manychat_api_key: string | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const groqApiKey = Deno.env.get("GROQ_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseKey);
    const now = new Date();

    // Fetch all contacts currently in follow-up sequence
    const { data: contacts, error: contactsError } = await supabase
      .from("contacts")
      .select("id, business_id, platform_id, name, first_message, follow_up_count, follow_up_active, last_follow_up_at, last_message_at, updated_at, messages")
      .eq("follow_up_active", true);

    if (contactsError) throw contactsError;
    if (!contacts || contacts.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all relevant business configs in one query
    const businessIds = [...new Set((contacts as ContactRow[]).map((c) => c.business_id))];
    const { data: configs } = await supabase
      .from("business_configs")
      .select("business_id, follow_up_steps, system_prompt, manychat_api_key")
      .in("business_id", businessIds);

    const configMap = new Map<string, BusinessConfig>(
      ((configs ?? []) as BusinessConfig[]).map((cfg) => [cfg.business_id, cfg]),
    );

    let processed = 0;

    for (const contact of contacts as ContactRow[]) {
      const config = configMap.get(contact.business_id);
      if (!config) continue;

      const steps: FollowUpStep[] = Array.isArray(config.follow_up_steps) ? config.follow_up_steps : [];
      if (steps.length === 0) continue;

      // If the last message in the conversation is from the lead, they replied — reset
      const msgs = Array.isArray(contact.messages) ? contact.messages : [];
      const lastMsg = msgs[msgs.length - 1] as { role?: string } | undefined;
      if (lastMsg?.role === "user") {
        await supabase
          .from("contacts")
          .update({ follow_up_active: false, follow_up_count: 0 })
          .eq("id", contact.id);
        continue;
      }

      const stepIndex = contact.follow_up_count ?? 0;

      // All steps exhausted
      if (stepIndex >= steps.length) {
        await supabase
          .from("contacts")
          .update({ follow_up_active: false })
          .eq("id", contact.id);
        continue;
      }

      const currentStep = steps[stepIndex];

      // Check whether the required delay has elapsed since the last activity
      const referenceTime = contact.last_follow_up_at ?? contact.last_message_at ?? contact.updated_at;
      const delayMs = currentStep.delay_hours * 60 * 60 * 1000;
      if (now.getTime() - new Date(referenceTime).getTime() < delayMs) continue;

      if (!groqApiKey) {
        console.error("GROQ_API_KEY not configured");
        continue;
      }

      const stepNumber = stepIndex + 1;
      const systemPrompt = config.system_prompt ?? "You are a helpful assistant.";

      const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: `Context: You are sending a follow-up DM to a lead who went silent.
Their original message was: ${contact.first_message ?? "(unknown)"}
This is follow-up number ${stepNumber}.

Instruction for this follow-up: ${currentStep.message_instruction}
Tone: ${currentStep.tone}

Write a short, natural DM (2-4 sentences max). No hashtags. No emojis unless the tone is casual. Do not mention that this is automated.`,
            },
          ],
          max_tokens: 200,
          temperature: 0.7,
        }),
      });

      if (!groqRes.ok) {
        console.error("Groq API error:", groqRes.status, await groqRes.text());
        continue;
      }

      const groqData = await groqRes.json();
      const generatedMessage = (groqData?.choices?.[0]?.message?.content ?? "").trim();
      if (!generatedMessage) continue;

      // Send via ManyChat
      if (!config.manychat_api_key || !contact.platform_id) {
        console.error("Missing ManyChat key or platform_id for contact", contact.id);
        continue;
      }

      const manychatRes = await fetch("https://api.manychat.com/fb/sending/sendContent", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.manychat_api_key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subscriber_id: contact.platform_id,
          data: {
            version: "v2",
            content: {
              messages: [{ type: "text", text: generatedMessage }],
            },
          },
          message_tag: "ACCOUNT_UPDATE",
        }),
      });

      if (!manychatRes.ok) {
        console.error("ManyChat send error:", manychatRes.status, await manychatRes.text());
        continue;
      }

      // Update contact state
      const newCount = stepIndex + 1;
      const isLastStep = newCount >= steps.length;

      await supabase
        .from("contacts")
        .update({
          follow_up_count: newCount,
          last_follow_up_at: now.toISOString(),
          ...(isLastStep ? { follow_up_active: false } : {}),
        })
        .eq("id", contact.id);

      processed++;
    }

    return new Response(JSON.stringify({ processed }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("process-follow-ups error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

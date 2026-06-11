// Parses a completed onboarding conversation and extracts all business config fields.
// Uses Lovable AI Gateway (gemini-2.5-flash) with tool calling for structured output.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Message = { role: "user" | "assistant"; content: string };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages } = (await req.json()) as { messages: Message[] };

    const transcript = (messages ?? [])
      .map((m) => `${m.role === "user" ? "OWNER" : "AI"}: ${m.content}`)
      .join("\n");

    const systemPrompt = `You are extracting business configuration data from an AI onboarding conversation.
Read every line of the transcript carefully and call extract_config with every field you can find.
Rules:
- Only include fields that were actually discussed — do not hallucinate values.
- For system_prompt: write a thorough AI assistant system prompt (3-5 sentences) for the business's lead-handling bot, weaving in everything discussed: business name, type, offerings, tone, and goals.
- For escalation_rules: only set a flag to true if it was clearly relevant in the conversation (e.g. injury_concern=true for fitness businesses, ready_to_buy=true if booking intent was explicit).
- For ai_personality: map to exactly one of: Professional, Friendly, Energetic, Chill, Luxury.
- screening_questions: extract verbatim or paraphrase each qualifying question mentioned.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Onboarding conversation transcript:\n\n${transcript}\n\nExtract the full business configuration.` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_config",
              description: "Extract all business configuration fields from the onboarding conversation.",
              parameters: {
                type: "object",
                properties: {
                  business_name: { type: "string" },
                  business_type: { type: "string" },
                  ai_name: { type: "string", description: "The AI assistant's name" },
                  ai_personality: {
                    type: "string",
                    enum: ["Professional", "Friendly", "Energetic", "Chill", "Luxury"],
                  },
                  pricing: { type: "string", description: "Pricing or package info" },
                  opening_hours: { type: "string" },
                  location: { type: "string" },
                  bad_lead_definition: { type: "string", description: "Who/what counts as a bad lead" },
                  screening_questions: {
                    type: "array",
                    items: { type: "string" },
                    description: "Qualification questions the AI should ask leads",
                  },
                  qualification_strictness: {
                    type: "string",
                    enum: ["low", "medium", "high"],
                  },
                  system_prompt: { type: "string", description: "Full AI system prompt for the business bot" },
                  escalation_rules: {
                    type: "object",
                    properties: {
                      cant_answer: { type: "boolean" },
                      angry_lead: { type: "boolean" },
                      competitor_mentioned: { type: "boolean" },
                      injury_concern: { type: "boolean" },
                      ready_to_buy: { type: "boolean" },
                      callback_request: { type: "boolean" },
                      repeated_questions: { type: "boolean" },
                    },
                    additionalProperties: false,
                  },
                },
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_config" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiResponse.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    let extracted: Record<string, unknown> = {};
    try {
      extracted = toolCall?.function?.arguments ? JSON.parse(toolCall.function.arguments) : {};
    } catch (e) {
      console.error("Failed to parse tool args:", e);
    }

    return new Response(JSON.stringify(extracted), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-onboarding-config error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

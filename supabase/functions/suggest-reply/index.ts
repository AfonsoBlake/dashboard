// Suggest a staff reply + lead score + reason for an inbox conversation.
// Uses Lovable AI Gateway (google/gemini-2.5-flash) via tool-calling for structured output.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type IncomingMessage = {
  role?: string;
  content?: string;
  text?: string;
  timestamp?: string;
};

type Payload = {
  lead_id?: string;
  gym_id?: string;
  last_messages?: IncomingMessage[];
  intent?: "book" | "objection" | "follow_up" | "default";
  gym_name?: string;
};

const intentInstruction: Record<string, string> = {
  book: "Aim to book the lead for a free trial. Suggest a concrete next step (a day/time question).",
  objection: "The lead has an objection. Acknowledge it warmly, reframe value, and offer a low-friction next step.",
  follow_up: "This is a follow-up nudge. Be friendly, light-touch, and re-open the conversation with one easy question.",
  default: "Move the conversation forward naturally toward booking a trial.",
};

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

    const body = (await req.json()) as Payload;
    const messages = Array.isArray(body.last_messages) ? body.last_messages.slice(-10) : [];
    const intentKey = body.intent && intentInstruction[body.intent] ? body.intent : "default";
    const gymName = body.gym_name ?? "the gym";

    const transcript = messages
      .map((m) => {
        const who = m.role === "user" ? "LEAD" : m.role === "staff" ? "STAFF" : m.role === "assistant" ? "BOT" : (m.role ?? "?").toUpperCase();
        const text = (m.content ?? m.text ?? "").trim();
        return `${who}: ${text}`;
      })
      .filter((line) => line.length > 4)
      .join("\n");

    const systemPrompt = `You are an assistant for ${gymName}, helping staff reply to gym leads on Instagram/WhatsApp.
Tone: warm, casual, concise (1-3 short sentences). No emojis unless the lead used one.
${intentInstruction[intentKey]}
Also score the lead:
- "Hot": clear buying intent, asked about pricing/availability, ready to book
- "Warm": engaged but exploring, has questions
- "Cold": low engagement, vague, or hasn't responded meaningfully`;

    const userPrompt = `Recent conversation (most recent last):\n\n${transcript || "(no prior messages)"}\n\nWrite the next staff reply.`;

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
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "produce_reply",
              description: "Return the suggested staff reply along with a lead score and reasoning.",
              parameters: {
                type: "object",
                properties: {
                  suggested_reply: { type: "string", description: "The reply text to send to the lead." },
                  lead_score: { type: "string", enum: ["Hot", "Warm", "Cold"] },
                  lead_score_reason: { type: "string", description: "One short sentence explaining the score." },
                },
                required: ["suggested_reply", "lead_score", "lead_score_reason"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "produce_reply" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Top up at Settings > Workspace > Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiResponse.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    const argsJson = toolCall?.function?.arguments;
    let parsed: { suggested_reply: string; lead_score: string; lead_score_reason: string } | null = null;
    try {
      parsed = argsJson ? JSON.parse(argsJson) : null;
    } catch (e) {
      console.error("Failed to parse tool args:", e, argsJson);
    }

    if (!parsed) {
      // Fallback to plain content
      const content = data?.choices?.[0]?.message?.content ?? "";
      parsed = {
        suggested_reply: content || "Hey! Want to swing by for a free trial this week?",
        lead_score: "Warm",
        lead_score_reason: "Default scoring — no structured response from model.",
      };
    }

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("suggest-reply error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

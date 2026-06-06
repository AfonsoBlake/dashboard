import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  booking_id: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as RequestBody;
    if (!body?.booking_id) {
      return new Response(JSON.stringify({ error: "booking_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: booking, error: bErr } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", body.booking_id)
      .maybeSingle();

    if (bErr || !booking) {
      return new Response(
        JSON.stringify({ error: bErr?.message ?? "Booking not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { data: gym } = await supabase
      .from("gym_configs")
      .select("gym_name, escalation_contact, manager_name")
      .eq("id", booking.gym_id)
      .maybeSingle();

    const recipient = gym?.escalation_contact;
    if (!recipient) {
      return new Response(
        JSON.stringify({
          error:
            "No escalation_contact email configured for this gym. Set one in gym_configs.",
        }),
        {
          status: 422,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const gymName = gym?.gym_name ?? "Your gym";
    const html = `
      <div style="font-family:Arial,sans-serif;background:#ffffff;padding:24px;color:#111">
        <h2 style="margin:0 0 16px">Booking confirmed — ${gymName}</h2>
        <p style="margin:0 0 12px">A trial booking has been marked as <strong>confirmed</strong>.</p>
        <table style="border-collapse:collapse;width:100%;max-width:520px">
          <tbody>
            <tr><td style="padding:6px 0;color:#666">Lead</td><td style="padding:6px 0"><strong>${booking.name ?? "—"}</strong></td></tr>
            <tr><td style="padding:6px 0;color:#666">Phone</td><td style="padding:6px 0">${booking.phone ?? "—"}</td></tr>
            <tr><td style="padding:6px 0;color:#666">Source</td><td style="padding:6px 0">${booking.source ?? "—"}</td></tr>
            <tr><td style="padding:6px 0;color:#666">Preferred day</td><td style="padding:6px 0">${booking.preferred_day ?? "—"}</td></tr>
            <tr><td style="padding:6px 0;color:#666">Preferred time</td><td style="padding:6px 0">${booking.preferred_time ?? "—"}</td></tr>
            <tr><td style="padding:6px 0;color:#666">Location</td><td style="padding:6px 0">${booking.location ?? "—"}</td></tr>
          </tbody>
        </table>
        <p style="margin:24px 0 0;color:#666;font-size:12px">FitTrial Labs · automated notification</p>
      </div>
    `;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "FitTrial Labs <onboarding@resend.dev>",
        to: [recipient],
        subject: `Booking confirmed — ${booking.name ?? "New lead"}`,
        html,
      }),
    });

    const resendJson = await resendRes.json();
    if (!resendRes.ok) {
      return new Response(
        JSON.stringify({ error: "Resend error", details: resendJson }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(JSON.stringify({ ok: true, id: resendJson.id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

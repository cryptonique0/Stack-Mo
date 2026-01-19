import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;

interface PaymentConfirmationPayload {
  email: string;
  amount: number;
  currency: string;
  txid: string;
}

const resend = new Resend(RESEND_API_KEY);
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

serve(async (req) => {
  console.log("Request method:", req.method);
  console.log("Request headers:", req.headers);

  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: {
        ...corsHeaders,
        "Access-Control-Allow-Origin":
          req.headers.get("origin") || "http://localhost:8080",
      },
    });
  }

  try {
    const payload: PaymentConfirmationPayload = await req.json();
    const { email, amount, currency, txid } = payload;

    const formattedAmount = (amount / 100000000).toFixed(8);

    const { data, error: emailError } = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: email,
      subject: "You Just Received A Payment 🎉",
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Payment Confirmed!</h2>
          <p>Great news! Your client's payment has been confirmed on the blockchain.</p>
          <div style="background: #f7f7f7; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Amount:</strong> ${formattedAmount} ${currency}</p>
            <p style="margin: 5px 0;"><strong>Transaction ID:</strong> ${txid}</p>
          </div>
          <p>You can view the transaction details on the Stacks explorer:</p>
          <a href="https://explorer.stacks.co/txid/${txid}?chain=testnet"
             style="color: #0066cc; text-decoration: none;">
            View Transaction →
          </a>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">
            This is an automated message from StackPay. Please do not reply to this email.
          </p>
        </div>
      `,
    });

    if (emailError) throw emailError;

    await supabase.from("notification_logs").insert({
      type: "email",
      recipient: email,
      event: "payment_confirmed",
      status: "sent",
      metadata: { email_id: data?.id, amount, currency, txid },
    });

    return new Response(
      JSON.stringify({ message: "Email notification sent successfully" }),
      {
        headers: {
          ...corsHeaders,
          "Access-Control-Allow-Origin":
            req.headers.get("origin") || "http://localhost:8080",
          "Content-Type": "application/json",
        },
        status: 200,
      },
    );
  } catch (error) {
    console.error("Error sending payment confirmation:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to send payment confirmation email",
        details: error.message,
      }),
      {
        headers: {
          ...corsHeaders,
          "Access-Control-Allow-Origin":
            req.headers.get("origin") || "http://localhost:8080",
          "Content-Type": "application/json",
        },
        status: 500,
      },
    );
  }
});

import { CONTRACT_ADDRESS } from "@/hooks/useStacksContract";
import { supabase } from "@/integrations/supabase/client";

interface Transaction {
  txid: string;
  invoiceId: string;
  amount: number;
  status: string;
}

/**
 * Query the Hiro API for recent transactions for this principal
 */
async function getRecentTransactions(): Promise<Transaction[]> {
  try {
    const response = await fetch(
      `https://api.testnet.hiro.so/extended/v1/address/${CONTRACT_ADDRESS}/transactions?limit=50`,
      {
        headers: {
          "x-api-key": import.meta.env.VITE_HIRO_API_KEY,
        },
      },
    );
    const data = await response.json();
    console.log(data);

    return data.results
      .filter(
        (tx: any) =>
          tx.tx_type === "contract_call" &&
          tx.contract_call.function_name === "process-sbtc-payment", // ✅ only pay-invoice calls
      )
      .map((tx: any) => {
        const args = tx.contract_call?.function_args || [];

        const invoiceArg = args.find((a: any) => a.name === "invoice-id");
        const amountArg = args.find((a: any) => a.name === "amount");

        return {
          txid: tx.tx_id,
          invoiceId: invoiceArg?.repr?.replace(/"/g, "") || "",
          amount: amountArg
            ? Number(amountArg.repr.replace("u", "")) // "u30000000" → 30000000
            : 0,
          status: tx.tx_status,
        };
      });
  } catch (error) {
    console.error("Failed to fetch transactions:", error);
    return [];
  }
}

/**
 * Process pending payments and update their status if matched
 */
export async function processTransactions() {
  try {
    // Get all pending payments
    const { data: payments, error } = await supabase
      .from("payments")
      .select("*")
      .eq("status", "pending");

    if (error) throw error;
    if (!payments?.length) return;

    // Get recent transactions (only pay-invoice ones)
    const transactions = await getRecentTransactions();
    console.log(transactions);

    for (const payment of payments) {
      const matchingTx = transactions.find(
        (tx) =>
          tx.invoiceId === payment.id && // match invoice ID
          tx.amount === payment.expected_amount && // match amount
          tx.status === "success",
      );

      if (matchingTx) {
        console.log(`✅ Payment ${payment.id} matched tx ${matchingTx.txid}`);

        // Update payment status in Supabase
        const { error: updateError } = await supabase
          .from("payments")
          .update({
            status: "confirmed",
            txid: matchingTx.txid,
            confirmed_at: new Date().toISOString(),
          })
          .eq("id", payment.id);

        if (updateError) {
          console.error(`Failed to update payment ${payment.id}:`, updateError);
          continue;
        }

        // Trigger webhook if URL exists
        // if (payment.webhook_url) {
        //   try {
        //     await fetch(payment.webhook_url, {
        //       method: "POST",
        //       headers: {
        //         "Content-Type": "application/json",
        //       },
        //       body: JSON.stringify({
        //         event: "payment.confirmed",
        //         data: {
        //           payment_id: payment.id,
        //           amount: payment.expected_amount,
        //           currency: payment.currency,
        //           status: "confirmed",
        //           txid: matchingTx.txid,
        //         },
        //       }),
        //     });
        //   } catch (webhookError) {
        //     console.error(
        //       `Failed to deliver webhook for payment ${payment.id}:`,
        //       webhookError,
        //     );
        //   }
        // }

        // Send email notification if email exists
        if (payment.email) {
          // Implement email notification here using your preferred email service
          // Example: use Supabase Edge Functions with Resend.com
          try {
            const { data, error } = await supabase.functions.invoke("notify", {
              body: {
                email: payment.email,
                amount: payment.expected_amount,
                currency: payment.currency,
                txid: matchingTx.txid,
              },
            });

            if (error) {
              throw error;
            }

            console.log("Notification sent:", data);
          } catch (emailError) {
            console.error(
              `Failed to send email for payment ${payment.id}:`,
              emailError,
            );
          }
        }
      }
    }
  } catch (error) {
    console.error("Error processing transactions:", error);
  }
}

// Set up polling interval (e.g., every 10 seconds)
export function startTransactionMonitoring(intervalMs = 10000) {
  const intervalId = setInterval(processTransactions, intervalMs);
  return () => clearInterval(intervalId); // Return cleanup function
}

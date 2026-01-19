require("dotenv").config();
import { CONTRACT_ADDRESS } from "@/hooks/useStacksContract";

const { connectWebSocketClient } = require("@stacks/blockchain-api-client");
const { createClient } = require("@supabase/supabase-js");
const express = require("express");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const networkUrl = process.env.NETWORK_URL;

const supabase = createClient(supabaseUrl, supabaseKey);

// Function to process and store sBTC transfer
async function processTransfer(txEvent) {
  try {
    const { tx } = txEvent;
    const { tx_id: txid, sender_address: sender, stx_transfers } = tx;

    // Check for sBTC-related transfers (adjust logic based on sBTC contract)
    const sbtcTransfer = stx_transfers.find(
      (transfer) =>
        transfer.amount > 0 && transfer.recipient === CONTRACT_ADDRESS, // Replace with sBTC contract or known address
    );

    if (!sbtcTransfer) return;

    const { recipient, amount } = sbtcTransfer;
    const blockHeight = tx.block_height;

    // Avoid duplicates
    const { data: existing } = await supabase
      .from("sbtc_transfers")
      .select("txid")
      .eq("txid", txid)
      .single();

    if (existing) {
      console.log(`Transaction ${txid} already processed`);
      return;
    }

    // Insert into Supabase
    const { error } = await supabase.from("sbtc_transfers").insert({
      txid,
      sender,
      recipient,
      amount,
      block_height: blockHeight,
    });

    if (error) throw error;

    console.log(`Logged sBTC transfer: ${txid}, Amount: ${amount}`);
  } catch (error) {
    console.error("Error processing transfer:", error);
  }
}

// Initialize WebSocket client and subscribe
async function startMonitoring() {
  try {
    const client = await connectWebSocketClient(networkUrl);

    const subscription = await client.subscribeAddressTransactions(
      CONTRACT_ADDRESS,
      async (event) => {
        console.log("Received event:", event);
        await processTransfer(event);
      },
    );

    console.log("Subscribed to address transactions");

    // Optional: Expose a health check endpoint
    app.get("/health", (req, res) => res.send("OK"));

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

    // Cleanup on process exit
    process.on("SIGTERM", async () => {
      await subscription.unsubscribe();
      process.exit(0);
    });
  } catch (error) {
    console.error("Failed to start monitoring:", error);
  }
}

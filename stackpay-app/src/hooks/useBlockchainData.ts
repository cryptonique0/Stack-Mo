import { useEffect, useState } from "react";
import { Cl } from "@stacks/transactions";
import { useStacksContract } from "./useStacksContract";
import { Invoice } from "@/utils/blockchain";

interface UseBlockchainDataProps {
  merchantId?: string;
  onlyPaid?: boolean;
}

export function useBlockchainData({
  merchantId,
  onlyPaid = false,
}: UseBlockchainDataProps = {}) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { readArchContract } = useStacksContract();

  function parseInvoice(raw: any, id: string): Invoice | null {
    if (!raw?.value?.value) return null;

    const invoice = raw.value.value;
    const statusValue = invoice["status"] ? Number(invoice["status"].value) : 0;

    return {
      id,
      amount: BigInt(invoice["amount"]?.value ?? 0),
      email: invoice["email"]?.value ?? "",
      description: invoice["description"]?.value ?? "",
      currency: invoice["currency"]?.value ?? "",
      expiresAt: invoice["expires-at"]
        ? Number(invoice["expires-at"].value)
        : null,
      createdAt: invoice["created-at"]
        ? Number(invoice["created-at"].value)
        : null,
      paidAt: statusValue === 1 ? Number(invoice["paid-at"]?.value ?? 0) : null,
      metadata: invoice["metadata"]?.value ?? "",
      webhookUrl: invoice["webhook-url"]?.value ?? null,
      merchant: invoice["merchant"]?.value ?? "",
      recipient: invoice["recipient"]?.value ?? "",
      status: {
        0: "pending",
        1: "paid",
        2: "expired",
      }[statusValue] as "pending" | "paid" | "expired",
      paymentLink: id ? `${window.location.origin}/pay/${id}` : null,
      paymentAddress: invoice["payment-address"]?.value ?? null,
      // transaction_hash: invoice["transaction-hash"]?.value ?? null,
    };
  }

  const fetchBlockchainInvoices = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Get total number of invoices
      const noOfInvoices = await readArchContract("get-invoice-count");
      const totalInvoices = Number(await noOfInvoices.value.value);

      if (totalInvoices === 0) {
        setInvoices([]);
        return;
      }

      // Fetch all invoice IDs
      const invoicePromises = Array.from({ length: totalInvoices }, (_, i) =>
        readArchContract("get-invoice-id", [Cl.uint(i)]),
      );

      const invoiceIds = await Promise.all(invoicePromises);

      // Fetch invoice details for each ID
      const invoiceDetailsPromises = invoiceIds.map((invoiceId) => {
        const id = invoiceId.value.value["invoice-id"].value;
        return readArchContract("get-invoice", [Cl.stringAscii(id)]);
      });

      const invoiceResults = await Promise.all(invoiceDetailsPromises);

      // Process invoice data
      let processedInvoices = invoiceResults
        .map((result, i) => {
          const id = invoiceIds[i]?.value.value["invoice-id"].value ?? null;
          return id ? parseInvoice(result, id) : null;
        })
        .filter((invoice): invoice is Invoice => invoice !== null);

      // Apply filters
      if (merchantId) {
        processedInvoices = processedInvoices.filter(
          (invoice) => invoice.merchant === merchantId,
        );
      }

      if (onlyPaid) {
        processedInvoices = processedInvoices.filter(
          (invoice) => invoice.status === "paid",
        );
      }

      setInvoices(processedInvoices.reverse()); // Show newest first
    } catch (error) {
      console.error("Failed to fetch invoices:", error);
      setError(
        error instanceof Error ? error.message : "Failed to fetch invoices",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBlockchainInvoices();
  }, [merchantId, onlyPaid]);

  return {
    invoices,
    isLoading,
    error,
    refetch: fetchBlockchainInvoices,
  };
}

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { useWallet } from "@/contexts/WalletContext";
import { useStacksContract } from "@/hooks/useStacksContract";
import { supabase } from "@/integrations/supabase/client";
import {
  stringAsciiCV,
  stringUtf8CV,
  uintCV,
  noneCV,
  someCV,
  principalCV,
  Cl,
} from "@stacks/transactions";
import {
  CreateInvoiceParams,
  prepareCreateInvoiceArgs,
  DEFAULT_EXPIRES_IN_BLOCKS,
  DEFAULT_CURRENCY,
  Invoice,
} from "@/utils/blockchain";
import { Plus } from "lucide-react";

type InvoiceIdResponse = {
  value: {
    value: {
      ["invoice-id"]: {
        value: string;
      };
    };
  };
};

interface CreateInvoiceDrawerProps {
  onInvoiceCreated?: () => void;
}

const createDefaultFormData = () => {
  return {
    recipient: "",
    amount: "0",
    currency: "sBTC",
    expiresInBlocks: "144", // ~24 hours in blocks
    description: "",
    metadata: "",
    email: "",
    webhook: "",
  };
};

export function CreateInvoiceDrawer({
  onInvoiceCreated,
}: CreateInvoiceDrawerProps) {
  const { toast } = useToast();
  const { account, isConnected } = useWallet();
  const { callArchContract, readArchContract } = useStacksContract();
  const [isOpen, setIsOpen] = useState(false);

  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState(createDefaultFormData());

  // Reset form when drawer closes
  useEffect(() => {
    if (!isOpen) {
      setFormData(createDefaultFormData());
    }
  }, [isOpen]);

  async function getLatestInvoiceId(): Promise<InvoiceIdResponse | null> {
    try {
      const noOfInvoices = await readArchContract("get-invoice-count");
      // @ts-expect-error abc
      const totalInvoices = Number(noOfInvoices.value.value);

      if (totalInvoices === 0) {
        return null;
      }

      const latestInvoiceId = await readArchContract("get-invoice-id", [
        Cl.uint(totalInvoices - 1),
      ]);
      return latestInvoiceId as unknown as InvoiceIdResponse;
    } catch (error) {
      console.error("Error getting latest invoice ID:", error);
      return null;
    }
  }

  const createInvoice = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!account) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }

    if (!formData.amount || !formData.description) {
      toast({
        title: "Missing required fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const functionArgs = [
        principalCV(account),
        uintCV(Math.floor(parseFloat(formData.amount) * 100000000)), // amount in satoshis
        stringAsciiCV(formData.currency), // currency
        uintCV(parseInt(formData.expiresInBlocks)), // expires-in-blocks
        stringUtf8CV(formData.description), // description
        stringUtf8CV(formData.metadata || ""), // metadata
        stringUtf8CV(formData.email),
        formData.webhook ? someCV(stringAsciiCV(formData.webhook)) : noneCV(), // webhook
      ];

      const response = await callArchContract({
        functionName: "create-invoice",
        functionArgs,
      });

      if (response.txid) {
        // Store invoice data in Supabase
        const createdAt = new Date().toISOString();
        const amountInSats = Math.floor(
          parseFloat(formData.amount) * 100000000,
        );
        const invoiceIdObject = await getLatestInvoiceId();
        const invoiceId =
          invoiceIdObject?.value?.value?.["invoice-id"]?.value ?? null;

        if (!invoiceId) {
          throw new Error("Invoice ID not found in contract response");
        }
        console.log(invoiceId);

        const { error: supabaseError } = await supabase
          .from("payments")
          .insert({
            id: invoiceId,
            created_at: createdAt,
            expected_amount: amountInSats,
            currency: formData.currency,
            description: formData.description,
            status: "pending",
            email: formData.email,
          });

        if (supabaseError) {
          console.error("Failed to store payment in Supabase:", supabaseError);
          toast({
            title: "Warning",
            description: "Invoice created but tracking data not stored",
            variant: "destructive",
          });
        }

        toast({
          title: "Invoice created successfully",
          description: `Transaction ID: ${response.txid}`,
        });

        setIsOpen(false);
        onInvoiceCreated();
      }
    } catch (error) {
      toast({
        title: "Failed to create invoice",
        description:
          error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Invoice
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Create New Invoice</SheetTitle>
          <SheetDescription>
            Fill in the details below to create a new invoice
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={createInvoice} className="mt-6 space-y-3">
          {/*<div>
            <label
              htmlFor="recipient"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Recipient
            </label>
            <input
              id="recipient"
              type="recipient"
              placeholder="customer@example.com"
              value={formData.recipient}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData((prev) => ({ ...prev, recipient: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>*/}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Customer Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="customer@example.com"
              value={formData.email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                setFormData((prev) => ({ ...prev, email: e.target.value }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="amount">
              Amount <span className="text-red-500">*</span>
            </Label>
            <Input
              id="amount"
              type="number"
              step="0.000001"
              value={formData.amount}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, amount: e.target.value }))
              }
              placeholder="0.00"
              required
              className="flex-1"
            />
          </div>
          <div>
            <Label
              htmlFor="currency"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Currency
            </Label>
            <select
              id="currency"
              value={formData.currency}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                setFormData((prev) => ({ ...prev, currency: e.target.value }))
              }
              // disabled={!walletAddress || !isRegistered}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            >
              <option value="sBTC">sBTC</option>
              <option value="STX">STX</option>
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="description">
              Description <span className="text-red-500">*</span>
            </Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              placeholder="Invoice description"
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="metadata">Metadata</Label>
            <Input
              id="metadata"
              value={formData.metadata}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, metadata: e.target.value }))
              }
              placeholder="Additional information (optional)"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="webhook">Webhook URL</Label>
            <Input
              id="webhook"
              type="url"
              value={formData.webhook}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, webhook: e.target.value }))
              }
              placeholder="https://your-api.com/webhook (optional)"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="expiresInBlocks">Expires In (Blocks)</Label>
            <Input
              id="expiresInBlocks"
              type="number"
              value={formData.expiresInBlocks}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  expiresInBlocks: e.target.value,
                }))
              }
            />
            <p className="text-xs text-muted-foreground">
              Default: 144 blocks (~24 hours)
            </p>
          </div>

          <div className="flex items-center gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isCreating} className="flex-1">
              {isCreating ? "Creating..." : "Create Invoice"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

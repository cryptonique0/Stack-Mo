import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download } from "lucide-react";
import { downloadReceipt } from "@/lib/receipt/generateReceipt";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "react-router-dom";
import type { ReceiptData } from "@/lib/receipt/generateReceipt";

interface PaymentActionsProps {
  showDownload?: boolean;
  showBack?: boolean;
  receiptData?: ReceiptData;
  onDownload?: () => void;
  onBack?: () => void;
  blockData?: {
    currentBlock?: number;
    blockTimeCallback?: (
      block: number,
      currentBlock: number | undefined,
      now: number,
    ) => Date;
  };
}

export function PaymentActions({
  showDownload = true,
  showBack = true,
  receiptData,
  onDownload,
  onBack,
  blockData,
}: PaymentActionsProps) {
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleDownload = () => {
    if (!receiptData) {
      toast({
        title: "Error",
        description: "Receipt data is not available",
        variant: "destructive",
      });
      return;
    }

    try {
      downloadReceipt(receiptData, {
        currentBlock: blockData?.currentBlock,
        blockTimeCallback: blockData?.blockTimeCallback,
      });

      toast({
        title: "Success",
        description: "Receipt is being downloaded",
      });

      onDownload?.();
    } catch (error) {
      console.error("Error downloading receipt:", error);
      toast({
        title: "Error",
        description: "Failed to download receipt",
        variant: "destructive",
      });
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <div className="flex items-center justify-between gap-4">
      {showBack && (
        <Button variant="secondary" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      )}
      {showDownload && receiptData && (
        <Button variant="outline" onClick={handleDownload}>
          <Download className="h-4 w-4 mr-2" />
          Download Receipt
        </Button>
      )}
    </div>
  );
}

// Animation variants for payment success scenario
export function SuccessActions({
  receiptData,
  blockData,
}: {
  receiptData?: ReceiptData;
  blockData?: {
    currentBlock?: number;
    blockTimeCallback?: (
      block: number,
      currentBlock: number | undefined,
      now: number,
    ) => Date;
  };
}) {
  return (
    <div className="animate-fade-in">
      <PaymentActions
        receiptData={receiptData}
        blockData={blockData}
        showDownload={true}
        showBack={true}
      />
    </div>
  );
}

// Animation variants for payment error scenario
export function ErrorActions() {
  return (
    <div className="animate-fade-in">
      <PaymentActions showDownload={false} showBack={true} />
    </div>
  );
}

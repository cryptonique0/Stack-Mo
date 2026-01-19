import { jsPDF } from "jspdf";

// Types
export interface ReceiptData {
  id: string;
  description: string;
  recipient: string;
  email?: string;
  amount: number;
  currency: string;
  paidAt: number | string | Date;
  paymentAddress?: string;
  transactionHash?: string;
  merchant: {
    business_name: string;
    business_website?: string;
  };
}

export interface ReceiptOptions {
  currentBlock?: number;
  blockTimeCallback?: (block: number, currentBlock: number | undefined, now: number) => Date;
}

export function generateReceipt(data: ReceiptData, options?: ReceiptOptions): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // Colors
  const primaryColor = [245, 123, 0]; // Orange
  const secondaryColor = [156, 163, 175]; // Gray
  const darkColor = [31, 41, 55]; // Dark gray

  // Header Background
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(0, 0, pageWidth, 50, "F");

  // Company/Merchant Header
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont(undefined, "bold");
  doc.text(data.merchant.business_name || "Payment Receipt", pageWidth / 2, 20, {
    align: "center",
  });

  doc.setFontSize(12);
  doc.setFont(undefined, "normal");
  doc.text("Payment Confirmation", pageWidth / 2, 35, { align: "center" });

  // Reset text color
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);

  // Receipt Title
  doc.setFontSize(18);
  doc.setFont(undefined, "bold");
  doc.text("RECEIPT", 20, 70);

  // Add decorative line
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setLineWidth(2);
  doc.line(20, 75, pageWidth - 20, 75);

  // Receipt Details Section
  let yPos = 95;
  const lineHeight = 10;
  const labelWidth = 50;

  // Helper function to add labeled row
  const addReceiptRow = (label: string, value: string, isBold = false) => {
    doc.setFont(undefined, "bold");
    doc.setFontSize(10);
    doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
    doc.text(label.toUpperCase(), 20, yPos);

    doc.setFont(undefined, isBold ? "bold" : "normal");
    doc.setFontSize(isBold ? 12 : 10);
    doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
    doc.text(value, 20 + labelWidth, yPos);
    yPos += lineHeight;
  };

  // Invoice Details
  addReceiptRow("Receipt ID:", data.id);
  addReceiptRow("Description:", data.description);
  addReceiptRow("Recipient:", data.recipient);
  if (data.email) {
    addReceiptRow("Email:", data.email);
  }

  yPos += 5; // Extra spacing before amount

  // Amount (highlighted)
  doc.setFillColor(248, 250, 252); // Light gray background
  doc.rect(15, yPos - 5, pageWidth - 30, 15, "F");
  doc.setFont(undefined, "bold");
  doc.setFontSize(14);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("AMOUNT PAID:", 20, yPos + 5);
  doc.text(
    `${data.amount} ${data.currency}`,
    pageWidth - 20,
    yPos + 5,
    { align: "right" },
  );

  yPos += 25;

  // Payment Information
  doc.setTextColor(darkColor[0], darkColor[1], darkColor[2]);
  doc.setFontSize(12);
  doc.setFont(undefined, "bold");
  doc.text("PAYMENT INFORMATION", 20, yPos);
  yPos += 10;

  // Payment date handling
  let paymentDate: string;
  if (options?.blockTimeCallback && typeof data.paidAt === 'number') {
    paymentDate = options.blockTimeCallback(
      data.paidAt,
      options.currentBlock,
      Date.now()
    ).toLocaleString();
  } else {
    paymentDate = new Date(data.paidAt).toLocaleString();
  }

  addReceiptRow("Payment Date:", paymentDate);

  if (data.paymentAddress) {
    addReceiptRow("Payment Address:", data.paymentAddress);
  }

  if (data.transactionHash) {
    // Split long transaction hash into multiple lines if needed
    const txHash = data.transactionHash;
    if (txHash.length > 40) {
      addReceiptRow("Transaction Hash:", txHash.substring(0, 40));
      doc.setFont(undefined, "normal");
      doc.setFontSize(10);
      doc.text(txHash.substring(40), 20 + labelWidth, yPos - 5);
    } else {
      addReceiptRow("Transaction Hash:", txHash);
    }
  }

  // Footer section
  yPos = pageHeight - 60;

  // Add decorative line
  doc.setDrawColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.setLineWidth(1);
  doc.line(20, yPos, pageWidth - 20, yPos);

  yPos += 15;

  // Thank you message
  doc.setFontSize(12);
  doc.setFont(undefined, "bold");
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("Thank you for your payment!", pageWidth / 2, yPos, {
    align: "center",
  });

  yPos += 10;

  // Footer info
  doc.setFontSize(9);
  doc.setFont(undefined, "normal");
  doc.setTextColor(secondaryColor[0], secondaryColor[1], secondaryColor[2]);
  doc.text(
    "This receipt serves as confirmation of your completed payment.",
    pageWidth / 2,
    yPos,
    { align: "center" },
  );

  yPos += 8;
  doc.text(
    `Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`,
    pageWidth / 2,
    yPos,
    { align: "center" },
  );

  return doc;
}

// Helper function to download the receipt
export function downloadReceipt(data: ReceiptData, options?: ReceiptOptions): void {
  const doc = generateReceipt(data, options);
  doc.save(`receipt-${data.id}.pdf`);
}

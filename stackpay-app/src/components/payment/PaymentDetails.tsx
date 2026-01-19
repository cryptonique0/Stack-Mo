import React from "react";
import { cn } from "@/lib/utils";
import { Bitcoin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PaymentStatus } from "./PaymentStatus";
import { PaymentCountdown } from "./PaymentCountdown";
import _ from "lodash";

export interface PaymentDetailsProps {
  id: string;
  amount: number;
  currency: string;
  recipient: string;
  description: string;
  status: "pending" | "paid" | "expired" | "cancelled";
  createdAt?: Date | number;
  expiresAt?: Date | number;
  className?: string;
  merchant?: {
    business_name: string;
    business_website?: string;
  };
}

export function PaymentDetails({
  id,
  amount,
  currency,
  recipient,
  description,
  status,
  createdAt,
  expiresAt,
  className,
  merchant,
}: PaymentDetailsProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-orange-100 p-2 rounded-lg">
              <Bitcoin className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <CardTitle className="text-lg">
                {merchant?.business_name || "Payment Details"}
              </CardTitle>
              <div className="text-sm text-muted-foreground">Invoice #{id}</div>
            </div>
          </div>
          <PaymentStatus status={status} />
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Amount Section */}
        <div className="bg-muted rounded-lg p-4 text-center">
          <div className="text-sm text-muted-foreground mb-1">Amount Due</div>
          <div className="text-3xl font-bold text-primary">
            {amount} {currency}
          </div>
        </div>

        {/* Details Grid */}
        <div className="space-y-3">
          <div>
            <div className="text-sm text-muted-foreground mb-1">
              Description
            </div>
            <div className="font-medium">{description}</div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-muted-foreground mb-1">
                Recipient
              </div>
              <div className="font-medium">
                {_.truncate(recipient, {
                  length: 16,
                })}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Created</div>
              <div className="font-medium">
                {createdAt ? new Date(createdAt).toLocaleString() : "N/A"}
              </div>
            </div>
          </div>
        </div>

        {/* Countdown Timer for Pending Payments */}
        {status === "pending" && expiresAt && (
          <PaymentCountdown
            expiryDate={expiresAt}
            className="w-full justify-center"
          />
        )}

        {/* Status Messages */}
        {status === "expired" && (
          <div className="bg-red-50 text-red-800 p-4 rounded-lg text-center">
            <p className="font-medium">This payment has expired</p>
            <p className="text-sm mt-1">
              Please contact the merchant to request a new invoice
            </p>
          </div>
        )}

        {status === "cancelled" && (
          <div className="bg-gray-50 text-gray-800 p-4 rounded-lg text-center">
            <p className="font-medium">This payment has been cancelled</p>
            <p className="text-sm mt-1">
              Please contact the merchant for more information
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

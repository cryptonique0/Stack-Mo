import React from "react";
import { CheckCircle, XCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

type PaymentStatus = "pending" | "paid" | "expired" | "cancelled";

interface PaymentStatusProps {
  status: PaymentStatus;
  showIcon?: boolean;
  iconSize?: number;
  animate?: boolean;
  className?: string;
}

interface StatusConfig {
  label: string;
  color: string;
  icon: React.ReactNode;
  animation?: string;
}

export function PaymentStatus({
  status,
  showIcon = true,
  iconSize = 4,
  animate = true,
  className,
}: PaymentStatusProps) {
  const statusConfig: Record<PaymentStatus, StatusConfig> = {
    paid: {
      label: "Paid",
      color: "text-green-800 bg-green-100",
      icon: <CheckCircle className={`h-${iconSize} w-${iconSize}`} />,
      animation: animate ? "animate-pulse" : undefined,
    },
    pending: {
      label: "Pending",
      color: "text-yellow-800 bg-yellow-100",
      icon: <Clock className={`h-${iconSize} w-${iconSize}`} />,
    },
    expired: {
      label: "Expired",
      color: "text-red-800 bg-red-100",
      icon: <XCircle className={`h-${iconSize} w-${iconSize}`} />,
    },
    cancelled: {
      label: "Cancelled",
      color: "text-gray-800 bg-gray-100",
      icon: <XCircle className={`h-${iconSize} w-${iconSize}`} />,
    },
  };

  const config = statusConfig[status];

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-sm font-medium",
        config.color,
        config.animation,
        className,
      )}
    >
      {showIcon && config.icon}
      <span>{config.label}</span>
    </div>
  );
}

// Success animation component for payment completion
export function PaymentSuccessAnimation() {
  return (
    <div className="flex flex-col items-center justify-center">
      <div className="animate-bounce mb-4">
        <CheckCircle className="h-16 w-16 text-green-500" />
      </div>
      <h3 className="text-2xl font-semibold text-green-800 mb-2">
        Payment Successful!
      </h3>
      <p className="text-green-700 text-center">
        Your payment has been confirmed on the blockchain.
      </p>
    </div>
  );
}

// Error animation component for payment failure
export function PaymentErrorAnimation() {
  return (
    <div className="flex flex-col items-center justify-center">
      <div className="animate-shake mb-4">
        <XCircle className="h-16 w-16 text-red-500" />
      </div>
      <h3 className="text-xl font-semibold text-red-800 mb-2">
        Payment Failed
      </h3>
      <p className="text-red-700 text-center">
        There was an issue processing your payment.
      </p>
    </div>
  );
}

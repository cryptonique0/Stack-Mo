import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";

interface PaymentCountdownProps {
  expiryDate: Date | number;
  onExpire?: () => void;
  className?: string;
}

export function PaymentCountdown({
  expiryDate,
  onExpire,
  className,
}: PaymentCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<{
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const expiry = new Date(expiryDate).getTime();
      const difference = expiry - now;

      if (difference <= 0) {
        setTimeLeft(null);
        onExpire?.();
        return;
      }

      setTimeLeft({
        hours: Math.floor(difference / (1000 * 60 * 60)),
        minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((difference % (1000 * 60)) / 1000),
      });
    };

    // Initial calculation
    calculateTimeLeft();

    // Update every second
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [expiryDate, onExpire]);

  if (!timeLeft) {
    return (
      <div
        className={cn(
          "flex items-center justify-center text-red-600 font-medium",
          className
        )}
      >
        Payment expired
      </div>
    );
  }

  // Format numbers to always have two digits
  const format = (num: number) => num.toString().padStart(2, "0");

  return (
    <div
      className={cn(
        "flex items-center gap-2 text-yellow-800 bg-yellow-50 px-4 py-2 rounded-lg",
        className
      )}
    >
      <Clock className="h-4 w-4" />
      <div className="flex items-center gap-1">
        <span className="font-mono font-medium">{format(timeLeft.hours)}</span>
        <span>:</span>
        <span className="font-mono font-medium">{format(timeLeft.minutes)}</span>
        <span>:</span>
        <span className="font-mono font-medium">{format(timeLeft.seconds)}</span>
      </div>
      <span className="text-sm">remaining</span>
    </div>
  );
}

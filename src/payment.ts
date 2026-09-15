import { Payment } from "./types";

// Result of processing payment
export interface PaymentResult {
  success: boolean;
  message: string;
  changeDue?: number;
}

// Process payment using type narrowing with 'in' and equality
export function processPayment(
  payment: Payment,
  finalAmount: number
): PaymentResult {
  // Cash Payment narrowing
  if (payment.method === "cash" && "receivedAmount" in payment) {
    if (payment.receivedAmount < finalAmount) {
      const shortAmount = Number((finalAmount - payment.receivedAmount).toFixed(2));
      return {
        success: false,
        message: `Insufficient cash. Short by ₹${shortAmount}`,
      };
    }

    const changeDue = Number((payment.receivedAmount - finalAmount).toFixed(2));
    return {
      success: true,
      message: `Cash payment received: ₹${payment.receivedAmount}. Change returned: ₹${changeDue}`,
      changeDue,
    };
  }

  // Card Payment narrowing
  if (payment.method === "card" && "last4Digits" in payment) {
    if (payment.last4Digits.length !== 4 || isNaN(Number(payment.last4Digits))) {
      return {
        success: false,
        message: "Invalid card digits. Please enter valid 4 digits.",
      };
    }

    return {
      success: true,
      message: `Card payment of ₹${finalAmount} authorized (Card ending with ${payment.last4Digits}).`,
    };
  }

  // UPI Payment narrowing
  if (payment.method === "upi" && "transactionId" in payment) {
    if (!payment.transactionId || payment.transactionId.trim() === "") {
      return {
        success: false,
        message: "Invalid UPI transaction ID.",
      };
    }

    return {
      success: true,
      message: `UPI payment of ₹${finalAmount} received (Txn ID: ${payment.transactionId}).`,
    };
  }

  return {
    success: false,
    message: "Unknown payment method.",
  };
}

// Helper to format payment info into readable string using narrowing
export function getPaymentSummary(payment: Payment): string {
  if (payment.method === "cash") {
    return `Cash (Received: ₹${payment.receivedAmount})`;
  } else if (payment.method === "card") {
    return `Card (Ending in ${payment.last4Digits})`;
  } else {
    return `UPI (Ref ID: ${payment.transactionId})`;
  }
}

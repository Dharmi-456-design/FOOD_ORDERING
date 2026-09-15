import { BillResult, CartItem, Customer, Payment } from "./types.js";
import { isMember } from "./customer.js";

// Calculate cart subtotal using reduce
export function calculateSubtotal(cart: CartItem[]): number {
  return cart.reduce((total, item) => total + item.price * item.quantity, 0);
}

// Calculate membership and additional discounts
export interface DiscountBreakdown {
  membershipDiscount: number;
  additionalDiscount: number;
  totalDiscount: number;
}

export function calculateDiscount(
  subtotal: number,
  customer: Customer
): DiscountBreakdown {
  let membershipDiscount = 0;

  // Use type narrowing with 'isMember' (checks 'membershipId' in customer)
  if (isMember(customer)) {
    membershipDiscount = (subtotal * customer.discountPercentage) / 100;
  }

  // Additional 5% discount if subtotal > ₹2000
  let additionalDiscount = 0;
  if (subtotal > 2000) {
    additionalDiscount = (subtotal * 5) / 100;
  }

  const totalDiscount = membershipDiscount + additionalDiscount;

  return {
    membershipDiscount: Number(membershipDiscount.toFixed(2)),
    additionalDiscount: Number(additionalDiscount.toFixed(2)),
    totalDiscount: Number(totalDiscount.toFixed(2)),
  };
}

// Calculate 5% GST on the amount after discount
export function calculateTax(amountAfterDiscount: number): number {
  const tax = (amountAfterDiscount * 5) / 100;
  return Number(tax.toFixed(2));
}

// Calculate final payable amount
export function calculateFinalAmount(
  subtotal: number,
  totalDiscount: number,
  tax: number
): number {
  const finalAmount = subtotal - totalDiscount + tax;
  return Number(finalAmount.toFixed(2));
}

// Generate bill returning a discriminated union (BillResult)
export function generateBill(
  orderId: number,
  customer: Customer,
  cart: CartItem[],
  payment: Payment
): BillResult {
  // Validate cart is not empty
  if (cart.length === 0) {
    return {
      status: "error",
      message: "Cart is empty. Cannot generate bill.",
    };
  }

  const subtotal = calculateSubtotal(cart);
  const discounts = calculateDiscount(subtotal, customer);
  const amountAfterDiscount = subtotal - discounts.totalDiscount;
  const tax = calculateTax(amountAfterDiscount);
  const finalAmount = calculateFinalAmount(subtotal, discounts.totalDiscount, tax);

  return {
    status: "success",
    bill: {
      orderId,
      customer,
      items: [...cart],
      subtotal,
      membershipDiscount: discounts.membershipDiscount,
      additionalDiscount: discounts.additionalDiscount,
      totalDiscount: discounts.totalDiscount,
      tax,
      finalAmount,
      payment,
      status: "confirmed",
      createdAt: new Date(),
    },
  };
}

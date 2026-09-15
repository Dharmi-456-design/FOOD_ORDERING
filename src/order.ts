import { BillDetails, OrderStatus } from "./types";
import { getPaymentSummary } from "./payment";

// Exhaustiveness check helper using 'never' as requested in assignment
export function assertNever(value: never): never {
  throw new Error(`Unhandled order status value: ${value}`);
}

// In-memory list of placed orders (Additional Feature: Order History)
export const orderHistory: BillDetails[] = [];

// Add completed bill to order history
export function saveOrder(bill: BillDetails): void {
  orderHistory.push(bill);
}

// Update order status with validation and exhaustive check
export function updateOrderStatus(
  order: BillDetails,
  newStatus: OrderStatus
): BillDetails {
  // Exhaustive status check demo using switch and assertNever
  switch (newStatus) {
    case "pending":
    case "confirmed":
    case "preparing":
    case "delivered":
    case "cancelled":
      order.status = newStatus;
      return order;
    default:
      // TypeScript verifies this branch is unreachable when all union cases are handled
      return assertNever(newStatus);
  }
}

// Pretty print the order bill in terminal
export function displayBill(bill: BillDetails): void {
  console.log("\n========================================");
  console.log("             ORDER SUMMARY              ");
  console.log("========================================");
  console.log(`Order ID: #${bill.orderId}`);
  console.log(`Customer: ${bill.customer.name}`);
  console.log(
    `Type:     ${
      bill.customer.type === "member"
        ? `Member (${bill.customer.membershipLevel.toUpperCase()})`
        : "Guest"
    }`
  );
  if (bill.customer.type === "member") {
    console.log(`Card ID:  ${bill.customer.membershipId}`);
  }
  console.log("\nItems:");
  console.log("----------------------------------------");

  bill.items.forEach((item) => {
    const itemTotal = item.price * item.quantity;
    const itemLine = `${item.name.padEnd(22)} x${item.quantity}`.padEnd(28);
    console.log(`${itemLine} ₹${itemTotal}`);
    if (item.specialInstruction) {
      console.log(`  └─ Note: ${item.specialInstruction}`);
    }
  });

  console.log("----------------------------------------");
  console.log(`Subtotal:                       ₹${bill.subtotal.toFixed(2)}`);

  if (bill.membershipDiscount > 0) {
    console.log(
      `Membership Discount:            -₹${bill.membershipDiscount.toFixed(2)}`
    );
  }
  if (bill.additionalDiscount > 0) {
    console.log(
      `Additional Discount (>₹2000):   -₹${bill.additionalDiscount.toFixed(2)}`
    );
  }
  if (bill.totalDiscount === 0) {
    console.log(`Total Discount:                 ₹0.00`);
  }

  console.log(`GST (5%):                       ₹${bill.tax.toFixed(2)}`);
  console.log("----------------------------------------");
  console.log(`Final Amount:                   ₹${bill.finalAmount.toFixed(2)}`);
  console.log("----------------------------------------");
  console.log(`Payment:      ${getPaymentSummary(bill.payment)}`);
  console.log(`Order Status: ${bill.status.toUpperCase()}`);
  console.log("========================================");
  console.log("        Thank you for ordering!         ");
  console.log("========================================\n");
}

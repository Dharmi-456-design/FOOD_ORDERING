import * as readline from "readline/promises";
import { stdin as input, stdout as output } from "process";

import {
  CartItem,
  Customer,
  FoodCategory,
  FoodItem,
  MembershipLevel,
  OrderStatus,
  Payment,
} from "./types";
import { foodItems } from "./data";
import {
  createGuestCustomer,
  createMemberCustomer,
  isMember,
} from "./customer";
import {
  addToCart,
  calculateItemTotal,
  removeFromCart,
  updateQuantity,
} from "./cart";
import {
  calculateDiscount,
  calculateFinalAmount,
  calculateSubtotal,
  calculateTax,
  generateBill,
} from "./billing";
import { processPayment } from "./payment";
import {
  displayBill,
  orderHistory,
  saveOrder,
  updateOrderStatus,
} from "./order";

// Global in-memory session state
let currentCustomer: Customer = createGuestCustomer(1, "Guest Customer");
let currentCart: CartItem[] = [];
let nextOrderId = 101;

// Readline interface for terminal input
const rl = readline.createInterface({ input, output });

// Helper to ask a question
async function ask(question: string): Promise<string> {
  const answer = await rl.question(question);
  return answer.trim();
}

// 1. Display Food Items (with optional category filter)
async function displayFoodMenu(): Promise<void> {
  console.log("\n--- Category Filter ---");
  console.log("1. All Items");
  console.log("2. Pizza");
  console.log("3. Burger");
  console.log("4. Drinks");
  console.log("5. Desserts");

  const choice = await ask("Filter by (1-5, default 1): ");
  let filteredItems: FoodItem[] = foodItems;

  if (choice === "2") {
    filteredItems = foodItems.filter((i) => i.category === "pizza");
  } else if (choice === "3") {
    filteredItems = foodItems.filter((i) => i.category === "burger");
  } else if (choice === "4") {
    filteredItems = foodItems.filter((i) => i.category === "drink");
  } else if (choice === "5") {
    filteredItems = foodItems.filter((i) => i.category === "dessert");
  }

  console.log("\n================ AVAILABLE FOOD MENU ================");
  console.log("ID   Name                           Category   Price  Status");
  console.log("-----------------------------------------------------");

  filteredItems.forEach((item) => {
    const idStr = item.id.toString().padEnd(4);
    const nameStr = item.name.padEnd(30);
    const catStr = item.category.padEnd(10);
    const priceStr = `₹${item.price}`.padEnd(7);
    const statusStr = item.isAvailable ? "Available" : "Sold Out";
    console.log(`${idStr} ${nameStr} ${catStr} ${priceStr} ${statusStr}`);
  });
  console.log("=====================================================\n");
}

// 2. Select or Create Customer
async function handleCustomerSetup(): Promise<void> {
  console.log("\n--- Customer Setup ---");
  console.log("1. Guest Customer (0% discount)");
  console.log("2. Member Customer (Silver: 5%, Gold: 10%, Platinum: 15%)");

  const typeChoice = await ask("Select customer type (1 or 2): ");
  const name = (await ask("Enter customer name: ")) || "Customer";
  const phone = await ask("Enter phone number (optional): ");
  const address = (await ask("Enter address (default: Dine-in): ")) || "Dine-in";

  if (typeChoice === "2") {
    console.log("\nMembership Tiers:");
    console.log("1. Silver (5% discount)");
    console.log("2. Gold (10% discount)");
    console.log("3. Platinum (15% discount)");

    const tierChoice = await ask("Select tier (1-3): ");
    let level: MembershipLevel = "silver";
    if (tierChoice === "2") level = "gold";
    if (tierChoice === "3") level = "platinum";

    currentCustomer = createMemberCustomer(
      Date.now() % 10000,
      name,
      level,
      phone || undefined,
      address
    );

    console.log(
      `\n✓ Member customer created: ${currentCustomer.name} (${currentCustomer.membershipLevel.toUpperCase()} - ${currentCustomer.discountPercentage}% off)`
    );
  } else {
    currentCustomer = createGuestCustomer(
      Date.now() % 10000,
      name,
      phone || undefined,
      address
    );
    console.log(`\n✓ Guest customer created: ${currentCustomer.name}`);
  }
}

// 3. Add Item to Cart
async function handleAddToCart(): Promise<void> {
  console.log("\n--- Add Item to Cart ---");
  const idInput = await ask("Enter Food Item ID: ");
  const itemId = parseInt(idInput, 10);

  const foodItem = foodItems.find((item) => item.id === itemId);

  if (!foodItem) {
    console.log("❌ Item not found with that ID.");
    return;
  }

  if (!foodItem.isAvailable) {
    console.log(`❌ Sorry, "${foodItem.name}" is currently unavailable.`);
    return;
  }

  const qtyInput = await ask(`Enter quantity for "${foodItem.name}": `);
  const quantity = parseInt(qtyInput, 10);

  if (isNaN(quantity) || quantity <= 0) {
    console.log("❌ Quantity must be a positive number.");
    return;
  }

  const specialInstruction = await ask(
    "Special instruction (optional, e.g. Extra cheese / Less spicy): "
  );

  currentCart = addToCart(
    currentCart,
    foodItem,
    quantity,
    specialInstruction || undefined
  );

  console.log(`\n✓ Added ${quantity}x "${foodItem.name}" to cart.`);
}

// 4. View Cart
function displayCart(): void {
  console.log("\n================ YOUR CART ================");
  if (currentCart.length === 0) {
    console.log("Your cart is currently empty.");
    console.log("===========================================\n");
    return;
  }

  console.log("ID   Item Name                      Qty   Price    Total");
  console.log("---------------------------------------------------");

  currentCart.forEach((item) => {
    const idStr = item.id.toString().padEnd(4);
    const nameStr = item.name.padEnd(30);
    const qtyStr = `x${item.quantity}`.padEnd(5);
    const priceStr = `₹${item.price}`.padEnd(8);
    const totalStr = `₹${calculateItemTotal(item)}`;
    console.log(`${idStr} ${nameStr} ${qtyStr} ${priceStr} ${totalStr}`);

    if (item.specialInstruction) {
      console.log(`     └─ Note: ${item.specialInstruction}`);
    }
  });

  const subtotal = calculateSubtotal(currentCart);
  console.log("---------------------------------------------------");
  console.log(`Subtotal: ₹${subtotal}`);
  console.log("===========================================\n");
}

// 5. Update Item Quantity
async function handleUpdateQuantity(): Promise<void> {
  if (currentCart.length === 0) {
    console.log("\n❌ Cart is empty.");
    return;
  }

  displayCart();
  const idInput = await ask("Enter Food Item ID to update: ");
  const itemId = parseInt(idInput, 10);

  const cartItem = currentCart.find((i) => i.id === itemId);
  if (!cartItem) {
    console.log("❌ Item not found in cart.");
    return;
  }

  const qtyInput = await ask(`Enter new quantity for "${cartItem.name}": `);
  const newQty = parseInt(qtyInput, 10);

  if (isNaN(newQty)) {
    console.log("❌ Invalid quantity.");
    return;
  }

  currentCart = updateQuantity(currentCart, itemId, newQty);
  console.log(
    `\n✓ Quantity updated for "${cartItem.name}". (New Qty: ${Math.max(0, newQty)})`
  );
}

// 6. Remove Item from Cart
async function handleRemoveFromCart(): Promise<void> {
  if (currentCart.length === 0) {
    console.log("\n❌ Cart is empty.");
    return;
  }

  displayCart();
  const idInput = await ask("Enter Food Item ID to remove: ");
  const itemId = parseInt(idInput, 10);

  const cartItem = currentCart.find((i) => i.id === itemId);
  if (!cartItem) {
    console.log("❌ Item not found in cart.");
    return;
  }

  currentCart = removeFromCart(currentCart, itemId);
  console.log(`\n✓ Removed "${cartItem.name}" from cart.`);
}

// 7. Checkout & Payment
async function handleCheckout(): Promise<void> {
  if (currentCart.length === 0) {
    console.log("\n❌ Cannot checkout: Cart is empty.");
    return;
  }

  const subtotal = calculateSubtotal(currentCart);
  const discounts = calculateDiscount(subtotal, currentCustomer);
  const amountAfterDiscount = subtotal - discounts.totalDiscount;
  const tax = calculateTax(amountAfterDiscount);
  const finalAmount = calculateFinalAmount(subtotal, discounts.totalDiscount, tax);

  console.log("\n--- Checkout Breakdown ---");
  console.log(`Customer:            ${currentCustomer.name}`);
  console.log(
    `Type:                ${
      isMember(currentCustomer)
        ? `Member (${currentCustomer.membershipLevel.toUpperCase()} - ${currentCustomer.discountPercentage}%)`
        : "Guest (0%)"
    }`
  );
  console.log(`Subtotal:            ₹${subtotal.toFixed(2)}`);
  console.log(`Membership Discount: ₹${discounts.membershipDiscount.toFixed(2)}`);
  console.log(`Additional Discount: ₹${discounts.additionalDiscount.toFixed(2)}`);
  console.log(`Total Discount:      ₹${discounts.totalDiscount.toFixed(2)}`);
  console.log(`Amount After Disc.:  ₹${amountAfterDiscount.toFixed(2)}`);
  console.log(`GST (5%):            ₹${tax.toFixed(2)}`);
  console.log(`Final Payable:       ₹${finalAmount.toFixed(2)}`);

  console.log("\nSelect Payment Method:");
  console.log("1. Cash");
  console.log("2. Card");
  console.log("3. UPI");

  const payChoice = await ask("Choose payment option (1-3): ");
  let payment: Payment;

  if (payChoice === "1") {
    const cashInput = await ask(
      `Enter cash received (minimum ₹${finalAmount}): `
    );
    const receivedAmount = parseFloat(cashInput);

    if (isNaN(receivedAmount)) {
      console.log("❌ Invalid cash amount entered.");
      return;
    }

    payment = {
      method: "cash",
      receivedAmount,
    };
  } else if (payChoice === "2") {
    const last4Digits = await ask("Enter last 4 digits of card: ");
    payment = {
      method: "card",
      last4Digits,
    };
  } else if (payChoice === "3") {
    const transactionId = (await ask("Enter UPI Transaction ID: ")) || `UPI${Date.now()}`;
    payment = {
      method: "upi",
      transactionId,
    };
  } else {
    console.log("❌ Invalid payment method selected.");
    return;
  }

  // Process payment using narrowing
  const payResult = processPayment(payment, finalAmount);
  if (!payResult.success) {
    console.log(`\n❌ Payment failed: ${payResult.message}`);
    return;
  }

  console.log(`\n✓ ${payResult.message}`);

  // Generate Bill using discriminated union
  const billResult = generateBill(nextOrderId++, currentCustomer, currentCart, payment);

  // Type narrowing using discriminant 'status'
  if (billResult.status === "error") {
    console.log(`\n❌ Error generating bill: ${billResult.message}`);
  } else {
    saveOrder(billResult.bill);
    displayBill(billResult.bill);
    // Reset cart for new order
    currentCart = [];
  }
}

// 8. Change Order Status
async function handleChangeOrderStatus(): Promise<void> {
  if (orderHistory.length === 0) {
    console.log("\n❌ No active orders to update.");
    return;
  }

  console.log("\nActive Orders:");
  orderHistory.forEach((o) => {
    console.log(
      `Order #${o.orderId} - Customer: ${o.customer.name} - Status: ${o.status.toUpperCase()}`
    );
  });

  const orderIdInput = await ask("Enter Order ID to update: ");
  const orderId = parseInt(orderIdInput, 10);
  const order = orderHistory.find((o) => o.orderId === orderId);

  if (!order) {
    console.log("❌ Order not found.");
    return;
  }

  console.log(`\nCurrent status: ${order.status}`);
  console.log("Available statuses:");
  console.log("1. pending");
  console.log("2. confirmed");
  console.log("3. preparing");
  console.log("4. delivered");
  console.log("5. cancelled");

  const statusChoice = await ask("Select new status (1-5): ");
  let newStatus: OrderStatus;

  switch (statusChoice) {
    case "1":
      newStatus = "pending";
      break;
    case "2":
      newStatus = "confirmed";
      break;
    case "3":
      newStatus = "preparing";
      break;
    case "4":
      newStatus = "delivered";
      break;
    case "5":
      newStatus = "cancelled";
      break;
    default:
      console.log("❌ Invalid status option.");
      return;
  }

  updateOrderStatus(order, newStatus);
  console.log(
    `\n✓ Order #${order.orderId} status updated to: ${newStatus.toUpperCase()}`
  );
}

// 9. Order History (Additional Feature)
function viewOrderHistory(): void {
  console.log("\n================ ORDER HISTORY ================");
  if (orderHistory.length === 0) {
    console.log("No orders have been placed yet.");
    console.log("===============================================\n");
    return;
  }

  orderHistory.forEach((order) => {
    console.log(
      `#${order.orderId} | ${order.customer.name.padEnd(15)} | Final: ₹${order.finalAmount
        .toFixed(2)
        .padEnd(8)} | Status: ${order.status.toUpperCase()}`
    );
  });
  console.log("===============================================\n");
}

// Main Menu Loop
async function main(): Promise<void> {
  console.log("\n========================================");
  console.log("       FOOD ORDERING & BILLING          ");
  console.log("========================================");

  let running = true;

  while (running) {
    const customerInfo = isMember(currentCustomer)
      ? `${currentCustomer.name} (Member: ${currentCustomer.membershipLevel.toUpperCase()})`
      : `${currentCustomer.name} (Guest)`;

    console.log(`\nActive Customer: [${customerInfo}] | Cart Items: [${currentCart.length}]`);
    console.log("----------------------------------------");
    console.log("1. View Food Menu");
    console.log("2. Create / Select Customer");
    console.log("3. Add Item to Cart");
    console.log("4. View Cart");
    console.log("5. Update Item Quantity");
    console.log("6. Remove Item from Cart");
    console.log("7. Checkout & Pay");
    console.log("8. Change Order Status");
    console.log("9. View Order History");
    console.log("10. Exit");
    console.log("----------------------------------------");

    const option = await ask("Select an option (1-10): ");

    switch (option) {
      case "1":
        await displayFoodMenu();
        break;
      case "2":
        await handleCustomerSetup();
        break;
      case "3":
        await handleAddToCart();
        break;
      case "4":
        displayCart();
        break;
      case "5":
        await handleUpdateQuantity();
        break;
      case "6":
        await handleRemoveFromCart();
        break;
      case "7":
        await handleCheckout();
        break;
      case "8":
        await handleChangeOrderStatus();
        break;
      case "9":
        viewOrderHistory();
        break;
      case "10":
        console.log("\nThank you for using Food Ordering System. Goodbye!");
        running = false;
        break;
      default:
        console.log("❌ Invalid option. Please select 1 to 10.");
        break;
    }
  }

  rl.close();
}

// Run the application
main().catch((err) => {
  console.error("An unexpected error occurred:", err);
  rl.close();
});

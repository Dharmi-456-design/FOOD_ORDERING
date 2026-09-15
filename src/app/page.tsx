"use client";

import { useState } from "react";
import { FoodItem, CartItem, Customer, Payment, BillDetails, MembershipLevel, OrderStatus } from "@/types";
import { foodItems } from "@/data";
import { createGuestCustomer, createMemberCustomer, isMember } from "@/customer";
import { addToCart, removeFromCart, updateQuantity, calculateItemTotal } from "@/cart";
import {
  calculateSubtotal,
  calculateDiscount,
  calculateTax,
  calculateFinalAmount,
  generateBill,
} from "@/billing";
import { processPayment } from "@/payment";
import { saveOrder, updateOrderStatus, orderHistory } from "@/order";

// ============================================================
// SECTION: TYPES for UI state
// ============================================================
type AppView = "menu" | "cart" | "checkout" | "bill" | "history";
type PaymentMethod = "cash" | "card" | "upi";

// ============================================================
// COMPONENT: Navbar
// ============================================================
function Navbar({
  cartCount,
  onViewChange,
  activeView,
}: {
  cartCount: number;
  onViewChange: (view: AppView) => void;
  activeView: AppView;
}) {
  return (
    <nav className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🍕</span>
          <h1 className="text-xl font-bold text-orange-400">FoodOrder</h1>
        </div>
        <div className="flex items-center gap-2">
          {(["menu", "cart", "history"] as AppView[]).map((view) => (
            <button
              key={view}
              id={`nav-${view}`}
              onClick={() => onViewChange(view)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                activeView === view
                  ? "bg-orange-500 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
            >
              {view === "cart" ? `🛒 Cart (${cartCount})` : view === "history" ? "📋 Orders" : "🍽 Menu"}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}

// ============================================================
// COMPONENT: Food Menu Card
// ============================================================
function FoodCard({
  item,
  onAdd,
}: {
  item: FoodItem;
  onAdd: (item: FoodItem) => void;
}) {
  const emojiMap: Record<string, string> = {
    pizza: "🍕",
    burger: "🍔",
    drink: "🥤",
    dessert: "🍰",
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex flex-col gap-3 hover:border-orange-500/50 transition-all">
      <div className="text-4xl text-center">{emojiMap[item.category]}</div>
      <div>
        <h3 className="font-semibold text-white">{item.name}</h3>
        <p className="text-xs text-gray-500 capitalize mt-0.5">{item.category}</p>
      </div>
      <div className="flex items-center justify-between mt-auto">
        <span className="text-orange-400 font-bold text-lg">₹{item.price}</span>
        {item.isAvailable ? (
          <button
            id={`add-item-${item.id}`}
            onClick={() => onAdd(item)}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
          >
            + Add
          </button>
        ) : (
          <span className="text-red-400 text-sm">Sold Out</span>
        )}
      </div>
    </div>
  );
}

// ============================================================
// COMPONENT: Menu Page
// ============================================================
function MenuPage({
  onAddToCart,
}: {
  onAddToCart: (item: FoodItem) => void;
}) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const categories = ["all", "pizza", "burger", "drink", "dessert"];

  const filtered =
    selectedCategory === "all"
      ? foodItems
      : foodItems.filter((i) => i.category === selectedCategory);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold text-white mb-6">Our Menu</h2>

      {/* Category Filter */}
      <div className="flex gap-2 mb-8 flex-wrap">
        {categories.map((cat) => (
          <button
            key={cat}
            id={`filter-${cat}`}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-full text-sm font-medium capitalize transition-colors ${
              selectedCategory === cat
                ? "bg-orange-500 text-white"
                : "bg-gray-800 text-gray-400 hover:text-white"
            }`}
          >
            {cat === "all" ? "All Items" : cat}
          </button>
        ))}
      </div>

      {/* Items Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filtered.map((item) => (
          <FoodCard key={item.id} item={item} onAdd={onAddToCart} />
        ))}
      </div>
    </div>
  );
}

// ============================================================
// COMPONENT: Cart Page
// ============================================================
function CartPage({
  cart,
  customer,
  onUpdateQty,
  onRemove,
  onCheckout,
  onSetCustomer,
}: {
  cart: CartItem[];
  customer: Customer;
  onUpdateQty: (id: number, qty: number) => void;
  onRemove: (id: number) => void;
  onCheckout: () => void;
  onSetCustomer: (c: Customer) => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [type, setType] = useState<"guest" | "member">("guest");
  const [level, setLevel] = useState<MembershipLevel>("silver");
  const [customerSet, setCustomerSet] = useState(false);

  const subtotal = calculateSubtotal(cart);
  const discounts = calculateDiscount(subtotal, customer);
  const amountAfterDiscount = subtotal - discounts.totalDiscount;
  const tax = calculateTax(amountAfterDiscount);
  const finalAmount = calculateFinalAmount(subtotal, discounts.totalDiscount, tax);

  function handleSetCustomer() {
    if (!name.trim()) return;
    const c =
      type === "member"
        ? createMemberCustomer(Date.now() % 10000, name, level, phone || undefined)
        : createGuestCustomer(Date.now() % 10000, name, phone || undefined);
    onSetCustomer(c);
    setCustomerSet(true);
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Cart Items */}
      <div className="lg:col-span-2 space-y-4">
        <h2 className="text-2xl font-bold text-white">Your Cart</h2>
        {cart.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
            <p className="text-4xl mb-3">🛒</p>
            <p className="text-gray-400">Your cart is empty</p>
          </div>
        ) : (
          cart.map((item) => (
            <div
              key={item.id}
              className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex items-center gap-4"
            >
              <div className="flex-1">
                <p className="font-semibold text-white">{item.name}</p>
                <p className="text-orange-400 text-sm">₹{item.price} each</p>
                {item.specialInstruction && (
                  <p className="text-gray-500 text-xs mt-1">📝 {item.specialInstruction}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  id={`qty-dec-${item.id}`}
                  onClick={() => onUpdateQty(item.id, item.quantity - 1)}
                  className="w-8 h-8 rounded-full bg-gray-700 hover:bg-gray-600 text-white text-lg flex items-center justify-center transition-colors"
                >
                  −
                </button>
                <span className="w-6 text-center font-bold">{item.quantity}</span>
                <button
                  id={`qty-inc-${item.id}`}
                  onClick={() => onUpdateQty(item.id, item.quantity + 1)}
                  className="w-8 h-8 rounded-full bg-gray-700 hover:bg-gray-600 text-white text-lg flex items-center justify-center transition-colors"
                >
                  +
                </button>
              </div>
              <p className="font-bold text-white w-20 text-right">
                ₹{calculateItemTotal(item)}
              </p>
              <button
                id={`remove-${item.id}`}
                onClick={() => onRemove(item.id)}
                className="text-red-400 hover:text-red-300 text-xl transition-colors"
              >
                ×
              </button>
            </div>
          ))
        )}

        {/* Customer Setup */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mt-4">
          <h3 className="font-bold text-white mb-4">Customer Details</h3>
          {customerSet ? (
            <div className="text-sm text-gray-300 space-y-1">
              <p>👤 <strong>{customer.name}</strong></p>
              <p>Type: {isMember(customer) ? `Member (${customer.membershipLevel.toUpperCase()}) — ${customer.discountPercentage}% off` : "Guest"}</p>
              <button
                id="change-customer"
                onClick={() => setCustomerSet(false)}
                className="text-orange-400 hover:text-orange-300 text-xs mt-2 underline"
              >
                Change customer
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <input
                id="customer-name"
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
              />
              <input
                id="customer-phone"
                type="text"
                placeholder="Phone (optional)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
              />
              <div className="flex gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    id="type-guest"
                    name="type"
                    value="guest"
                    checked={type === "guest"}
                    onChange={() => setType("guest")}
                    className="accent-orange-500"
                  />
                  <span className="text-sm text-gray-300">Guest</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    id="type-member"
                    name="type"
                    value="member"
                    checked={type === "member"}
                    onChange={() => setType("member")}
                    className="accent-orange-500"
                  />
                  <span className="text-sm text-gray-300">Member</span>
                </label>
              </div>
              {type === "member" && (
                <select
                  id="membership-level"
                  value={level}
                  onChange={(e) => setLevel(e.target.value as MembershipLevel)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-orange-500"
                >
                  <option value="silver">Silver — 5% discount</option>
                  <option value="gold">Gold — 10% discount</option>
                  <option value="platinum">Platinum — 15% discount</option>
                </select>
              )}
              <button
                id="set-customer-btn"
                onClick={handleSetCustomer}
                disabled={!name.trim()}
                className="bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Save Customer
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Order Summary */}
      <div className="space-y-4">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 sticky top-24">
          <h3 className="font-bold text-white mb-4">Order Summary</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-gray-400">
              <span>Subtotal</span>
              <span className="text-white">₹{subtotal.toFixed(2)}</span>
            </div>
            {discounts.membershipDiscount > 0 && (
              <div className="flex justify-between text-green-400">
                <span>Membership Discount</span>
                <span>−₹{discounts.membershipDiscount.toFixed(2)}</span>
              </div>
            )}
            {discounts.additionalDiscount > 0 && (
              <div className="flex justify-between text-green-400">
                <span>Extra Discount (&gt;₹2000)</span>
                <span>−₹{discounts.additionalDiscount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-400">
              <span>GST (5%)</span>
              <span className="text-white">₹{tax.toFixed(2)}</span>
            </div>
            <div className="border-t border-gray-700 pt-2 mt-2 flex justify-between font-bold text-white text-base">
              <span>Total</span>
              <span className="text-orange-400">₹{finalAmount.toFixed(2)}</span>
            </div>
          </div>
          <button
            id="proceed-checkout"
            onClick={onCheckout}
            disabled={cart.length === 0 || !customerSet}
            className="mt-6 w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed text-white py-3 rounded-xl font-semibold transition-colors"
          >
            {cart.length === 0 ? "Add items first" : !customerSet ? "Set customer first" : "Proceed to Pay"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// COMPONENT: Checkout / Payment Page
// ============================================================
function CheckoutPage({
  cart,
  customer,
  onSuccess,
  onBack,
}: {
  cart: CartItem[];
  customer: Customer;
  onSuccess: (bill: BillDetails) => void;
  onBack: () => void;
}) {
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [cashAmount, setCashAmount] = useState("");
  const [cardDigits, setCardDigits] = useState("");
  const [upiTxn, setUpiTxn] = useState("");
  const [error, setError] = useState("");
  const [nextId] = useState(() => 100 + Math.floor(Math.random() * 900));

  const subtotal = calculateSubtotal(cart);
  const discounts = calculateDiscount(subtotal, customer);
  const tax = calculateTax(subtotal - discounts.totalDiscount);
  const finalAmount = calculateFinalAmount(subtotal, discounts.totalDiscount, tax);

  function handlePay() {
    setError("");
    let payment: Payment;

    if (method === "cash") {
      const received = parseFloat(cashAmount);
      if (isNaN(received)) { setError("Enter valid cash amount."); return; }
      payment = { method: "cash", receivedAmount: received };
    } else if (method === "card") {
      if (cardDigits.length !== 4 || isNaN(Number(cardDigits))) {
        setError("Enter valid 4-digit card number.");
        return;
      }
      payment = { method: "card", last4Digits: cardDigits };
    } else {
      if (!upiTxn.trim()) { setError("Enter UPI Transaction ID."); return; }
      payment = { method: "upi", transactionId: upiTxn.trim() };
    }

    const result = processPayment(payment, finalAmount);
    if (!result.success) { setError(result.message); return; }

    const billResult = generateBill(nextId, customer, cart, payment);
    if (billResult.status === "error") { setError(billResult.message); return; }

    saveOrder(billResult.bill);
    onSuccess(billResult.bill);
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <button
        id="back-to-cart"
        onClick={onBack}
        className="text-gray-400 hover:text-white text-sm mb-6 flex items-center gap-2 transition-colors"
      >
        ← Back to Cart
      </button>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-6">
        <h2 className="text-xl font-bold text-white">Payment</h2>

        {/* Bill Breakdown */}
        <div className="bg-gray-800 rounded-xl p-4 space-y-2 text-sm">
          <div className="flex justify-between text-gray-400">
            <span>Subtotal</span><span className="text-white">₹{subtotal.toFixed(2)}</span>
          </div>
          {discounts.totalDiscount > 0 && (
            <div className="flex justify-between text-green-400">
              <span>Total Discount</span><span>−₹{discounts.totalDiscount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-gray-400">
            <span>GST (5%)</span><span className="text-white">₹{tax.toFixed(2)}</span>
          </div>
          <div className="border-t border-gray-700 pt-2 flex justify-between font-bold text-white">
            <span>Pay</span><span className="text-orange-400 text-lg">₹{finalAmount.toFixed(2)}</span>
          </div>
        </div>

        {/* Payment Method Selector */}
        <div>
          <p className="text-sm text-gray-400 mb-3">Choose payment method</p>
          <div className="flex gap-3">
            {(["cash", "card", "upi"] as PaymentMethod[]).map((m) => (
              <button
                key={m}
                id={`pay-${m}`}
                onClick={() => setMethod(m)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium capitalize transition-all border ${
                  method === m
                    ? "bg-orange-500 border-orange-500 text-white"
                    : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500"
                }`}
              >
                {m === "cash" ? "💵 Cash" : m === "card" ? "💳 Card" : "📱 UPI"}
              </button>
            ))}
          </div>
        </div>

        {/* Payment Inputs */}
        {method === "cash" && (
          <input
            id="cash-amount"
            type="number"
            placeholder={`Enter amount (min ₹${finalAmount.toFixed(2)})`}
            value={cashAmount}
            onChange={(e) => setCashAmount(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
          />
        )}
        {method === "card" && (
          <input
            id="card-digits"
            type="text"
            maxLength={4}
            placeholder="Last 4 digits of card"
            value={cardDigits}
            onChange={(e) => setCardDigits(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
          />
        )}
        {method === "upi" && (
          <input
            id="upi-txn"
            type="text"
            placeholder="UPI Transaction ID (e.g. TXN123456)"
            value={upiTxn}
            onChange={(e) => setUpiTxn(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
          />
        )}

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          id="pay-now-btn"
          onClick={handlePay}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-semibold transition-colors"
        >
          Pay ₹{finalAmount.toFixed(2)}
        </button>
      </div>
    </div>
  );
}

// ============================================================
// COMPONENT: Bill Display Page
// ============================================================
function BillPage({
  bill,
  onNewOrder,
}: {
  bill: BillDetails;
  onNewOrder: () => void;
}) {
  const [status, setStatus] = useState<OrderStatus>(bill.status);

  const statuses: OrderStatus[] = ["pending", "confirmed", "preparing", "delivered", "cancelled"];

  function handleStatusChange(s: OrderStatus) {
    updateOrderStatus(bill, s);
    setStatus(s);
  }

  const paymentSummary =
    bill.payment.method === "cash"
      ? `Cash (₹${bill.payment.receivedAmount})`
      : bill.payment.method === "card"
      ? `Card (...${bill.payment.last4Digits})`
      : `UPI (${bill.payment.transactionId})`;

  const statusColors: Record<OrderStatus, string> = {
    pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
    confirmed: "bg-blue-500/20 text-blue-400 border-blue-500/40",
    preparing: "bg-orange-500/20 text-orange-400 border-orange-500/40",
    delivered: "bg-green-500/20 text-green-400 border-green-500/40",
    cancelled: "bg-red-500/20 text-red-400 border-red-500/40",
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      <div className="text-center mb-6">
        <div className="text-5xl mb-3">✅</div>
        <h2 className="text-2xl font-bold text-white">Order Confirmed!</h2>
        <p className="text-gray-400 text-sm mt-1">Order #{bill.orderId}</p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5">
        {/* Customer */}
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Customer</p>
          <p className="font-semibold text-white">{bill.customer.name}</p>
          <p className="text-xs text-gray-400">
            {isMember(bill.customer)
              ? `Member — ${bill.customer.membershipLevel.toUpperCase()}`
              : "Guest"}
          </p>
        </div>

        {/* Items */}
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Items</p>
          <div className="space-y-1">
            {bill.items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-gray-300">
                  {item.name} × {item.quantity}
                </span>
                <span className="text-white">₹{item.price * item.quantity}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bill Breakdown */}
        <div className="border-t border-gray-800 pt-4 space-y-2 text-sm">
          <div className="flex justify-between text-gray-400">
            <span>Subtotal</span><span>₹{bill.subtotal.toFixed(2)}</span>
          </div>
          {bill.membershipDiscount > 0 && (
            <div className="flex justify-between text-green-400">
              <span>Membership Discount</span><span>−₹{bill.membershipDiscount.toFixed(2)}</span>
            </div>
          )}
          {bill.additionalDiscount > 0 && (
            <div className="flex justify-between text-green-400">
              <span>Extra Discount (&gt;₹2000)</span><span>−₹{bill.additionalDiscount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-gray-400">
            <span>GST (5%)</span><span>₹{bill.tax.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-bold text-white text-base border-t border-gray-700 pt-2">
            <span>Total Paid</span>
            <span className="text-orange-400">₹{bill.finalAmount.toFixed(2)}</span>
          </div>
        </div>

        {/* Payment */}
        <div className="bg-gray-800 rounded-xl p-3 text-sm flex justify-between">
          <span className="text-gray-400">Payment</span>
          <span className="text-white">{paymentSummary}</span>
        </div>

        {/* Order Status */}
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Update Order Status</p>
          <div className="flex flex-wrap gap-2">
            {statuses.map((s) => (
              <button
                key={s}
                id={`status-${s}`}
                onClick={() => handleStatusChange(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize border transition-colors ${
                  status === s
                    ? statusColors[s]
                    : "bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Current: <span className="text-white capitalize">{status}</span>
          </p>
        </div>
      </div>

      <button
        id="new-order-btn"
        onClick={onNewOrder}
        className="mt-6 w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-semibold transition-colors"
      >
        Place New Order
      </button>
    </div>
  );
}

// ============================================================
// COMPONENT: Order History Page
// ============================================================
function HistoryPage() {
  const orders = [...orderHistory].reverse();

  const statusColors: Record<OrderStatus, string> = {
    pending: "text-yellow-400",
    confirmed: "text-blue-400",
    preparing: "text-orange-400",
    delivered: "text-green-400",
    cancelled: "text-red-400",
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h2 className="text-2xl font-bold text-white mb-6">Order History</h2>
      {orders.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-gray-400">No orders yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div key={order.orderId} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-bold text-white">Order #{order.orderId}</p>
                  <p className="text-xs text-gray-500">
                    {order.customer.name} •{" "}
                    {isMember(order.customer) ? `Member (${order.customer.membershipLevel})` : "Guest"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-orange-400">₹{order.finalAmount.toFixed(2)}</p>
                  <p className={`text-xs capitalize ${statusColors[order.status]}`}>{order.status}</p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {order.items.map((item) => (
                  <span key={item.id} className="bg-gray-800 text-gray-300 text-xs px-2 py-1 rounded-full">
                    {item.name} ×{item.quantity}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// MAIN PAGE COMPONENT
// ============================================================
export default function HomePage() {
  const [view, setView] = useState<AppView>("menu");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customer, setCustomer] = useState<Customer>(
    createGuestCustomer(1, "Guest Customer")
  );
  const [currentBill, setCurrentBill] = useState<BillDetails | null>(null);

  function handleAddToCart(item: FoodItem) {
    setCart((prev) => addToCart(prev, item, 1));
  }

  function handleUpdateQty(id: number, qty: number) {
    setCart((prev) => updateQuantity(prev, id, qty));
  }

  function handleRemove(id: number) {
    setCart((prev) => removeFromCart(prev, id));
  }

  function handleCheckout() {
    setView("checkout");
  }

  function handlePaySuccess(bill: BillDetails) {
    setCurrentBill(bill);
    setCart([]);
    setView("bill");
  }

  function handleNewOrder() {
    setCurrentBill(null);
    setCustomer(createGuestCustomer(1, "Guest Customer"));
    setView("menu");
  }

  function handleViewChange(v: AppView) {
    // Don't allow going away from bill page until user clicks new order
    if (view === "bill") return;
    setView(v);
  }

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar
        cartCount={cart.reduce((sum, i) => sum + i.quantity, 0)}
        onViewChange={handleViewChange}
        activeView={view}
      />

      {view === "menu" && <MenuPage onAddToCart={handleAddToCart} />}

      {view === "cart" && (
        <CartPage
          cart={cart}
          customer={customer}
          onUpdateQty={handleUpdateQty}
          onRemove={handleRemove}
          onCheckout={handleCheckout}
          onSetCustomer={setCustomer}
        />
      )}

      {view === "checkout" && (
        <CheckoutPage
          cart={cart}
          customer={customer}
          onSuccess={handlePaySuccess}
          onBack={() => setView("cart")}
        />
      )}

      {view === "bill" && currentBill && (
        <BillPage bill={currentBill} onNewOrder={handleNewOrder} />
      )}

      {view === "history" && <HistoryPage />}
    </div>
  );
}

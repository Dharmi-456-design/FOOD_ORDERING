// 1. Food Category literal union
export type FoodCategory = "pizza" | "burger" | "drink" | "dessert";

// 2. Food Item interface
export interface FoodItem {
  id: number;
  name: string;
  category: FoodCategory;
  price: number;
  isAvailable: boolean;
}

// 3. Customer Address
export interface CustomerAddress {
  street: string;
  city: string;
  pincode: string;
}

// 4. Base Customer fields
export interface BaseCustomer {
  id: number;
  name: string;
  phone?: string;
  address: CustomerAddress | string;
}

// 5. Guest Customer
export interface Guest extends BaseCustomer {
  type: "guest";
}

// 6. Membership Level literal union
export type MembershipLevel = "silver" | "gold" | "platinum";

// 7. Member Customer
export interface Member extends BaseCustomer {
  type: "member";
  membershipId: string;
  discountPercentage: number;
  membershipLevel: MembershipLevel;
}

// Customer Union type
export type Customer = Guest | Member;

// 8. Order-specific cart information
export type OrderInfo = {
  quantity: number;
  specialInstruction?: string;
};

// 9. Cart Item: Intersection type combining FoodItem & OrderInfo
export type CartItem = FoodItem & OrderInfo;

// 10. Order Status literal union
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "delivered"
  | "cancelled";

// 11. Payment union types with distinct fields
export interface CashPayment {
  method: "cash";
  receivedAmount: number;
}

export interface CardPayment {
  method: "card";
  last4Digits: string;
}

export interface UpiPayment {
  method: "upi";
  transactionId: string;
}

export type Payment = CashPayment | CardPayment | UpiPayment;

// 12. Successful Bill details
export interface BillDetails {
  orderId: number;
  customer: Customer;
  items: CartItem[];
  subtotal: number;
  membershipDiscount: number;
  additionalDiscount: number;
  totalDiscount: number;
  tax: number;
  finalAmount: number;
  payment: Payment;
  status: OrderStatus;
  createdAt: Date;
}

// 13. Discriminated Union for Bill Result
export type BillResult =
  | {
      status: "success";
      bill: BillDetails;
    }
  | {
      status: "error";
      message: string;
    };

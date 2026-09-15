import { Customer, Guest, Member, MembershipLevel } from "./types.js";

// Helper to create a guest customer
export function createGuestCustomer(
  id: number,
  name: string,
  phone?: string,
  address: string = "Dine-in"
): Guest {
  return {
    id,
    name,
    phone,
    address,
    type: "guest",
  };
}

// Helper to get discount rate for membership level
export function getDiscountForLevel(level: MembershipLevel): number {
  switch (level) {
    case "silver":
      return 5;
    case "gold":
      return 10;
    case "platinum":
      return 15;
  }
}

// Helper to create a member customer
export function createMemberCustomer(
  id: number,
  name: string,
  membershipLevel: MembershipLevel,
  phone?: string,
  address: string = "Dine-in"
): Member {
  const discountPercentage = getDiscountForLevel(membershipLevel);
  const membershipId = `MEM-${membershipLevel.toUpperCase()}-${id}`;

  return {
    id,
    name,
    phone,
    address,
    type: "member",
    membershipId,
    discountPercentage,
    membershipLevel,
  };
}

// Type guard narrowing using the 'in' operator as requested in hints
export function isMember(customer: Customer): customer is Member {
  return "membershipId" in customer;
}

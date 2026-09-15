import { CartItem, FoodItem } from "./types";

// Calculate individual item total (price * quantity)
export function calculateItemTotal(item: CartItem): number {
  return item.price * item.quantity;
}

// Add item to cart or update quantity if already exists
export function addToCart(
  cart: CartItem[],
  foodItem: FoodItem,
  quantity: number,
  specialInstruction?: string
): CartItem[] {
  if (quantity <= 0) {
    return cart;
  }

  // Check if item is available
  if (!foodItem.isAvailable) {
    return cart;
  }

  // Check if item already exists in cart using find
  const existingItemIndex = cart.findIndex((item) => item.id === foodItem.id);

  if (existingItemIndex !== -1) {
    // Return updated cart with increased quantity
    return cart.map((item, index) => {
      if (index === existingItemIndex) {
        return {
          ...item,
          quantity: item.quantity + quantity,
          specialInstruction: specialInstruction || item.specialInstruction,
        };
      }
      return item;
    });
  }

  // Add new cart item combining FoodItem & OrderInfo (Intersection type)
  const newCartItem: CartItem = {
    ...foodItem,
    quantity,
    specialInstruction,
  };

  return [...cart, newCartItem];
}

// Update quantity of an item in the cart
export function updateQuantity(
  cart: CartItem[],
  foodItemId: number,
  quantity: number
): CartItem[] {
  if (quantity <= 0) {
    // Remove if quantity set to 0 or negative
    return removeFromCart(cart, foodItemId);
  }

  return cart.map((item) => {
    if (item.id === foodItemId) {
      return {
        ...item,
        quantity,
      };
    }
    return item;
  });
}

// Remove an item from the cart
export function removeFromCart(
  cart: CartItem[],
  foodItemId: number
): CartItem[] {
  return cart.filter((item) => item.id !== foodItemId);
}

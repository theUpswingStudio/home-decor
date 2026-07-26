import {
  MAX_CART_LINES,
  MAX_CART_QUANTITY,
  MIN_CART_QUANTITY,
  type CartAction,
  type CartItem,
} from "./types";

export function clampCartQuantity(quantity: number): number {
  return Math.min(
    MAX_CART_QUANTITY,
    Math.max(MIN_CART_QUANTITY, Math.trunc(quantity)),
  );
}

export function cartReducer(
  items: readonly CartItem[],
  action: CartAction,
): readonly CartItem[] {
  switch (action.type) {
    case "add": {
      const index = items.findIndex((item) => item.variantId === action.variantId);
      if (index === -1) {
        if (items.length >= MAX_CART_LINES) return items;
        return [
          ...items,
          {
            variantId: action.variantId,
            quantity: clampCartQuantity(action.quantity),
          },
        ];
      }

      const current = items[index];
      const quantity = clampCartQuantity(current.quantity + action.quantity);
      if (quantity === current.quantity) return items;

      return items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, quantity } : item,
      );
    }
    case "set-quantity": {
      const quantity = clampCartQuantity(action.quantity);
      let changed = false;
      const nextItems = items.map((item) => {
        if (item.variantId !== action.variantId || item.quantity === quantity) {
          return item;
        }
        changed = true;
        return { ...item, quantity };
      });
      return changed ? nextItems : items;
    }
    case "remove":
      return items.filter((item) => item.variantId !== action.variantId);
    case "remove-many": {
      const variantIds = new Set(action.variantIds);
      const nextItems = items.filter((item) => !variantIds.has(item.variantId));
      return nextItems.length === items.length ? items : nextItems;
    }
    case "clear":
      return items.length === 0 ? items : [];
  }
}

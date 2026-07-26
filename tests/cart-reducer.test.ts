import { describe, expect, it } from "vitest";
import { cartReducer, clampCartQuantity } from "@/lib/cart/reducer";
import {
  MAX_CART_LINES,
  MAX_CART_QUANTITY,
  type CartItem,
} from "@/lib/cart/types";

describe("cart quantity normalization", () => {
  it("truncates fractions and clamps quantities to the supported range", () => {
    expect(clampCartQuantity(-12)).toBe(1);
    expect(clampCartQuantity(1.9)).toBe(1);
    expect(clampCartQuantity(4.9)).toBe(4);
    expect(clampCartQuantity(1000)).toBe(MAX_CART_QUANTITY);
  });
});

describe("cartReducer", () => {
  it("adds a normalized line and increments an existing variant", () => {
    const added = cartReducer([], {
      type: "add",
      variantId: "variant-a",
      quantity: 2.8,
    });
    expect(added).toEqual([{ variantId: "variant-a", quantity: 2 }]);

    const incremented = cartReducer(added, {
      type: "add",
      variantId: "variant-a",
      quantity: 200,
    });
    expect(incremented).toEqual([
      { variantId: "variant-a", quantity: MAX_CART_QUANTITY },
    ]);
  });

  it("does not exceed the maximum distinct line count", () => {
    const fullCart: CartItem[] = Array.from(
      { length: MAX_CART_LINES },
      (_, index) => ({ variantId: `variant-${index}`, quantity: 1 }),
    );
    expect(
      cartReducer(fullCart, {
        type: "add",
        variantId: "one-too-many",
        quantity: 1,
      }),
    ).toBe(fullCart);
  });

  it("sets and normalizes an existing quantity", () => {
    const items: readonly CartItem[] = [
      { variantId: "variant-a", quantity: 2 },
      { variantId: "variant-b", quantity: 3 },
    ];

    expect(
      cartReducer(items, {
        type: "set-quantity",
        variantId: "variant-a",
        quantity: 0,
      }),
    ).toEqual([
      { variantId: "variant-a", quantity: 1 },
      { variantId: "variant-b", quantity: 3 },
    ]);
    expect(
      cartReducer(items, {
        type: "set-quantity",
        variantId: "missing",
        quantity: 5,
      }),
    ).toBe(items);
  });

  it("removes one variant and clears the cart", () => {
    const items: readonly CartItem[] = [
      { variantId: "variant-a", quantity: 2 },
      { variantId: "variant-b", quantity: 3 },
    ];

    expect(
      cartReducer(items, { type: "remove", variantId: "variant-a" }),
    ).toEqual([{ variantId: "variant-b", quantity: 3 }]);
    expect(cartReducer(items, { type: "clear" })).toEqual([]);

    expect(
      cartReducer(items, {
        type: "remove-many",
        variantIds: ["variant-a", "missing"],
      }),
    ).toEqual([{ variantId: "variant-b", quantity: 3 }]);

    const empty: readonly CartItem[] = [];
    expect(cartReducer(empty, { type: "clear" })).toBe(empty);
  });
});

"use client";

import { useState } from "react";
import { cartStore } from "@/lib/cart/store";
import { MAX_CART_LINES, MAX_CART_QUANTITY } from "@/lib/cart/types";
import styles from "./add-to-cart-button.module.css";

interface AddToCartButtonProps {
  readonly variantId: string;
  readonly name: string;
  quantity?: number;
}

export function AddToCartButton({
  variantId,
  name,
  quantity = 1,
}: AddToCartButtonProps) {
  const [status, setStatus] = useState("");

  function addToCart() {
    const result = cartStore.addItem(variantId, quantity);
    if (result.changed) {
      setStatus(
        `${name} added to cart. Quantity ${result.quantity}; ${result.itemCount} ${result.itemCount === 1 ? "item" : "items"} total.`,
      );
      return;
    }

    if (result.reason === "quantity-limit") {
      setStatus(
        `${name} is already at the maximum quantity of ${MAX_CART_QUANTITY}.`,
      );
    } else if (result.reason === "line-limit") {
      setStatus(
        `Cart holds up to ${MAX_CART_LINES} selections. Remove one before adding ${name}.`,
      );
    } else {
      setStatus(`${name} could not be added to cart.`);
    }
  }

  return (
    <div>
      <button className={styles.button} type="button" onClick={addToCart}>
        Add to cart
      </button>
      <p className={styles.status} role="status" aria-atomic="true">
        {status}
      </p>
    </div>
  );
}

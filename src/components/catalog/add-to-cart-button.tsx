"use client";

import { useState } from "react";
import { projectEditStore } from "@/lib/project-edit";
import styles from "./add-to-cart-button.module.css";

interface AddToCartButtonProps {
  readonly productId: string;
  readonly variantId: string;
  readonly name: string;
  quantity?: number;
}

export function AddToCartButton({
  productId,
  variantId,
  name,
  quantity = 1,
}: AddToCartButtonProps) {
  const [status, setStatus] = useState("");

  function saveConfiguration() {
    const result = projectEditStore.saveProduct(productId, variantId, quantity);
    if (result.changed) {
      setStatus(
        `${name} configuration saved to Project Edit. ${result.entryCount} ${result.entryCount === 1 ? "entry" : "entries"} saved.`,
      );
      return;
    }

    if (result.reason === "already-saved") {
      setStatus(`${name} configuration is already in Project Edit.`);
    } else if (result.reason === "entry-limit") {
      setStatus(
        `Project Edit is full. Remove one entry before saving ${name}.`,
      );
    } else {
      setStatus(`${name} could not be saved to Project Edit.`);
    }
  }

  return (
    <div>
      <button className={styles.button} type="button" onClick={saveConfiguration}>
        Save this configuration
      </button>
      <p className={styles.status} role="status" aria-atomic="true">
        {status}
      </p>
    </div>
  );
}

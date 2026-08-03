"use client";

import { useState } from "react";
import { AddToCartButton } from "./add-to-cart-button";
import styles from "./variant-selector.module.css";

export interface VariantChoice {
  readonly id: string;
  readonly sku: string;
  readonly label: string;
  readonly priceMinor: number;
  readonly priceLabel: string;
  readonly leadTimeLabel: string;
  readonly dimensionsLabel: string;
}

interface VariantSelectorProps {
  productId: string;
  productName: string;
  variants: readonly VariantChoice[];
}

export function VariantSelector({ productId, productName, variants }: VariantSelectorProps) {
  const [selectedId, setSelectedId] = useState(variants[0]?.id ?? "");
  const selected = variants.find((variant) => variant.id === selectedId) ?? variants[0];
  if (!selected) return null;

  return (
    <div className={styles.selector}>
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Choose a configuration</legend>
        <ul className={styles.options}>
          {variants.map((variant) => (
            <li key={variant.id}>
              <label className={styles.optionLabel}>
                <input
                  className={styles.radio}
                  type="radio"
                  name="variant"
                  value={variant.id}
                  checked={variant.id === selected.id}
                  onChange={() => setSelectedId(variant.id)}
                />
                <span>{variant.label}</span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>
      <dl className={styles.summary} aria-live="polite">
        <div className={styles.summaryItem}>
          <dt className={styles.term}>Price</dt>
          <dd className={`${styles.description} ${styles.price}`}>{selected.priceLabel}</dd>
        </div>
        <div className={styles.summaryItem}>
          <dt className={styles.term}>Overall</dt>
          <dd className={styles.description}>{selected.dimensionsLabel}</dd>
        </div>
        <div className={styles.summaryItem}>
          <dt className={styles.term}>Lead time</dt>
          <dd className={styles.description}>{selected.leadTimeLabel}</dd>
        </div>
      </dl>
      <AddToCartButton
        productId={productId}
        variantId={selected.id}
        name={productName}
      />
    </div>
  );
}

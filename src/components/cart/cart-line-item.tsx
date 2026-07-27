"use client";

import Image from "next/image";
import { formatPrice } from "@/lib/catalog";
import { clampCartQuantity } from "@/lib/cart/reducer";
import type { ResolvedCartLine } from "@/lib/cart/selectors";
import {
  MAX_CART_QUANTITY,
  MIN_CART_QUANTITY,
} from "@/lib/cart/types";
import styles from "./cart-line-item.module.css";

interface CartLineItemProps {
  readonly line: ResolvedCartLine;
  readonly onQuantityChange: (quantity: number) => void;
  readonly onRemove: () => void;
}

export function CartLineItem({
  line,
  onQuantityChange,
  onRemove,
}: CartLineItemProps) {
  const quantityId = `quantity-${line.variantId}`;

  return (
    <article className={styles.line}>
      <div className={styles.imageFrame}>
        <Image
          className={styles.image}
          src={line.image.url}
          alt={line.image.alt}
          width={line.image.width}
          height={line.image.height}
          sizes="(min-width: 36rem) 11rem, 100vw"
        />
        <p className={styles.imageDisclosure}>
          Reference image; not the exact catalog product.
        </p>
      </div>

      <div className={styles.details}>
        <div className={styles.headingRow}>
          <div>
            <h2 className={styles.name}>{line.product.name}</h2>
            <p className={styles.sku}>SKU {line.variant.sku}</p>
          </div>
          <p className={styles.linePrice}>{formatPrice(line.lineTotalMinor)}</p>
        </div>

        <dl className={styles.options}>
          {line.variant.options.map((option) => (
            <div className={styles.option} key={option.name}>
              <dt>{option.name}</dt>
              <dd>{option.value}</dd>
            </div>
          ))}
        </dl>

        <p className={styles.leadTime}>{line.variant.leadTimeLabel}</p>

        <div className={styles.actions}>
          <div className={styles.quantityField}>
            <label htmlFor={quantityId}>Quantity</label>
            <input
              id={quantityId}
              type="number"
              min={MIN_CART_QUANTITY}
              max={MAX_CART_QUANTITY}
              step={1}
              inputMode="numeric"
              value={line.quantity}
              onChange={(event) => {
                const quantity = event.currentTarget.valueAsNumber;
                if (!Number.isFinite(quantity)) {
                  event.currentTarget.value = String(line.quantity);
                  return;
                }

                const normalizedQuantity = clampCartQuantity(quantity);
                event.currentTarget.value = String(normalizedQuantity);
                onQuantityChange(normalizedQuantity);
              }}
            />
          </div>
          <p className={styles.unitPrice}>
            {formatPrice(line.variant.priceMinor)} each
          </p>
          <button
            id={`remove-${line.variantId}`}
            className={styles.remove}
            type="button"
            onClick={onRemove}
          >
            Remove <span className="sr-only">{line.product.name}</span>
          </button>
        </div>
      </div>
    </article>
  );
}

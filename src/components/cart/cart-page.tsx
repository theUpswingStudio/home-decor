"use client";

import { useState } from "react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { formatPrice } from "@/lib/catalog";
import { clampCartQuantity } from "@/lib/cart/reducer";
import { CART_RETENTION_DAYS } from "@/lib/cart/types";
import { useCart } from "@/lib/cart/use-cart";
import { CartLineItem } from "./cart-line-item";
import styles from "./cart-page.module.css";

const CART_BREADCRUMBS = [
  { href: "/", label: "Home" },
  { label: "Cart" },
] as const;

export function CartLoadingShell() {
  return (
    <Container className={styles.page}>
      <Breadcrumbs items={CART_BREADCRUMBS} />
      <section className={styles.header} aria-labelledby="cart-title">
        <h1 id="cart-title">Your selections</h1>
        <p>Review pieces before starting a design consultation.</p>
      </section>
      <div className={styles.loading} aria-busy="true" aria-live="polite">
        <p>Loading your saved selections…</p>
        <div className={styles.loadingLine} aria-hidden="true" />
        <div className={styles.loadingLine} aria-hidden="true" />
      </div>
    </Container>
  );
}

export function CartPage() {
  const cart = useCart();
  const [announcement, setAnnouncement] = useState("");

  if (cart.status === "loading") return <CartLoadingShell />;

  return (
    <Container className={styles.page}>
      <Breadcrumbs items={CART_BREADCRUMBS} />

      <section className={styles.header} aria-labelledby="cart-title">
        <div>
          <h1 id="cart-title">Your selections</h1>
          <p>
            Keep the room in view. A consultant will confirm dimensions,
            finishes, availability, and delivery access before any proposal.
          </p>
        </div>
        <div className={styles.headerActions}>
          <p className={styles.count}>
            {cart.itemCount} {cart.itemCount === 1 ? "item" : "items"}
          </p>
          {cart.lines.length > 0 ? (
            <button
              className={styles.clear}
              type="button"
              onClick={() => {
                if (cart.clear()) {
                  setAnnouncement("All cart selections cleared.");
                }
              }}
            >
              Clear all selections
            </button>
          ) : null}
        </div>
      </section>

      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>

      {cart.lines.length === 0 ? (
        <section className={styles.empty} aria-labelledby="empty-cart-title">
          <h2 id="empty-cart-title">Nothing is set aside yet.</h2>
          <p>
            Add pieces while browsing, then return here to review the room as a
            whole before requesting guidance.
          </p>
          <ButtonLink href="/shop">Explore the collection</ButtonLink>
          <p className={styles.emptyPersistence}>
            {cart.persistence === "local"
              ? `Future selections will be saved in this browser for up to ${CART_RETENTION_DAYS} days.`
              : "Browser storage is unavailable. Future selections will remain only for this open tab."}
          </p>
        </section>
      ) : (
        <div className={styles.cartLayout}>
          <section aria-labelledby="cart-lines-title">
            <h2 id="cart-lines-title" className="sr-only">
              Cart items
            </h2>
            <ul className={styles.lines}>
              {cart.lines.map((line) => (
                <li className={styles.lineItem} key={line.variantId}>
                  <CartLineItem
                    line={line}
                    onQuantityChange={(quantity) => {
                      const normalizedQuantity = clampCartQuantity(quantity);
                      const changed = cart.setQuantity(
                        line.variantId,
                        normalizedQuantity,
                      );
                      setAnnouncement(
                        changed
                          ? `${line.product.name} quantity updated to ${normalizedQuantity}.`
                          : `${line.product.name} quantity remains at ${line.quantity}.`,
                      );
                    }}
                    onRemove={() => {
                      cart.removeItem(line.variantId);
                      setAnnouncement(`${line.product.name} removed from cart.`);
                    }}
                  />
                </li>
              ))}
            </ul>
          </section>

          <aside className={styles.summary} aria-labelledby="cart-summary-title">
            <h2 id="cart-summary-title">Selection summary</h2>
            <dl className={styles.totals}>
              <div>
                <dt>Subtotal</dt>
                <dd>{formatPrice(cart.subtotalMinor)}</dd>
              </div>
            </dl>
            <p className={styles.qualifier}>
              Product subtotal only. Delivery, tax, access requirements, and
              optional professional installation are reviewed in your proposal.
            </p>
            <ButtonLink
              className={styles.consultationButton}
              href="/design-services/inquire?from=cart"
            >
              Start a consultation
            </ButtonLink>
            <p className={styles.noCheckout}>
              Vestrel House is consultation-only; this is not an online checkout.
            </p>
            <p className={styles.persistence}>
              {cart.persistence === "local"
                ? `Selections are saved in this browser for up to ${CART_RETENTION_DAYS} days.`
                : "Browser storage is unavailable. Selections will remain only for this open tab."}
            </p>
          </aside>
        </div>
      )}
    </Container>
  );
}

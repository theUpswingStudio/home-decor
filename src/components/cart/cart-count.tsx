"use client";

import { useCartCount } from "@/lib/cart/use-cart-snapshot";

interface CartCountProps {
  readonly className?: string;
}

export function CartCount({ className }: CartCountProps) {
  const count = useCartCount();

  return (
    <>
      <span className={className} aria-hidden="true">
        {count}
      </span>
      <span className="sr-only">
        Cart, {count} {count === 1 ? "item" : "items"}
      </span>
    </>
  );
}

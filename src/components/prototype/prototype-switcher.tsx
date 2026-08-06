"use client";

import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect } from "react";
import styles from "./prototype-switcher.module.css";

export interface PrototypeVariant {
  readonly key: string;
  readonly label: string;
}

interface PrototypeSwitcherProps {
  readonly variants: readonly PrototypeVariant[];
  readonly current: string;
  readonly parameter?: string;
}

export function PrototypeSwitcher({
  variants,
  current,
  parameter = "variant",
}: PrototypeSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentIndex = Math.max(
    0,
    variants.findIndex((variant) => variant.key === current),
  );

  const selectVariant = useCallback((index: number) => {
    const nextVariant = variants[(index + variants.length) % variants.length];
    const params = new URLSearchParams(searchParams.toString());
    params.set(parameter, nextVariant.key);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [parameter, pathname, router, searchParams, variants]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      if (
        event.target instanceof HTMLElement &&
        event.target.matches("input, textarea, select, [contenteditable='true']")
      ) {
        return;
      }

      event.preventDefault();
      selectVariant(currentIndex + (event.key === "ArrowRight" ? 1 : -1));
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, selectVariant]);

  if (process.env.NODE_ENV === "production") return null;

  return (
    <nav className={styles.switcher} aria-label="Prototype variants">
      <button
        type="button"
        aria-label="Previous prototype variant"
        onClick={() => selectVariant(currentIndex - 1)}
      >
        <CaretLeftIcon size={18} weight="bold" aria-hidden="true" />
      </button>
      <p aria-live="polite">
        <span>{variants[currentIndex].key}</span>
        {variants[currentIndex].label}
      </p>
      <button
        type="button"
        aria-label="Next prototype variant"
        onClick={() => selectVariant(currentIndex + 1)}
      >
        <CaretRightIcon size={18} weight="bold" aria-hidden="true" />
      </button>
    </nav>
  );
}

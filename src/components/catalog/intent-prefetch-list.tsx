"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useRef } from "react";

interface IntentPrefetchListProps {
  children: ReactNode;
  className: string;
  labelledBy?: string;
}

export function IntentPrefetchList({
  children,
  className,
  labelledBy,
}: IntentPrefetchListProps) {
  const router = useRouter();
  const prefetched = useRef(new Set<string>());

  function prefetchFromTarget(target: EventTarget | null) {
    if (!(target instanceof Element)) return;
    const link = target.closest<HTMLAnchorElement>(
      'a[data-intent-prefetch="true"]',
    );
    const href = link?.getAttribute("href");
    if (!href?.startsWith("/") || prefetched.current.has(href)) return;

    prefetched.current.add(href);
    router.prefetch(href);
  }

  return (
    <ul
      className={className}
      aria-labelledby={labelledBy}
      onPointerOver={(event) => prefetchFromTarget(event.target)}
      onPointerDown={(event) => {
        if (event.pointerType !== "mouse") prefetchFromTarget(event.target);
      }}
      onFocusCapture={(event) => prefetchFromTarget(event.target)}
    >
      {children}
    </ul>
  );
}

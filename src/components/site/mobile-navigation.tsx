"use client";

import { ListIcon, XIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { primaryNavigation } from "./navigation";

const focusableSelector = 'button:not([disabled]), a[href]';

function makeObscuredSiblingsInert(root: HTMLElement): () => void {
  const previousStates: Array<{ element: HTMLElement; inert: boolean }> = [];
  let activeBranch = root;

  while (activeBranch.parentElement) {
    const parent = activeBranch.parentElement;
    for (const sibling of parent.children) {
      if (sibling === activeBranch || !(sibling instanceof HTMLElement)) continue;
      previousStates.push({ element: sibling, inert: sibling.inert });
      sibling.inert = true;
    }
    if (parent === document.body) break;
    activeBranch = parent;
  }

  return () => {
    for (const { element, inert } of previousStates) element.inert = inert;
  };
}

export function MobileNavigation() {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 64rem)");
    const closeAtDesktop = () => {
      if (desktopQuery.matches) setIsOpen(false);
    };

    desktopQuery.addEventListener("change", closeAtDesktop);
    return () => desktopQuery.removeEventListener("change", closeAtDesktop);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const restoreInert = rootRef.current
      ? makeObscuredSiblingsInert(rootRef.current)
      : () => undefined;

    const focusFrame = window.requestAnimationFrame(() => {
      panelRef.current?.querySelector<HTMLElement>("a[href]")?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsOpen(false);
        window.requestAnimationFrame(() => triggerRef.current?.focus());
        return;
      }

      if (event.key !== "Tab") return;

      const focusableElements = Array.from(
        rootRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? [],
      ).filter((element) => element.getClientRects().length > 0);
      const firstElement = focusableElements[0];
      const lastElement = focusableElements.at(-1);

      if (!firstElement || !lastElement) return;

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !rootRef.current?.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("pointerdown", handlePointerDown, true);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.body.style.overflow = previousOverflow;
      restoreInert();
    };
  }, [isOpen]);

  return (
    <div className="mobile-navigation" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="mobile-navigation__trigger"
        aria-controls="mobile-navigation-panel"
        aria-expanded={isOpen}
        aria-label={isOpen ? "Close menu" : "Open menu"}
        onClick={() => setIsOpen((open) => !open)}
      >
        {isOpen ? (
          <XIcon size={22} weight="regular" aria-hidden="true" />
        ) : (
          <ListIcon size={24} weight="regular" aria-hidden="true" />
        )}
      </button>

      {isOpen ? (
        <div
          id="mobile-navigation-panel"
          ref={panelRef}
          className="mobile-navigation__panel"
          role="dialog"
          aria-modal="true"
          aria-label="Main menu"
        >
          <nav className="mobile-navigation__nav" aria-label="Mobile">
            <ul className="mobile-navigation__list">
              {primaryNavigation.map((item, index) => (
                <li key={item.href}>
                  <Link
                    className="mobile-navigation__link"
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                  >
                    <span>{item.label}</span>
                    <span className="mobile-navigation__index" aria-hidden="true">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      ) : null}
    </div>
  );
}

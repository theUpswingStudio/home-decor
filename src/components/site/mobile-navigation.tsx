"use client";

import { ListIcon, XIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  startTransition,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  ViewTransition,
} from "react";
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
  const pathname = usePathname();
  const [openPath, setOpenPath] = useState<string | null>(null);
  const [trackedPath, setTrackedPath] = useState(pathname);
  const isOpen = openPath === pathname;
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreTriggerFocusRef = useRef(true);

  if (trackedPath !== pathname) {
    setTrackedPath(pathname);
    setOpenPath(null);
  }

  function openMenu() {
    restoreTriggerFocusRef.current = true;
    startTransition(() => setOpenPath(pathname));
  }

  function closeMenu(restoreTriggerFocus = true) {
    restoreTriggerFocusRef.current = restoreTriggerFocus;
    startTransition(() => setOpenPath(null));
  }

  useEffect(() => {
    const desktopQuery = window.matchMedia("(min-width: 64rem)");
    const closeAtDesktop = () => {
      if (desktopQuery.matches) closeMenu(false);
    };

    desktopQuery.addEventListener("change", closeAtDesktop);
    return () => desktopQuery.removeEventListener("change", closeAtDesktop);
  }, []);

  useEffect(() => {
    const closeForHistoryNavigation = () => {
      restoreTriggerFocusRef.current = false;
      startTransition(() => setOpenPath(null));
    };

    window.addEventListener("popstate", closeForHistoryNavigation);
    return () =>
      window.removeEventListener("popstate", closeForHistoryNavigation);
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const pathWhenOpened = pathname;
    const trigger = triggerRef.current;
    const triggerWasInert = trigger?.inert ?? false;
    document.body.style.overflow = "hidden";
    const restoreInert = rootRef.current
      ? makeObscuredSiblingsInert(rootRef.current)
      : () => undefined;
    if (trigger) trigger.inert = true;

    const focusFrame = window.requestAnimationFrame(() => {
      panelRef.current
        ?.querySelector<HTMLElement>(".mobile-navigation__link")
        ?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
        return;
      }

      if (event.key !== "Tab") return;

      const focusableElements = Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>(focusableSelector) ?? [],
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

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      const shouldRestoreTriggerFocus =
        restoreTriggerFocusRef.current &&
        window.location.pathname === pathWhenOpened;
      restoreTriggerFocusRef.current = true;
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      restoreInert();
      if (trigger) trigger.inert = triggerWasInert;
      if (shouldRestoreTriggerFocus) {
        window.requestAnimationFrame(() =>
          trigger?.focus({ preventScroll: true }),
        );
      }
    };
  }, [isOpen, pathname]);

  return (
    <div className="mobile-navigation" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="mobile-navigation__trigger"
        aria-controls="mobile-navigation-panel"
        aria-expanded={isOpen}
        aria-label="Open menu"
        onClick={openMenu}
      >
        <ListIcon size={24} weight="regular" aria-hidden="true" />
      </button>

      {isOpen ? (
        <>
          <ViewTransition
            name="mobile-navigation-backdrop"
            default="none"
            enter="mobile-navigation-backdrop-enter"
            exit="mobile-navigation-backdrop-exit"
          >
            <div
              className="mobile-navigation__backdrop"
              aria-hidden="true"
              onPointerDown={() => closeMenu()}
            />
          </ViewTransition>
          <ViewTransition
            name="mobile-navigation-panel"
            default="none"
            enter="mobile-navigation-panel-enter"
            exit="mobile-navigation-panel-exit"
          >
            <div
              id="mobile-navigation-panel"
              ref={panelRef}
              className="mobile-navigation__panel"
              role="dialog"
              aria-modal="true"
              aria-label="Main menu"
            >
              <button
                className="mobile-navigation__close"
                type="button"
                aria-label="Close menu"
                onClick={() => closeMenu()}
              >
                <XIcon size={22} weight="regular" aria-hidden="true" />
              </button>
              <nav className="mobile-navigation__nav" aria-label="Mobile">
                <ul className="mobile-navigation__list">
                  {primaryNavigation.map((item, index) => (
                    <li key={item.href}>
                      <Link
                        className="mobile-navigation__link"
                        href={item.href}
                        aria-current={item.href === pathname ? "page" : undefined}
                        onClick={() => closeMenu(item.href === pathname)}
                      >
                        <span>{item.label}</span>
                        <span
                          className="mobile-navigation__index"
                          aria-hidden="true"
                        >
                          {String(index + 1).padStart(2, "0")}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
          </ViewTransition>
        </>
      ) : null}
    </div>
  );
}

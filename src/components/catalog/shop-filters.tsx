"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import type {
  ActiveCatalogValues,
  CatalogFilterGroup,
  CatalogFilterKey,
} from "./catalog-selection";
import {
  countMatchingShopRecords,
  type ShopEntryType,
  type ShopFilterRecord,
} from "./shop-index";
import styles from "./shop-filters.module.css";

interface ShopFiltersProps {
  readonly groups: readonly CatalogFilterGroup[];
  readonly initialValues: ActiveCatalogValues;
  readonly initialSort: string;
  readonly resultCount: number;
  readonly entryType: ShopEntryType;
  readonly typeCounts: Readonly<Record<ShopEntryType, number>>;
  readonly records: readonly ShopFilterRecord[];
  readonly children: ReactNode;
}

const FILTER_KEYS: readonly (CatalogFilterKey | "query")[] = [
  "category",
  "room",
  "material",
  "style",
  "type",
  "price",
  "query",
];

const ENTRY_LABELS: Readonly<Record<ShopEntryType, string>> = {
  all: "All entries",
  product: "Products",
  "room-edit": "Room edits",
  "material-note": "Material notes",
};

const ENTRY_SCROLL_KEY = "shop-entry-scroll";

function filterChipId(key: CatalogFilterKey | "query", value: string) {
  return `filter-chip-${key}-${encodeURIComponent(value)}`;
}

function setBodyOverflow(value: string) {
  document.body.style.overflow = value;
}

interface FilterOptionsProps {
  readonly group: CatalogFilterGroup;
  readonly selected: ActiveCatalogValues;
  readonly idPrefix: string;
  readonly onToggle: (
    key: CatalogFilterKey,
    value: string,
    checked: boolean,
    multiple: boolean,
  ) => void;
}

function FilterOptions({
  group,
  selected,
  idPrefix,
  onToggle,
}: FilterOptionsProps) {
  return (
    <fieldset className={styles.group}>
      <legend className="sr-only">{group.label}</legend>
      <ul className={styles.optionList}>
        {group.options.map((option) => {
          const id = `${idPrefix}-${group.key}-${option.value.replace(/[^a-z0-9]+/g, "-")}`;
          return (
            <li key={option.value}>
              <label className={styles.optionLabel} htmlFor={id}>
                <input
                  id={id}
                  name={group.key}
                  type={group.multiple ? "checkbox" : "radio"}
                  value={option.value}
                  checked={selected[group.key].includes(option.value)}
                  onChange={(event) =>
                    onToggle(
                      group.key,
                      option.value,
                      event.currentTarget.checked,
                      group.multiple,
                    )
                  }
                />
                <span>{option.label}</span>
                <span className={styles.optionCount} aria-label={`${option.count} ${option.count === 1 ? "product" : "products"}`}>
                  {option.count}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}

export function ShopFilters({
  groups,
  initialValues,
  initialSort,
  resultCount,
  entryType,
  typeCounts,
  records,
  children,
}: ShopFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const resultsHeadingRef = useRef<HTMLHeadingElement>(null);
  const bodyOverflowRef = useRef<string | null>(null);
  const dialogAppliedRef = useRef(false);
  const dialogSnapshotRef = useRef<{
    readonly selected: ActiveCatalogValues;
    readonly query: string;
  } | null>(null);
  const pendingFocusRef = useRef<string[] | null>(null);
  const [selected, setSelected] = useState(initialValues);
  const [query, setQuery] = useState(initialValues.query[0] ?? "");
  const [sort, setSort] = useState(initialSort);
  const [desktopQueryDirty, setDesktopQueryDirty] = useState(false);
  const [isPending, startTransition] = useTransition();
  const initialSignature = JSON.stringify([initialValues, initialSort, entryType]);
  const previousSignatureRef = useRef(initialSignature);

  useEffect(() => {
    if (previousSignatureRef.current === initialSignature) return;
    previousSignatureRef.current = initialSignature;
    setSelected(initialValues);
    setQuery(initialValues.query[0] ?? "");
    setSort(initialSort);
    setDesktopQueryDirty(false);
  }, [entryType, initialSignature, initialSort, initialValues]);

  useEffect(() => () => {
    if (bodyOverflowRef.current !== null) {
      document.body.style.overflow = bodyOverflowRef.current;
    }
  }, []);

  const searchSignature = searchParams.toString();
  const buildHref = useCallback(function buildHref(
    next: ActiveCatalogValues,
    nextSort = sort,
    nextEntryType = entryType,
  ) {
    const params = new URLSearchParams(searchSignature);
    for (const key of FILTER_KEYS) params.delete(key);
    for (const key of FILTER_KEYS) {
      for (const value of next[key]) params.append(key, value);
    }
    if (nextEntryType === "all") params.delete("entry");
    else params.set("entry", nextEntryType);
    if (nextEntryType === "product" && nextSort !== "featured") {
      params.set("sort", nextSort);
    } else {
      params.delete("sort");
    }
    return `${pathname}${params.size ? `?${params}` : ""}`;
  }, [entryType, pathname, searchSignature, sort]);

  const pushValues = useCallback(function pushValues(
    next: ActiveCatalogValues,
    nextSort = sort,
    nextEntryType = entryType,
  ) {
    startTransition(() => {
      router.push(buildHref(next, nextSort, nextEntryType), { scroll: false });
    });
  }, [buildHref, entryType, router, sort]);

  useEffect(() => {
    if (!desktopQueryDirty || dialogRef.current?.open) return;
    const timer = window.setTimeout(() => {
      setDesktopQueryDirty(false);
      const next = { ...selected, query: query.trim() ? [query.trim()] : [] };
      setSelected(next);
      pushValues(next);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [desktopQueryDirty, pushValues, query, selected]);

  function toggleValue(
    key: CatalogFilterKey,
    value: string,
    checked: boolean,
    multiple: boolean,
    commit: boolean,
  ) {
    const current = selected[key];
    const values = multiple
      ? checked
        ? [...new Set([...current, value])]
        : current.filter((candidate) => candidate !== value)
      : checked
        ? [value]
        : [];
    const next = { ...selected, [key]: values };
    setSelected(next);
    if (commit) pushValues(next);
  }

  function clearAll(commit: boolean) {
    const empty: ActiveCatalogValues = {
      category: [],
      room: [],
      material: [],
      style: [],
      type: [],
      price: [],
      query: [],
    };
    setSelected(empty);
    setQuery("");
    if (commit) pushValues(empty);
  }

  function openDialog() {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    dialogSnapshotRef.current = { selected, query };
    dialogAppliedRef.current = false;
    bodyOverflowRef.current = document.body.style.overflow;
    setBodyOverflow("hidden");
    dialog.showModal();
  }

  function closeDialog() {
    dialogRef.current?.close();
  }

  function restoreDialogState() {
    const snapshot = dialogSnapshotRef.current;
    if (!dialogAppliedRef.current && snapshot) {
      setSelected(snapshot.selected);
      setQuery(snapshot.query);
    }
    dialogSnapshotRef.current = null;
    dialogAppliedRef.current = false;
    if (bodyOverflowRef.current !== null) {
      setBodyOverflow(bodyOverflowRef.current);
      bodyOverflowRef.current = null;
    }
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }

  const labelByValue = useMemo(
    () =>
      new Map(
        groups.flatMap((group) =>
          group.options.map((option) => [
            `${group.key}:${option.value}`,
            option.label,
          ]),
        ),
      ),
    [groups],
  );
  const chips = FILTER_KEYS.flatMap((key) =>
    selected[key].map((value) => ({
      key,
      value,
      label:
        key === "query"
          ? `Search: “${value}”`
          : labelByValue.get(`${key}:${value}`) ?? value,
    })),
  );

  const chipSignature = chips
    .map((chip) => filterChipId(chip.key, chip.value))
    .join("|");

  useLayoutEffect(() => {
    const candidateIds = pendingFocusRef.current;
    if (candidateIds === null) return;
    pendingFocusRef.current = null;
    const frame = window.requestAnimationFrame(() => {
      const candidate = candidateIds
        .map((id) => document.getElementById(id))
        .find((element): element is HTMLElement => element instanceof HTMLElement && element.getClientRects().length > 0);
      (candidate ?? triggerRef.current ?? resultsHeadingRef.current)?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [chipSignature]);

  useEffect(() => {
    const storedTop = window.sessionStorage.getItem(ENTRY_SCROLL_KEY);
    if (storedTop === null) return;
    window.sessionStorage.removeItem(ENTRY_SCROLL_KEY);
    const top = Number(storedTop);
    if (!Number.isFinite(top)) return;
    let restoreFrame: number | null = null;
    const settleFrame = window.requestAnimationFrame(() => {
      restoreFrame = window.requestAnimationFrame(() => {
        window.scrollTo({ top, behavior: "auto" });
      });
    });
    return () => {
      window.cancelAnimationFrame(settleFrame);
      if (restoreFrame !== null) window.cancelAnimationFrame(restoreFrame);
    };
  }, [entryType]);

  const quickGroups = groups.filter((group) => group.priority === "quick");
  const moreGroups = groups.filter((group) => group.priority === "more");
  const visibleGroups = entryType === "product" || entryType === "all" ? groups : quickGroups;
  const draftValues = { ...selected, query: query.trim() ? [query.trim()] : [] };
  const draftCount = countMatchingShopRecords(records, entryType, draftValues);
  const resultLabel = `${resultCount} ${resultCount === 1 ? "entry" : "entries"}`;

  return (
    <div className={styles.shell}>
      <nav className={styles.typeSwitch} aria-label="Entry type">
        {(["all", "product", "room-edit", "material-note"] as const).map((type) => (
          <Link
            key={type}
            href={buildHref(initialValues, initialSort, type)}
            scroll={false}
            onClickCapture={(event) => {
              if (
                type === entryType
                || event.button !== 0
                || event.metaKey
                || event.ctrlKey
                || event.shiftKey
                || event.altKey
              ) return;
              window.sessionStorage.setItem(ENTRY_SCROLL_KEY, String(window.scrollY));
            }}
            aria-current={entryType === type ? "page" : undefined}
          >
            <span>{ENTRY_LABELS[type]}</span>
            <span aria-hidden="true">{typeCounts[type]}</span>
          </Link>
        ))}
      </nav>

      <div className={styles.toolbar}>
        <label className={styles.desktopSearch}>
          <span>Search the edit</span>
          <input
            type="search"
            value={query}
            autoComplete="off"
            onChange={(event) => {
              setQuery(event.currentTarget.value);
              setDesktopQueryDirty(true);
            }}
          />
        </label>

        <div className={styles.desktopFilters}>
          {quickGroups.map((group) => (
            <details key={group.key} name="shop-desktop-filters">
              <summary>{group.label}</summary>
              <div className={styles.filterMenu}>
                <FilterOptions
                  group={group}
                  selected={selected}
                  idPrefix="desktop"
                  onToggle={(key, value, checked, multiple) =>
                    toggleValue(key, value, checked, multiple, true)
                  }
                />
              </div>
            </details>
          ))}
          {entryType === "product" || entryType === "all" ? (
            <details name="shop-desktop-filters">
              <summary>More filters</summary>
              <div className={`${styles.filterMenu} ${styles.moreMenu}`}>
                {moreGroups.map((group) => (
                  <section key={group.key} aria-labelledby={`more-${group.key}`}>
                    <h3 id={`more-${group.key}`}>{group.label}</h3>
                    <FilterOptions
                      group={group}
                      selected={selected}
                      idPrefix="desktop-more"
                      onToggle={(key, value, checked, multiple) =>
                        toggleValue(key, value, checked, multiple, true)
                      }
                    />
                  </section>
                ))}
              </div>
            </details>
          ) : null}
        </div>

        <button
          className={styles.filterTrigger}
          type="button"
          ref={triggerRef}
          onClick={openDialog}
          aria-haspopup="dialog"
        >
          Filters{chips.length ? ` (${chips.length})` : ""}
        </button>

        <p className={styles.resultCount} aria-live="polite">{resultLabel}</p>

        {entryType === "product" ? (
          <label className={styles.sortWrap}>
            <span>Sort</span>
            <select
              name="sort"
              aria-label="Sort products"
              value={sort}
              onChange={(event) => {
                const nextSort = event.currentTarget.value;
                setSort(nextSort);
                pushValues(selected, nextSort);
              }}
            >
              <option value="featured">Curated</option>
              <option value="newest">Recently added</option>
              <option value="name">Name</option>
              <option value="price-asc">Price, low to high</option>
              <option value="price-desc">Price, high to low</option>
            </select>
          </label>
        ) : null}
      </div>

      {chips.length > 0 ? (
        <ul className={styles.chips} aria-label="Applied filters">
          {chips.map((chip, index) => (
            <li key={`${chip.key}-${chip.value}`}>
              <button
                id={filterChipId(chip.key, chip.value)}
                type="button"
                aria-label={`Remove ${chip.label}`}
                onClick={() => {
                  pendingFocusRef.current = [chips[index + 1], chips[index - 1]]
                    .filter((candidate) => candidate !== undefined)
                    .map((candidate) => filterChipId(candidate.key, candidate.value));
                  if (chip.key === "query") {
                    setQuery("");
                    const next = { ...selected, query: [] };
                    setSelected(next);
                    pushValues(next);
                  } else {
                    toggleValue(chip.key, chip.value, false, true, true);
                  }
                }}
              >
                {chip.label}<span aria-hidden="true">×</span>
              </button>
            </li>
          ))}
          <li><button type="button" onClick={() => clearAll(true)}>Clear all</button></li>
        </ul>
      ) : null}

      <section className={styles.results} aria-busy={isPending} aria-label={resultLabel}>
        <h2 className="sr-only" ref={resultsHeadingRef} tabIndex={-1}>Catalog results</h2>
        {children}
      </section>

      <dialog
        className={styles.dialog}
        ref={dialogRef}
        aria-labelledby="filter-dialog-title"
        onClose={restoreDialogState}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeDialog();
        }}
      >
        <div className={styles.dialogPanel}>
          <header className={styles.dialogHeader}>
            <h2 id="filter-dialog-title">Filter entries</h2>
            <button type="button" onClick={closeDialog}>Close</button>
          </header>
          <div className={styles.dialogBody}>
            <label className={styles.mobileSearch}>
              <span>Search the edit</span>
              <input
                type="search"
                value={query}
                autoComplete="off"
                onChange={(event) => setQuery(event.currentTarget.value)}
              />
            </label>
            {visibleGroups.map((group) => (
              <details className={styles.mobileGroup} key={group.key}>
                <summary>{group.label}</summary>
                <FilterOptions
                  group={group}
                  selected={selected}
                  idPrefix="mobile"
                  onToggle={(key, value, checked, multiple) =>
                    toggleValue(key, value, checked, multiple, false)
                  }
                />
              </details>
            ))}
          </div>
          <footer className={styles.dialogFooter}>
            <button type="button" onClick={() => clearAll(false)}>Clear filters</button>
            <button
              className={styles.showResults}
              type="button"
              onClick={() => {
                const next = { ...selected, query: query.trim() ? [query.trim()] : [] };
                dialogAppliedRef.current = true;
                setSelected(next);
                pushValues(next);
                closeDialog();
              }}
            >
              Show {draftCount} {draftCount === 1 ? "entry" : "entries"}
            </button>
          </footer>
        </div>
      </dialog>
    </div>
  );
}

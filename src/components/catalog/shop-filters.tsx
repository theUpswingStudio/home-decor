"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import type {
  ActiveCatalogValues,
  CatalogFilterGroup,
  CatalogFilterKey,
} from "./catalog-selection";
import styles from "./shop-filters.module.css";

interface FilterFormProps {
  groups: readonly CatalogFilterGroup[];
  selected: ActiveCatalogValues;
  query: string;
  idPrefix: string;
  onQueryChange: (value: string) => void;
  onToggle: (key: CatalogFilterKey, value: string, checked: boolean, multiple: boolean) => void;
  onClear: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

function FilterForm({
  groups,
  selected,
  query,
  idPrefix,
  onQueryChange,
  onToggle,
  onClear,
  onSubmit,
}: FilterFormProps) {
  return (
    <form className={styles.form} action="/shop" method="get" onSubmit={onSubmit}>
      <label className={styles.searchField} htmlFor={`${idPrefix}-query`}>
        <span className={styles.fieldLabel}>Search the catalog</span>
        <input
          className={styles.searchInput}
          id={`${idPrefix}-query`}
          name="query"
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          autoComplete="off"
        />
      </label>
      {groups.map((group) => (
        <fieldset className={styles.group} key={group.key}>
          <legend className={styles.groupTitle}>{group.label}</legend>
          <ul className={styles.optionList}>
            {group.options.map((option) => {
              const id = `${idPrefix}-${group.key}-${option.value.replace(/[^a-z0-9]+/g, "-")}`;
              const checked = selected[group.key].includes(option.value);
              return (
                <li key={option.value}>
                  <label className={styles.optionLabel} htmlFor={id}>
                    <input
                      className={styles.optionInput}
                      id={id}
                      name={group.key}
                      type={group.multiple ? "checkbox" : "radio"}
                      value={option.value}
                      checked={checked}
                      onChange={(event) => onToggle(group.key, option.value, event.target.checked, group.multiple)}
                    />
                    <span>{option.label}</span>
                    <span className={styles.optionCount} aria-label={`${option.count} products`}>{option.count}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>
      ))}
      <div className={styles.formActions}>
        <button className={styles.submitButton} type="submit">Update results</button>
        <button className={styles.clearButton} type="button" onClick={onClear}>Clear all</button>
      </div>
    </form>
  );
}

interface ShopFiltersProps {
  groups: readonly CatalogFilterGroup[];
  initialValues: ActiveCatalogValues;
  initialSort: string;
  resultCount: number;
  children: ReactNode;
}

const filterKeys: readonly (CatalogFilterKey | "query")[] = ["category", "room", "material", "style", "type", "price", "query"];

interface FilterDialogSnapshot {
  selected: ActiveCatalogValues;
  query: string;
  selectionDirty: boolean;
  queryDirty: boolean;
}

export function ShopFilters({ groups, initialValues, initialSort, resultCount, children }: ShopFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const bodyOverflowRef = useRef<string | null>(null);
  const selectionDirtyRef = useRef(false);
  const queryDirtyRef = useRef(false);
  const dialogAppliedRef = useRef(false);
  const dialogSnapshotRef = useRef<FilterDialogSnapshot | null>(null);
  const [selected, setSelected] = useState<ActiveCatalogValues>(initialValues);
  const [query, setQuery] = useState(initialValues.query[0] ?? "");
  const [sort, setSort] = useState(initialSort);
  const [isPending, startTransition] = useTransition();
  const initialSignature = JSON.stringify([initialValues, initialSort]);
  const previousInitialSignatureRef = useRef(initialSignature);

  useEffect(() => {
    if (previousInitialSignatureRef.current === initialSignature) return;
    previousInitialSignatureRef.current = initialSignature;
    if (!selectionDirtyRef.current) setSelected(initialValues);
    if (!queryDirtyRef.current) setQuery(initialValues.query[0] ?? "");
    setSort(initialSort);
  }, [initialSignature, initialSort, initialValues]);

  useEffect(() => () => {
    if (bodyOverflowRef.current !== null) {
      document.body.style.overflow = bodyOverflowRef.current;
    }
  }, []);

  function pushValues(next: ActiveCatalogValues, nextSort = sort) {
    const params = new URLSearchParams(searchParams.toString());
    for (const key of filterKeys) params.delete(key);
    for (const key of filterKeys) {
      for (const value of next[key]) params.append(key, value);
    }
    if (nextSort === "featured") params.delete("sort");
    else params.set("sort", nextSort);
    startTransition(() => router.push(`${pathname}${params.size ? `?${params}` : ""}`, { scroll: false }));
  }

  function toggleValue(key: CatalogFilterKey, value: string, checked: boolean, multiple: boolean, commit: boolean) {
    const current = selected[key];
    const values = multiple
      ? checked ? [...new Set([...current, value])] : current.filter((candidate) => candidate !== value)
      : checked ? [value] : [];
    const next = { ...selected, [key]: values };
    setSelected(next);
    selectionDirtyRef.current = !commit;
    if (commit) pushValues(next);
  }

  function clearAll() {
    const empty: ActiveCatalogValues = { category: [], room: [], material: [], style: [], type: [], price: [], query: [] };
    selectionDirtyRef.current = false;
    queryDirtyRef.current = false;
    setSelected(empty);
    setQuery("");
    pushValues(empty);
  }

  function clearDraft() {
    selectionDirtyRef.current = true;
    queryDirtyRef.current = true;
    setSelected({ category: [], room: [], material: [], style: [], type: [], price: [], query: [] });
    setQuery("");
  }

  function submitFilters(event: FormEvent<HTMLFormElement>, closeAfterSubmit = false) {
    event.preventDefault();
    const next = { ...selected, query: query.trim() ? [query.trim()] : [] };
    selectionDirtyRef.current = false;
    queryDirtyRef.current = false;
    setSelected(next);
    pushValues(next);
    if (closeAfterSubmit) {
      dialogAppliedRef.current = true;
      closeDialog();
    }
  }

  function openDialog() {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    dialogSnapshotRef.current = {
      selected,
      query,
      selectionDirty: selectionDirtyRef.current,
      queryDirty: queryDirtyRef.current,
    };
    dialogAppliedRef.current = false;
    bodyOverflowRef.current = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.showModal();
  }

  function closeDialog() {
    dialogRef.current?.close();
  }

  function restoreBodyAndFocus() {
    const snapshot = dialogSnapshotRef.current;
    if (!dialogAppliedRef.current && snapshot) {
      selectionDirtyRef.current = snapshot.selectionDirty;
      queryDirtyRef.current = snapshot.queryDirty;
      setSelected(snapshot.selected);
      setQuery(snapshot.query);
    }
    dialogSnapshotRef.current = null;
    dialogAppliedRef.current = false;
    if (bodyOverflowRef.current !== null) {
      document.body.style.overflow = bodyOverflowRef.current;
      bodyOverflowRef.current = null;
    }
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }

  const labelByValue = new Map(groups.flatMap((group) => group.options.map((option) => [`${group.key}:${option.value}`, option.label])));
  const chips = filterKeys.flatMap((key) => selected[key].map((value) => ({
    key,
    value,
    label: key === "query" ? `Search: “${value}”` : labelByValue.get(`${key}:${value}`) ?? value,
  })));
  const productLabel = `${resultCount} ${resultCount === 1 ? "product" : "products"}`;

  return (
    <div className={styles.shell}>
      <div className={styles.toolbar}>
        <button
          className={styles.filterTrigger}
          type="button"
          ref={triggerRef}
          onClick={openDialog}
          aria-haspopup="dialog"
        >
          Filters{chips.length ? ` (${chips.length})` : ""}
        </button>
        <p className={styles.resultCount} aria-live="polite">{productLabel}</p>
        <label className={styles.sortWrap}>
          <span className={styles.sortLabel}>Sort by</span>
          <select
            className={styles.sort}
            name="sort"
            aria-label="Sort products"
            value={sort}
            onChange={(event) => {
              const nextSort = event.target.value;
              setSort(nextSort);
              pushValues(selected, nextSort);
            }}
          >
            <option value="featured">Featured</option>
            <option value="newest">Newest</option>
            <option value="name">Name</option>
            <option value="price-asc">Price, low to high</option>
            <option value="price-desc">Price, high to low</option>
          </select>
        </label>
      </div>

      {chips.length > 0 ? (
        <ul className={styles.chips} aria-label="Applied filters">
          {chips.map((chip) => (
            <li key={`${chip.key}-${chip.value}`}>
              <button
                className={styles.chip}
                type="button"
                onClick={() => {
                  if (chip.key === "query") {
                    setQuery("");
                    const next = { ...selected, query: [] };
                    queryDirtyRef.current = false;
                    setSelected(next);
                    pushValues(next);
                  } else {
                    toggleValue(chip.key, chip.value, false, true, true);
                  }
                }}
                aria-label={`Remove ${chip.label}`}
              >
                {chip.label}<span className={styles.chipMark} aria-hidden="true">×</span>
              </button>
            </li>
          ))}
          <li><button className={styles.clearButton} type="button" onClick={clearAll}>Clear all</button></li>
        </ul>
      ) : null}

      <div className={styles.resultsLayout}>
        <aside className={styles.rail} aria-label="Catalog filters">
          <FilterForm
            groups={groups}
            selected={selected}
            query={query}
            idPrefix="desktop"
            onQueryChange={(value) => {
              queryDirtyRef.current = true;
              setQuery(value);
            }}
            onToggle={(key, value, checked, multiple) => toggleValue(key, value, checked, multiple, true)}
            onClear={clearAll}
            onSubmit={submitFilters}
          />
        </aside>
        <section className={styles.results} id="catalog-results" aria-busy={isPending} aria-label={productLabel}>
          {children}
        </section>
      </div>

      <dialog
        className={styles.dialog}
        ref={dialogRef}
        aria-labelledby="filter-dialog-title"
        onClose={restoreBodyAndFocus}
        onCancel={() => undefined}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeDialog();
        }}
      >
        <div className={styles.dialogPanel}>
          <header className={styles.dialogHeader}>
            <h2 className={styles.dialogTitle} id="filter-dialog-title">Filter products</h2>
            <button className={styles.closeButton} type="button" onClick={closeDialog}>Close</button>
          </header>
          <FilterForm
            groups={groups}
            selected={selected}
            query={query}
            idPrefix="mobile"
            onQueryChange={(value) => {
              queryDirtyRef.current = true;
              setQuery(value);
            }}
            onToggle={(key, value, checked, multiple) => toggleValue(key, value, checked, multiple, false)}
            onClear={clearDraft}
            onSubmit={(event) => submitFilters(event, true)}
          />
        </div>
      </dialog>
    </div>
  );
}

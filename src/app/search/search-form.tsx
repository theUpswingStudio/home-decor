"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState, useTransition } from "react";
import styles from "./search.module.css";

interface SearchFormProps {
  initialQuery: string;
}

export function SearchForm({ initialQuery }: SearchFormProps) {
  const [query, setQuery] = useState(initialQuery);
  const isDirtyRef = useRef(false);
  const previousInitialQueryRef = useRef(initialQuery);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (previousInitialQueryRef.current === initialQuery) return;
    previousInitialQueryRef.current = initialQuery;
    if (!isDirtyRef.current) setQuery(initialQuery);
  }, [initialQuery]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    const nextQuery = query.trim();
    if (nextQuery) params.set("q", nextQuery);
    else params.delete("q");
    isDirtyRef.current = false;
    startTransition(() => router.push(`${pathname}${params.size ? `?${params}` : ""}`, { scroll: false }));
  }

  return (
    <form className={styles.form} action="/search" method="get" role="search" onSubmit={submit} aria-busy={isPending}>
      <label className={styles.label} htmlFor="catalog-search">Search furniture, rooms, materials, and styles</label>
      <input
        className={styles.input}
        id="catalog-search"
        name="q"
        type="search"
        value={query}
        onChange={(event) => {
          isDirtyRef.current = true;
          setQuery(event.target.value);
        }}
        autoComplete="off"
      />
      <button className={styles.submit} type="submit">Search</button>
    </form>
  );
}

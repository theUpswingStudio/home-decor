"use client";

import Link from "next/link";
import styles from "./info.module.css";

interface ErrorPageProps {
  readonly error: Error & { readonly digest?: string };
  readonly reset: () => void;
}

export default function ErrorPage({ reset }: ErrorPageProps) {
  return (
    <section className={styles.errorState} aria-labelledby="error-title" role="alert">
      <div className={styles.errorInner}>
        <p className={styles.errorCode}>A temporary interruption</p>
        <h1 className={styles.errorTitle} id="error-title">The room did not come together.</h1>
        <p className={styles.errorCopy}>
          Try this view again. If it remains unavailable, return to a stable part of the catalog.
        </p>
        <div className={styles.errorActions}>
          <button className={styles.primaryLink} type="button" onClick={reset}>Try again</button>
          <Link className={styles.secondaryLink} href="/">Return home</Link>
        </div>
      </div>
    </section>
  );
}

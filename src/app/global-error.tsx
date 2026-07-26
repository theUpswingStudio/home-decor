"use client";

import Link from "next/link";
import styles from "./info.module.css";

interface GlobalErrorProps {
  readonly error: Error & { readonly digest?: string };
  readonly reset: () => void;
}

export default function GlobalError({ reset }: GlobalErrorProps) {
  return (
    <html lang="en">
      <body className={styles.globalBody}>
        <main className={styles.globalMain}>
          <section className={styles.errorState} aria-labelledby="global-error-title" role="alert">
            <div className={styles.errorInner}>
              <p className={styles.errorCode}>Vestrel / House</p>
              <h1 className={styles.errorTitle} id="global-error-title">The house is briefly unavailable.</h1>
              <p className={styles.errorCopy}>
                No technical details or submitted values are displayed here. Retry the application or begin again from the home page.
              </p>
              <div className={styles.errorActions}>
                <button className={styles.primaryLink} type="button" onClick={reset}>Try again</button>
                <Link className={styles.secondaryLink} href="/">Return home</Link>
              </div>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}

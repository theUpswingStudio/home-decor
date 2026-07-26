import type { Metadata } from "next";
import Link from "next/link";
import styles from "./info.module.css";

export const metadata: Metadata = {
  title: "Page Not Found | Vestrel House",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <section className={styles.errorState} aria-labelledby="not-found-title">
      <div className={styles.errorInner}>
        <p className={styles.errorCode}>404 / Room not found</p>
        <h1 className={styles.errorTitle} id="not-found-title">This path has no place in the plan.</h1>
        <p className={styles.errorCopy}>
          The page may have moved, or the address may be incomplete. Return to the collection or continue with the full catalog.
        </p>
        <div className={styles.errorActions}>
          <Link className={styles.primaryLink} href="/">Return home</Link>
          <Link className={styles.secondaryLink} href="/shop">Browse all pieces</Link>
        </div>
      </div>
    </section>
  );
}

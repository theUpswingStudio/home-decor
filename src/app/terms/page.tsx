import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Container } from "@/components/ui/container";
import styles from "../info.module.css";

export const metadata: Metadata = {
  title: "Demonstration Terms | Vestrel House",
  description:
    "How to interpret catalog, pricing, imagery, review samples, and consultation features in the fictional Vestrel House concept.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <Container className={styles.page}>
      <Breadcrumbs items={[{ href: "/", label: "Home" }, { label: "Terms" }]} />
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>Demonstration terms</p>
          <h1 className={styles.title}>A concept to explore, not a store to transact with.</h1>
          <p className={styles.lede}>
            These notes explain how the Vestrel House portfolio should be read. They are not live
            retailer terms and do not govern a sale, service engagement, delivery, or return.
          </p>
        </div>
        <aside className={styles.heroAside} aria-label="Commerce status">
          <strong>No commercial relationship</strong>
          <p>The site cannot take payment, confirm inventory, accept an order, or enter a design-services agreement.</p>
        </aside>
      </header>

      <div className={styles.layout}>
        <nav className={styles.sideNav} aria-label="On this page">
          <h2>Using the concept</h2>
          <ul>
            <li><a href="#catalog">Catalog content</a></li>
            <li><a href="#consultation">Consultation demo</a></li>
            <li><a href="#imagery">Imagery and samples</a></li>
            <li><a href="#production">Production use</a></li>
          </ul>
        </nav>
        <article className={styles.article}>
          <section className={styles.section} id="catalog">
            <p className={styles.kicker}>Fictional catalog</p>
            <h2>Product details support interface evaluation.</h2>
            <p>
              Product names, specifications, variants, prices, lead times, availability implications,
              service areas, and policies are demonstration content. They are not an advertisement,
              quote, guarantee, or representation of live goods. Adding a selection to the cart only
              stores a planning reference in the current browser.
            </p>
          </section>

          <section className={styles.section} id="consultation">
            <p className={styles.kicker}>No submission</p>
            <h2>The inquiry ends in a demonstration state.</h2>
            <p>
              Completing the inquiry does not contact a consultant, reserve a product, request a quote,
              or establish a service relationship. The interface intentionally confirms that no data was
              transmitted. The displayed <code>.example</code> email is non-deliverable by design.
            </p>
          </section>

          <section className={styles.section} id="imagery">
            <p className={styles.kicker}>References and disclosure</p>
            <h2>Photography and review samples are labeled by role.</h2>
            <p>
              Unsplash photography is used as product representation or editorial context as described
              in image text and credits. Context imagery may not show the exact fictional catalog piece.
              Any sample review is explicitly fictional, is not a customer testimonial, and is excluded
              from aggregate ratings and structured data.
            </p>
          </section>

          <section className={styles.section} id="production">
            <p className={styles.kicker}>Before launch</p>
            <h2>A real operator must replace these notes.</h2>
            <p>
              Anyone adapting this project for commercial use must validate rights, product claims,
              accessibility, pricing, tax and delivery logic, privacy behavior, and the terms required
              for the actual business and locations involved. This page does not provide that legal or operational review.
            </p>
            <div className={styles.actions}>
              <Link className={styles.secondaryLink} href="/privacy">Read the privacy notes</Link>
              <Link className={styles.secondaryLink} href="/shipping-returns">Review delivery assumptions</Link>
            </div>
          </section>
        </article>
      </div>
    </Container>
  );
}

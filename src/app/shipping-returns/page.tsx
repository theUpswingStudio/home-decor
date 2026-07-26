import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Container } from "@/components/ui/container";
import { catalog } from "@/lib/catalog";
import styles from "../info.module.css";

export const metadata: Metadata = {
  title: "Shipping and Returns | Vestrel House",
  description:
    "How delivery, access, installation, changes, and returns are represented in the Vestrel House consultation concept.",
  alternates: { canonical: "/shipping-returns" },
};

export default function ShippingReturnsPage() {
  const shipping = catalog.policies.find((policy) => policy.slug === "shipping-delivery");
  const installation = catalog.policies.find((policy) => policy.slug === "installation-access");
  const returns = catalog.policies.find((policy) => policy.slug === "changes-returns");

  return (
    <Container className={styles.page}>
      <Breadcrumbs items={[{ href: "/", label: "Home" }, { label: "Delivery and returns" }]} />
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>Delivery and returns</p>
          <h1 className={styles.title}>Planned around the piece and the path.</h1>
          <p className={styles.lede}>
            Vestrel House has no online checkout. In the concept workflow, destination, access,
            service level, timing, and item-specific terms would be confirmed in writing before approval.
          </p>
        </div>
        <aside className={styles.heroAside} aria-label="Important status">
          <strong>No active fulfillment</strong>
          <p>This portfolio demonstration cannot accept orders, arrange delivery, or process a return.</p>
        </aside>
      </header>

      <div className={styles.layout}>
        <nav className={styles.sideNav} aria-label="On this page">
          <h2>Planning guide</h2>
          <ul>
            <li><a href="#delivery">Delivery</a></li>
            <li><a href="#access">Access and installation</a></li>
            <li><a href="#changes">Changes and returns</a></li>
            <li><a href="#damage">Delivery condition</a></li>
          </ul>
        </nav>
        <article className={styles.article}>
          {shipping ? (
            <section className={styles.section} id="delivery">
              <p className={styles.kicker}>01 / Destination</p>
              <h2>{shipping.title}</h2>
              <p>{shipping.summary}</p>
              <ul className={styles.list}>{shipping.details.map((detail) => <li key={detail}>{detail}</li>)}</ul>
            </section>
          ) : null}

          {installation ? (
            <section className={styles.section} id="access">
              <p className={styles.kicker}>02 / The path</p>
              <h2>{installation.title}</h2>
              <p>{installation.summary}</p>
              <ul className={styles.list}>{installation.details.map((detail) => <li key={detail}>{detail}</li>)}</ul>
            </section>
          ) : null}

          {returns ? (
            <section className={styles.section} id="changes">
              <p className={styles.kicker}>03 / Before approval</p>
              <h2>{returns.title}</h2>
              <p>{returns.summary}</p>
              <ul className={styles.list}>{returns.details.map((detail) => <li key={detail}>{detail}</li>)}</ul>
            </section>
          ) : null}

          <section className={styles.section} id="damage">
            <p className={styles.kicker}>04 / At arrival</p>
            <h2>Condition should be documented at the handoff.</h2>
            <p>
              In a live project, packaging and visible item condition would be checked before the
              delivery team leaves. Any issue would follow the contact and documentation instructions
              in that project&apos;s proposal; this concept site has no active service desk.
            </p>
            <div className={styles.actions}>
              <Link className={styles.secondaryLink} href="/care">Read the care guide</Link>
              <Link className={styles.secondaryLink} href="/faq">View common questions</Link>
            </div>
          </section>
        </article>
      </div>
    </Container>
  );
}

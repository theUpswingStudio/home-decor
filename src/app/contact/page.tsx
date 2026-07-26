import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Container } from "@/components/ui/container";
import { catalog } from "@/lib/catalog";
import styles from "../info.module.css";

export const metadata: Metadata = {
  title: "Contact Vestrel House",
  description:
    "Explore the Vestrel House consultation inquiry demonstration and concept contact details.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <Container className={styles.page}>
      <Breadcrumbs items={[{ href: "/", label: "Home" }, { label: "Contact" }]} />
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>Contact</p>
          <h1 className={styles.title}>Begin with the room, not a sales pitch.</h1>
          <p className={styles.lede}>
            The inquiry demonstration shows how Vestrel House would collect useful project context
            before a design conversation. It does not send a message or create an order.
          </p>
        </div>
        <aside className={styles.heroAside} aria-label="Demo status">
          <strong>Demonstration state</strong>
          <p>{catalog.inquiry.responseExpectation}</p>
        </aside>
      </header>

      <div className={styles.layout}>
        <nav className={styles.sideNav} aria-label="On this page">
          <h2>Contact options</h2>
          <ul>
            <li><a href="#inquiry">Inquiry demo</a></li>
            <li><a href="#prepare">What to prepare</a></li>
            <li><a href="#email">Concept email</a></li>
          </ul>
        </nav>
        <article className={styles.article}>
          <section className={styles.section} id="inquiry">
            <p className={styles.kicker}>Two short steps</p>
            <h2>Try the project inquiry.</h2>
            <p>
              Choose a service level, room scope, broad timing, and investment range, then add
              contact and project context. On completion, the demo confirms that no inquiry was
              transmitted and does not save those personal details in browser storage.
            </p>
            <div className={styles.actions}>
              <Link className={styles.primaryLink} href="/design-services/inquire">Open the inquiry demo</Link>
              <Link className={styles.secondaryLink} href="/design-services">Review the process</Link>
            </div>
          </section>

          <section className={styles.section} id="prepare">
            <p className={styles.kicker}>Useful context</p>
            <h2>What a live consultation would need.</h2>
            <ul className={styles.list}>
              <li>Room dimensions, photographs, and the pieces that need to remain.</li>
              <li>Doorway, hallway, stair, elevator, loading, or installation constraints.</li>
              <li>Comfort priorities, material preferences, destination, and realistic timing.</li>
              <li>A working investment range for furniture and any separately quoted services.</li>
            </ul>
            <div className={styles.notice}>
              <strong>Keep sensitive details out.</strong>
              <p>Do not enter payment information, account credentials, alarm details, or access codes in the demonstration.</p>
            </div>
          </section>

          <section className={styles.section} id="email">
            <p className={styles.kicker}>Concept identity</p>
            <h2>The displayed address is intentionally non-deliverable.</h2>
            <p>
              <code>{catalog.site.contactEmail}</code> is part of the fictional brand design. The
              <code> .example</code> domain is reserved for documentation, so this address is not
              monitored and cannot receive messages. The project does not publish a phone number or
              physical showroom address.
            </p>
          </section>
        </article>
      </div>
    </Container>
  );
}

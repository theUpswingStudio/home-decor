import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Container } from "@/components/ui/container";
import { catalog } from "@/lib/catalog";
import styles from "../info.module.css";

export const metadata: Metadata = {
  title: "Accessibility | Vestrel House",
  description:
    "Accessibility design choices, current limitations, and feedback constraints for the Vestrel House portfolio demonstration.",
  alternates: { canonical: "/accessibility" },
};

export default function AccessibilityPage() {
  return (
    <Container className={styles.page}>
      <Breadcrumbs items={[{ href: "/", label: "Home" }, { label: "Accessibility" }]} />
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>Accessibility</p>
          <h1 className={styles.title}>Designed to support more ways of navigating.</h1>
          <p className={styles.lede}>
            Accessibility is treated as an ongoing product quality practice in this demonstration,
            not as a one-time claim of perfect conformance.
          </p>
        </div>
        <aside className={styles.heroAside} aria-label="Accessibility status">
          <strong>Portfolio status</strong>
          <p>The project has no staffed support channel, so it cannot promise accommodation or response times.</p>
        </aside>
      </header>

      <div className={styles.layout}>
        <nav className={styles.sideNav} aria-label="On this page">
          <h2>Accessibility notes</h2>
          <ul>
            <li><a href="#features">Implemented features</a></li>
            <li><a href="#interaction">Forms and interaction</a></li>
            <li><a href="#limits">Known constraints</a></li>
            <li><a href="#feedback">Feedback</a></li>
          </ul>
        </nav>
        <article className={styles.article}>
          <section className={styles.section} id="features">
            <p className={styles.kicker}>Built into the interface</p>
            <h2>Structure should remain useful without the visual layout.</h2>
            <ul className={styles.list}>
              <li>A skip link moves keyboard focus directly to the shared main-content region.</li>
              <li>Pages use landmarks, ordered heading levels, lists, labels, and descriptive link text.</li>
              <li>Keyboard focus is visible and interactive targets are sized for practical use.</li>
              <li>Catalog imagery includes descriptive alternative text and context-image distinctions.</li>
              <li>Layouts reflow from small mobile widths through large desktop screens.</li>
            </ul>
          </section>

          <section className={styles.section} id="interaction">
            <p className={styles.kicker}>Forms and state</p>
            <h2>Errors are announced and connected to their fields.</h2>
            <p>
              The inquiry demo groups related choices, marks required and optional fields, presents an
              error summary, links messages to fields, and moves focus when the step or completion state
              changes. Project Edit and filter controls use native form elements where practical.
            </p>
          </section>

          <section className={styles.section} id="limits">
            <p className={styles.kicker}>Current constraints</p>
            <h2>Testing and content still have limits.</h2>
            <p>
              Editorial photography can contain complex visual detail that text cannot fully reproduce.
              Browser, assistive-technology, zoom, contrast-preference, and input combinations are broader
              than any single review can cover. A commercial version would need recurring automated and
              manual testing with disabled users and a maintained remediation process.
            </p>
          </section>

          <section className={styles.section} id="feedback">
            <p className={styles.kicker}>Feedback channel</p>
            <h2>The concept address cannot receive reports.</h2>
            <p>
              The displayed address <code>{catalog.site.contactEmail}</code> uses the reserved
              <code> .example</code> domain and is not monitored. The inquiry demonstration also sends
              nothing. A live deployment must replace both with an accessible support method and identify
              who is responsible for responding.
            </p>
            <div className={styles.actions}>
              <Link className={styles.secondaryLink} href="/contact">Review contact options</Link>
            </div>
          </section>
        </article>
      </div>
    </Container>
  );
}

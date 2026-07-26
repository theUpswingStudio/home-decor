import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Container } from "@/components/ui/container";
import { catalog } from "@/lib/catalog";
import styles from "../info.module.css";

export const metadata: Metadata = {
  title: "About Vestrel House",
  description:
    "The editorial point of view and consultation-led model behind the fictional Vestrel House design concept.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <Container className={styles.page}>
      <Breadcrumbs items={[{ href: "/", label: "Home" }, { label: "About" }]} />
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>The house notes</p>
          <h1 className={styles.title}>An edit with room to become yours.</h1>
          <p className={styles.lede}>{catalog.site.story}</p>
        </div>
        <aside className={styles.heroAside} aria-label="Concept disclosure">
          <strong>Portfolio concept</strong>
          <p>
            Vestrel House is a fictional design-retail experience. It demonstrates
            an editorial catalog and consultation workflow; it is not an operating retailer.
          </p>
        </aside>
      </header>

      <div className={styles.layout}>
        <nav className={styles.sideNav} aria-label="On this page">
          <h2>Inside the edit</h2>
          <ul>
            <li><a href="#point-of-view">Point of view</a></li>
            <li><a href="#how-it-works">How it works</a></li>
            <li><a href="#imagery">Imagery</a></li>
          </ul>
        </nav>
        <article className={styles.article}>
          <section className={styles.section} id="point-of-view">
            <p className={styles.kicker}>Collected modernism</p>
            <h2>Fewer pieces, stronger relationships.</h2>
            <p>
              The catalog is organized around proportion, utility, and material contrast rather
              than a single matched look. Quiet upholstery can sit beside graphic metal; a broad
              stone plane can make fine timber feel lighter. The intent is coherence without sameness.
            </p>
            <p>
              Every room edit begins with circulation and daily use. Styling follows only after the
              practical questions of scale, comfort, storage, light, and access have a clear answer.
            </p>
          </section>

          <section className={styles.section} id="how-it-works">
            <p className={styles.kicker}>Consultation only</p>
            <h2>A proposal replaces the checkout.</h2>
            <ol className={styles.numberedList}>
              <li>Collect pieces and note the room, dimensions, destination, timing, and constraints.</li>
              <li>Use the inquiry demonstration to explore how a consultant would frame the project.</li>
              <li>In a live service, selections, delivery, installation, taxes, and terms would be reviewed in a written proposal before any approval.</li>
            </ol>
            <div className={styles.actions}>
              <Link className={styles.primaryLink} href="/design-services">Explore design services</Link>
              <Link className={styles.secondaryLink} href="/shop">Browse the catalog</Link>
            </div>
          </section>

          <section className={styles.section} id="imagery">
            <p className={styles.kicker}>A note on imagery</p>
            <h2>Product reference and atmosphere are kept distinct.</h2>
            <p>
              The experience uses credited Unsplash photography. Images marked as context or
              lifestyle references communicate proportion, palette, or atmosphere and do not claim
              to show an exact catalog product. Product image descriptions identify when a photograph
              represents a fictional item.
            </p>
          </section>
        </article>
      </div>
    </Container>
  );
}

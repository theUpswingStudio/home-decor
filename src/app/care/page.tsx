import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Container } from "@/components/ui/container";
import styles from "../info.module.css";

export const metadata: Metadata = {
  title: "Product Care | Vestrel House",
  description:
    "A practical furniture, textile, lighting, wood, metal, and stone care guide for the Vestrel House catalog concept.",
  alternates: { canonical: "/care" },
};

const MATERIALS = [
  {
    title: "Upholstery and textiles",
    copy: "Vacuum gently with the appropriate attachment. Blot spills promptly with a clean, undyed cloth rather than rubbing. Avoid saturating the material, and use a qualified cleaner for set stains or fiber-specific treatment.",
  },
  {
    title: "Wood and veneer",
    copy: "Dust with a soft dry cloth and wipe spills promptly. Use coasters and felt pads, avoid abrasive products, and limit prolonged direct sunlight or concentrated heat that can shift tone or moisture content.",
  },
  {
    title: "Stone and mineral surfaces",
    copy: "Use coasters and trivets. Clean with a soft damp cloth and a product suitable for the specific surface. Avoid acidic, solvent-based, or abrasive cleaners unless the product instructions expressly permit them.",
  },
  {
    title: "Metal, glass, and lighting",
    copy: "Dust with a dry soft cloth and avoid aggressive polish on coated finishes. Disconnect lighting before cleaning. Electrical installation or repair belongs with an appropriately qualified local professional.",
  },
] as const;

export default function CarePage() {
  return (
    <Container className={styles.page}>
      <Breadcrumbs items={[{ href: "/", label: "Home" }, { label: "Product care" }]} />
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>Product care</p>
          <h1 className={styles.title}>Care for the material you actually have.</h1>
          <p className={styles.lede}>
            Start with the item-specific instructions on each product page. This general guide
            supports routine care but does not replace finish, textile, or manufacturer guidance.
          </p>
        </div>
        <aside className={styles.heroAside} aria-label="Care principle">
          <strong>First response</strong>
          <p>Use the least aggressive method first, test discreetly, and stop if color, sheen, or texture changes.</p>
        </aside>
      </header>

      <div className={styles.layout}>
        <nav className={styles.sideNav} aria-label="On this page">
          <h2>Care guide</h2>
          <ul>
            <li><a href="#routine">Routine care</a></li>
            <li><a href="#materials">By material</a></li>
            <li><a href="#professional">When to pause</a></li>
          </ul>
        </nav>
        <article className={styles.article}>
          <section className={styles.section} id="routine">
            <p className={styles.kicker}>A light routine</p>
            <h2>Small habits protect the finish.</h2>
            <ul className={styles.list}>
              <li>Remove dust before it becomes abrasive and reach seams, vents, and moving parts.</li>
              <li>Blot spills quickly; avoid hard scrubbing, excess moisture, and untested cleaners.</li>
              <li>Rotate loose cushions and rugs where appropriate to distribute wear and exposure.</li>
              <li>Protect surfaces from hot objects, standing liquid, sharp edges, and prolonged direct sun.</li>
              <li>Retighten permitted assembly hardware periodically without over-torquing it.</li>
            </ul>
          </section>

          <section className={styles.section} id="materials">
            <p className={styles.kicker}>Material notes</p>
            <h2>Different surfaces need different restraint.</h2>
            <div className={styles.cardGrid}>
              {MATERIALS.map((material) => (
                <section className={styles.card} key={material.title}>
                  <h3>{material.title}</h3>
                  <p>{material.copy}</p>
                </section>
              ))}
            </div>
          </section>

          <section className={styles.section} id="professional">
            <p className={styles.kicker}>Pause before treating</p>
            <h2>Some work should not be improvised.</h2>
            <p>
              Stop and seek material-specific advice for deep stains, torn upholstery, loose structural
              joints, cracked stone, damaged electrical components, or finish changes that spread during
              a spot test. The demo does not provide repair referrals or warranty service.
            </p>
            <div className={styles.actions}>
              <Link className={styles.secondaryLink} href="/shop">Find product-specific care notes</Link>
            </div>
          </section>
        </article>
      </div>
    </Container>
  );
}

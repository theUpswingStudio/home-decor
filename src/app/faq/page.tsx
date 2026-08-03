import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Container } from "@/components/ui/container";
import styles from "../info.module.css";

export const metadata: Metadata = {
  title: "Frequently Asked Questions | Vestrel House",
  description:
    "Answers about the Vestrel House portfolio concept, consultation model, catalog, delivery planning, and inquiry demonstration.",
  alternates: { canonical: "/faq" },
};

const QUESTIONS = [
  {
    question: "Is Vestrel House an operating retailer?",
    answer:
      "No. Vestrel House is a fictional portfolio concept demonstrating an editorial furniture catalog, locally saved selections, and a consultation-led inquiry flow. It cannot accept payment, create an order, or provide customer service.",
  },
  {
    question: "Can I buy a piece through the site?",
    answer:
      "No. There is no online checkout. Saving a piece to Project Edit keeps a planning selection in your browser. It does not reserve inventory or begin a purchase. In the imagined live service, a consultant would confirm selections and project costs in a written proposal.",
  },
  {
    question: "Are prices and lead times guaranteed?",
    answer:
      "No. Prices, variants, and lead-time labels are demonstration catalog content. They do not represent live inventory, a quote, or a timing commitment. Delivery, duties, taxes, and installation are not included in displayed product prices.",
  },
  {
    question: "Where would the concept deliver?",
    answer:
      "The fictional service model is designed around the contiguous United States and serviceable Canadian destinations. Remote, island, Alaska, and Hawaii projects would require individual review. No delivery service is active in this demo.",
  },
  {
    question: "How would changes or returns work?",
    answer:
      "Eligibility would vary by piece and project stage and would be stated before approval in an item-specific proposal. This demonstration has no completed orders and therefore cannot accept a cancellation, change, damage report, or return.",
  },
  {
    question: "Are swatches available?",
    answer:
      "The concept anticipates reviewing available finish and textile samples before proposal approval because photography and screens cannot reliably establish color or texture. The demo does not ship physical samples.",
  },
  {
    question: "What happens when I complete the inquiry?",
    answer:
      "The form validates the two-step experience in your browser and then confirms that nothing was transmitted. Contact and project details remain in temporary page state only and disappear when you leave the page.",
  },
  {
    question: "Are the displayed reviews from customers?",
    answer:
      "No. Any review-like content is prominently marked as a fictional sample for portfolio demonstration. It is excluded from aggregate ratings and structured data and should not be read as a testimonial.",
  },
] as const;

export default function FaqPage() {
  return (
    <Container className={styles.page}>
      <Breadcrumbs items={[{ href: "/", label: "Home" }, { label: "Frequently asked questions" }]} />
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>Questions, answered</p>
          <h1 className={styles.title}>What this house is, and what it is not.</h1>
          <p className={styles.lede}>
            Straight answers about catalog selections, consultation, project planning, and the
            boundaries of this fictional demonstration.
          </p>
        </div>
        <aside className={styles.heroAside} aria-label="Quick answer">
          <strong>The short version</strong>
          <p>You can explore and plan here, but you cannot place an order or transmit an inquiry.</p>
        </aside>
      </header>

      <div className={styles.layout}>
        <nav className={styles.sideNav} aria-label="Help topics">
          <h2>More guidance</h2>
          <ul>
            <li><Link href="/shipping-returns">Delivery and returns</Link></li>
            <li><Link href="/care">Product care</Link></li>
            <li><Link href="/privacy">Privacy</Link></li>
            <li><Link href="/contact">Contact</Link></li>
          </ul>
        </nav>
        <article className={styles.article}>
          <section className={styles.section} aria-labelledby="faq-heading">
            <p className={styles.kicker}>The essentials</p>
            <h2 id="faq-heading">Common questions</h2>
            <div className={styles.faqList}>
              {QUESTIONS.map((item) => (
                <details key={item.question}>
                  <summary>{item.question}</summary>
                  <div className={styles.faqAnswer}><p>{item.answer}</p></div>
                </details>
              ))}
            </div>
          </section>
        </article>
      </div>
    </Container>
  );
}

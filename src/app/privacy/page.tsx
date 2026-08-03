import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Container } from "@/components/ui/container";
import styles from "../info.module.css";

export const metadata: Metadata = {
  title: "Privacy Notes | Vestrel House",
  description:
    "A transparent account of browser storage, inquiry data, hosting requests, and third-party imagery in the Vestrel House demonstration.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <Container className={styles.page}>
      <Breadcrumbs items={[{ href: "/", label: "Home" }, { label: "Privacy" }]} />
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>Privacy notes</p>
          <h1 className={styles.title}>The demo keeps its data footprint small.</h1>
          <p className={styles.lede}>
            This page describes the implemented behavior of a portfolio demonstration. It is not a
            substitute for the privacy notice an operating business would need for its services and jurisdiction.
          </p>
        </div>
        <aside className={styles.heroAside} aria-label="Key privacy point">
          <strong>No inquiry transmission</strong>
          <p>The consultation form does not send names, contact details, project notes, or postal codes to a server.</p>
        </aside>
      </header>

      <div className={styles.layout}>
        <nav className={styles.sideNav} aria-label="On this page">
          <h2>Data behavior</h2>
          <ul>
            <li><a href="#inquiry">Inquiry form</a></li>
            <li><a href="#storage">Browser storage</a></li>
            <li><a href="#requests">Network requests</a></li>
            <li><a href="#choices">Your choices</a></li>
          </ul>
        </nav>
        <article className={styles.article}>
          <section className={styles.section} id="inquiry">
            <p className={styles.kicker}>Temporary form state</p>
            <h2>Inquiry details stay on the page.</h2>
            <p>
              With JavaScript enabled, fields entered in the inquiry demonstration are held in
              temporary React state so the two-step interface can work. The controls have no form
              submission names, and Continue and Complete are non-submit actions, so values cannot
              be serialized by the browser when JavaScript is unavailable. No API request is made,
              and the values are not written to local or session storage. Leaving or reloading the
              page clears them. In local development only, completing the demonstration logs the
              constructed payload to the developer console; production does not log it.
            </p>
            <div className={styles.notice}>
              <strong>Do not enter sensitive information.</strong>
              <p>The form is a UX demonstration. Do not include payment details, passwords, access codes, or other confidential material.</p>
            </div>
          </section>

          <section className={styles.section} id="storage">
            <p className={styles.kicker}>Local selections</p>
            <h2>Project Edit is a browser-side planning list.</h2>
            <p>
              When browser storage is available, the site stores selected product, room, material,
              and variant identifiers. It also stores quantities, a schema version, and an update
              timestamp under <code>vestrel-house:project-edit:v1</code>. It does not store names,
              email addresses, payment details, or delivery addresses. Saved entries expire after
              30 days. You can remove them from Project Edit or clear the site data.
            </p>
          </section>

          <section className={styles.section} id="requests">
            <p className={styles.kicker}>Site delivery</p>
            <h2>Normal web requests still occur.</h2>
            <p>
              A hosting provider may process standard request information needed to serve and secure
              the site, such as an IP address, requested URL, user agent, and timestamp. Catalog imagery
              originates from Unsplash and is delivered through the application&apos;s image pipeline. This
              codebase does not intentionally add advertising trackers, analytics scripts, user accounts,
              or marketing cookies.
            </p>
          </section>

          <section className={styles.section} id="choices">
            <p className={styles.kicker}>Control</p>
            <h2>Clear what the browser remembers.</h2>
            <ul className={styles.list}>
              <li>Remove entries or clear the full list from the Project Edit page.</li>
              <li>Clear this site&apos;s local storage using browser privacy controls.</li>
              <li>Leave or reload the inquiry page to discard temporary form values.</li>
            </ul>
            <p>
              Because Vestrel House is not an operating organization and its <code>.example</code> email
              cannot receive messages, this demo does not offer a functioning privacy-request channel.
              A production deployment must identify its actual operator and provide appropriate contact details.
            </p>
          </section>
        </article>
      </div>
    </Container>
  );
}

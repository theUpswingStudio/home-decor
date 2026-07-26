import type { Metadata } from "next";
import Image from "next/image";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { catalog } from "@/lib/catalog";
import styles from "./design-services.module.css";

export const metadata: Metadata = {
  title: "Design Services",
  description:
    "Focused furniture planning, room design, and trade support from Vestrel House.",
};

const PROCESS = [
  {
    title: "Frame the room",
    description:
      "Share the room, measurements, timing, working investment, and any pieces that need to stay.",
  },
  {
    title: "Edit the options",
    description:
      "A consultant would compare scale, finish, comfort, lead time, access, and installation needs.",
  },
  {
    title: "Review a proposal",
    description:
      "Nothing is purchased online. Final selections, quantities, delivery, and terms would be documented for review first.",
  },
] as const;

export default function DesignServicesPage() {
  const inquiry = catalog.inquiry;
  const roomReference = catalog.rooms.find(
    (room) => room.slug === "living-room",
  );
  const materialReference = catalog.collections.find(
    (collection) => collection.slug === "material-study",
  );
  const roomImage = roomReference?.media.find((image) => image.role === "hero");
  const materialImage = materialReference?.media.find(
    (image) => image.role === "detail",
  );

  if (!roomReference || !materialReference || !roomImage || !materialImage) {
    throw new Error("Design service references are missing from the catalog.");
  }

  return (
    <Container className={styles.page}>
      <Breadcrumbs
        items={[{ href: "/", label: "Home" }, { label: "Design services" }]}
      />

      <section className={styles.hero} aria-labelledby="design-services-title">
        <div className={styles.heroCopy}>
          <p className={styles.serviceName}>{inquiry.eyebrow}</p>
          <h1 id="design-services-title">{inquiry.title}</h1>
          <p className={styles.heroDescription}>{inquiry.description}</p>
        </div>
        <div className={styles.heroAction}>
          <ButtonLink href="/design-services/inquire">
            Tell us about your project
          </ButtonLink>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="service-options-title">
        <div className={styles.sectionHeading}>
          <h2 id="service-options-title">Choose the right level of support.</h2>
          <p>
            Start with the shape of the decision, from a focused comparison to
            connected rooms or professional project coordination.
          </p>
        </div>
        <ul className={styles.serviceList}>
          {inquiry.serviceOptions.map((service) => (
            <li key={service.id}>
              <h3>{service.label}</h3>
              <p>{service.description}</p>
            </li>
          ))}
        </ul>
      </section>

      <section
        className={styles.deliverable}
        aria-labelledby="consultation-output-title"
      >
        <header className={styles.deliverableIntro}>
          <h2 id="consultation-output-title">
            See the thinking before you approve the pieces.
          </h2>
          <p>
            A room plan connects atmosphere to practical decisions: placement,
            finish, circulation, access, and the order in which each choice needs
            to be confirmed.
          </p>
        </header>

        <div className={styles.study}>
          <figure className={styles.roomReference}>
            <div className={styles.roomImageFrame}>
              <Image
                className={styles.referenceImage}
                src={roomImage.url}
                alt={`Catalog room reference, not a completed client project: ${roomImage.alt}`}
                fill
                sizes="(max-width: 47.99rem) calc(100vw - 2rem), (max-width: 63.99rem) 64vw, (max-width: 89.99rem) 56vw, 760px"
              />
            </div>
            <figcaption className={styles.referenceCaption}>
              <span>Catalog room reference / {roomReference.name}</span>
              <span>Photograph by {roomImage.creatorName}</span>
            </figcaption>
          </figure>

          <figure className={styles.materialReference}>
            <div className={styles.materialImageFrame}>
              <Image
                className={styles.referenceImage}
                src={materialImage.url}
                alt={`Catalog material reference, not a project sample: ${materialImage.alt}`}
                fill
                sizes="(max-width: 47.99rem) calc(100vw - 2rem), (max-width: 63.99rem) 30vw, 17vw"
              />
            </div>
            <figcaption className={styles.referenceCaption}>
              <span>Material reference / {materialReference.name}</span>
              <span>Photograph by {materialImage.creatorName}</span>
            </figcaption>
          </figure>

          <figure className={styles.planSheet}>
            <figcaption className={styles.planMeta}>
              <span>Representative output</span>
              <span>Illustrative / not to scale</span>
            </figcaption>
            <h3>Living room direction</h3>
            <div
              className={styles.planDiagram}
              role="img"
              aria-label="Illustrative room plan with a sofa, two lounge chairs, a low table, and a clear entry path"
            >
              <span className={styles.planSofa}>Sofa</span>
              <span className={`${styles.planChair} ${styles.planChairOne}`}>
                Chair
              </span>
              <span className={`${styles.planChair} ${styles.planChairTwo}`}>
                Chair
              </span>
              <span className={styles.planTable}>Low table</span>
              <span className={styles.planPath}>Clear path</span>
            </div>
            <div className={styles.specification}>
              <p>Specification excerpt</p>
              <dl>
                {materialReference.palette.map((material, index) => (
                  <div key={material}>
                    <dt>{["Wood", "Stone", "Metal", "Textile"][index]}</dt>
                    <dd>{material}</dd>
                  </div>
                ))}
              </dl>
              <p className={styles.sampleNote}>
                Direction only; available finish samples would be reviewed before
                approval.
              </p>
            </div>
          </figure>
        </div>

        <div className={styles.deliverableOutcome}>
          <h3>What the consultation produces</h3>
          <div>
            <p>
              For a single-room plan, the working package would bring the room
              direction and purchasing decisions into one reviewable record. The
              exact depth follows the service level and project scope.
            </p>
            <ul>
              <li>Furniture placement and an edited set of selections</li>
              <li>Finish, quantity, fit, and delivery-access notes</li>
              <li>Lead-time guidance and a written proposal before purchase</li>
            </ul>
          </div>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="process-title">
        <div className={styles.sectionHeading}>
          <h2 id="process-title">A proposal, not a checkout.</h2>
          <p>
            Consultation keeps fit, finish, delivery access, and installation in
            the same conversation as the furniture.
          </p>
        </div>
        <ol className={styles.processList}>
          {PROCESS.map((item, index) => (
            <li key={item.title}>
              <span className={styles.processNumber}>0{index + 1}</span>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.closing} aria-labelledby="start-project-title">
        <h2 id="start-project-title">Start with what the room needs to do.</h2>
        <p>
          The inquiry takes two short steps. This portfolio demonstration does
          not transmit submissions or begin a purchase.
        </p>
        <ButtonLink href="/design-services/inquire">Start the inquiry</ButtonLink>
      </section>
    </Container>
  );
}

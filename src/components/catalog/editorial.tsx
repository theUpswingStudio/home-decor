import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  SharedMediaTransition,
  sharedMediaName,
  sharedMediaTransitionType,
  type SharedMediaKind,
} from "@/components/motion/shared-media-transition";
import { Container } from "@/components/ui/container";
import type { CatalogImage, Product } from "@/data/catalog";
import { BreadcrumbTrail } from "./breadcrumb-trail";
import styles from "./editorial.module.css";
import { ProductGrid } from "./product-grid";

export interface EditorialEntry {
  readonly href: string;
  readonly kind: Exclude<SharedMediaKind, "product">;
  readonly slug: string;
  readonly title: string;
  readonly description: string;
  readonly image: CatalogImage;
  readonly kicker?: string;
}

interface EditorialLandingProps {
  title: string;
  introduction: string;
  entries: readonly EditorialEntry[];
}

export function EditorialLanding({ title, introduction, entries }: EditorialLandingProps) {
  return (
    <div className={styles.page}>
      <Container>
        <BreadcrumbTrail items={[{ href: "/", label: "Home" }, { label: title }]} />
        <header className={styles.header}>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.introduction}>{introduction}</p>
        </header>
        <ol className={styles.indexList}>
          {entries.map((entry, index) => (
            <li className={styles.indexItem} key={entry.href}>
              <Link
                className={styles.entryLink}
                href={entry.href}
                prefetch={false}
                transitionTypes={[
                  sharedMediaTransitionType(entry.kind, entry.slug),
                ]}
              >
                <SharedMediaTransition kind={entry.kind} slug={entry.slug}>
                  <div
                    className={styles.entryMedia}
                    data-shared-media-name={sharedMediaName(entry.kind, entry.slug)}
                    data-primary-image-id={entry.image.id}
                  >
                    <Image
                      className={styles.entryImage}
                      src={entry.image.url}
                      alt={entry.image.alt}
                      width={entry.image.width}
                      height={entry.image.height}
                      sizes="(max-width: 47.99rem) calc(100vw - 2rem), calc(50vw - 3rem)"
                      preload={index === 0}
                    />
                  </div>
                </SharedMediaTransition>
                <div className={styles.entryCopy}>
                  {entry.kicker ? <p className={styles.entryKicker}>{entry.kicker}</p> : null}
                  <h2 className={styles.entryTitle}>{entry.title}</h2>
                  <p className={styles.entryDescription}>{entry.description}</p>
                  <p className={styles.credit}>Photograph by {entry.image.creatorName}</p>
                </div>
              </Link>
            </li>
          ))}
        </ol>
      </Container>
    </div>
  );
}

interface EditorialDetailProps {
  title: string;
  description: string;
  parentHref: string;
  parentLabel: string;
  kind: Exclude<SharedMediaKind, "product">;
  slug: string;
  media: readonly CatalogImage[];
  kicker?: string;
  notes?: readonly string[];
  children?: ReactNode;
}

export function EditorialDetail({
  title,
  description,
  parentHref,
  parentLabel,
  kind,
  slug,
  media,
  kicker,
  notes = [],
  children,
}: EditorialDetailProps) {
  const primaryImage = media.find((image) => image.role === "hero") ?? media[0];
  if (!primaryImage) throw new Error("Editorial detail is missing primary media.");
  const secondaryImage = media.find((image) => image.id !== primaryImage.id);
  const visibleMedia = secondaryImage
    ? [primaryImage, secondaryImage]
    : [primaryImage];

  return (
    <div className={styles.page}>
      <Container>
        <BreadcrumbTrail
          items={[
            { href: "/", label: "Home" },
            {
              href: parentHref,
              label: parentLabel,
              transitionTypes: [sharedMediaTransitionType(kind, slug)],
            },
            { label: title },
          ]}
        />
        <header className={styles.detailHeader}>
          {kicker ? <p className={styles.detailKicker}>{kicker}</p> : null}
          <h1 className={styles.detailTitle}>{title}</h1>
          <p className={styles.detailDescription}>{description}</p>
        </header>
        <div className={styles.mediaGrid}>
          {visibleMedia.map((image, index) => {
            const mediaFrame = (
              <div
                className={index === 0 ? styles.heroMedia : styles.detailMedia}
                data-shared-media-name={
                  index === 0 ? sharedMediaName(kind, slug) : undefined
                }
                data-primary-image-id={index === 0 ? image.id : undefined}
              >
                <Image
                  className={index === 0 ? styles.heroImage : styles.detailImage}
                  src={image.url}
                  alt={image.alt}
                  width={image.width}
                  height={image.height}
                  sizes={index === 0 ? "(max-width: 47.99rem) calc(100vw - 2rem), 66vw" : "(max-width: 47.99rem) calc(100vw - 2rem), 30vw"}
                  preload={index === 0}
                />
              </div>
            );

            return (
              <figure className={styles.mediaFigure} key={image.id}>
                {index === 0 ? (
                  <SharedMediaTransition kind={kind} slug={slug}>
                    {mediaFrame}
                  </SharedMediaTransition>
                ) : mediaFrame}
                <figcaption className={styles.credit}>Photograph by {image.creatorName}</figcaption>
              </figure>
            );
          })}
        </div>
        {notes.length > 0 ? (
          <ul className={styles.notes} aria-label="Styling notes">
            {notes.map((note) => <li className={styles.note} key={note}>{note}</li>)}
          </ul>
        ) : null}
        {children ? <div className={styles.below}>{children}</div> : null}
      </Container>
    </div>
  );
}

interface EditorialProductSectionProps {
  title: string;
  products: readonly Product[];
  id: string;
}

export function EditorialProductSection({ title, products, id }: EditorialProductSectionProps) {
  return (
    <section aria-labelledby={id}>
      <h2 className={styles.productHeading} id={id}>{title}</h2>
      <ProductGrid products={products} labelledBy={id} />
    </section>
  );
}

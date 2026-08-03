import { ArrowRightIcon } from "@phosphor-icons/react/ssr";
import Image from "next/image";
import Link from "next/link";
import {
  SharedMediaTransition,
  sharedMediaName,
  sharedMediaTransitionType,
} from "@/components/motion/shared-media-transition";
import type { CatalogImage, Product, Room } from "@/data/catalog";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import {
  catalog,
  formatProductPrice,
  getCategoryById,
  getCollectionBySlug,
  getFeaturedProducts,
  getProductsByLook,
  getRoomById,
} from "@/lib/catalog";
import styles from "./home-page.module.css";
import { LookCarousel } from "./look-carousel";
import carouselStyles from "./look-carousel.module.css";

const roomPlacements = [
  { className: styles.roomLiving, sizes: "(max-width: 704px) calc(100vw - 2rem), (max-width: 1024px) calc(100vw - 4rem), (max-width: 1400px) 65vw, 900px" },
  { className: styles.roomDining, sizes: "(max-width: 704px) calc(100vw - 2rem), (max-width: 1024px) calc(100vw - 4rem), (max-width: 1400px) 34vw, 470px" },
  { className: styles.roomBedroom, sizes: "(max-width: 704px) calc(100vw - 2rem), (max-width: 1024px) calc(100vw - 4rem), (max-width: 1400px) 41vw, 570px" },
  { className: styles.roomWorkspace, sizes: "(max-width: 704px) calc(100vw - 2rem), (max-width: 1024px) calc(100vw - 4rem), (max-width: 1400px) 57vw, 790px" },
];

const featuredRoles: Readonly<Record<string, string>> = {
  "vale-modular-sofa": "Room anchor",
  "arden-dining-table": "Dining anchor",
  "brera-lounge-chair": "Counterpoint seat",
  "plinth-low-table": "Mineral weight",
  "canto-chaise-sectional": "Deeper lounge option",
  "ledger-media-credenza": "Quiet storage",
};

function getPrimaryImage(images: readonly CatalogImage[]): CatalogImage {
  const image =
    images.find((candidate) => candidate.role === "hero") ?? images[0];

  if (!image) throw new Error("Catalog media group is missing its primary image.");
  return image;
}

function getProductContext(product: Product): string {
  const category = getCategoryById(product.categoryId);
  const room = product.roomIds[0] ? getRoomById(product.roomIds[0]) : undefined;
  return [category?.name, room?.name].filter(Boolean).join(" / ");
}

function ProductEditMetadata({ product }: { product: Product }) {
  const context = getProductContext(product);

  return (
    <p className={styles.productMetadata}>
      <span>{featuredRoles[product.slug] ?? "Supporting piece"}</span>
      <span>Reference image{context ? ` · ${context}` : ""}</span>
    </p>
  );
}

function ProductAnchor({ product }: { product: Product }) {
  const image = getPrimaryImage(product.images);
  const price = formatProductPrice(product);

  return (
    <article className={styles.productAnchor}>
      <Link
        className={styles.productAnchorLink}
        href={`/products/${product.slug}`}
        prefetch={false}
        data-pressable="card"
      >
        <div className={styles.productAnchorImageFrame}>
          <Image
            className={styles.productImage}
            src={image.url}
            alt={image.alt}
            fill
            sizes="(max-width: 704px) calc(100vw - 2rem), (max-width: 1024px) calc(100vw - 4rem), (max-width: 1440px) 56vw, 760px"
          />
        </div>
        <div className={styles.productAnchorDetails}>
          <ProductEditMetadata product={product} />
          <div className={styles.productAnchorIdentity}>
            <h3>{product.name}</h3>
            <div className={styles.productAnchorDestination}>
              {price ? <p>{price}</p> : null}
              <ArrowRightIcon
                className={styles.productAnchorArrow}
                size={18}
                weight="regular"
                aria-hidden="true"
              />
            </div>
          </div>
          <p className={styles.productAnchorDescription}>{product.shortDescription}</p>
        </div>
      </Link>
    </article>
  );
}

function ProductEditRow({ product }: { product: Product }) {
  const image = getPrimaryImage(product.images);
  const price = formatProductPrice(product);

  return (
    <article className={styles.productRow}>
      <Link
        className={styles.productRowLink}
        href={`/products/${product.slug}`}
        prefetch={false}
        data-pressable="card"
      >
        <div className={styles.productRowImageFrame}>
          <Image
            className={styles.productImage}
            src={image.url}
            alt={image.alt}
            fill
            sizes="140px"
          />
        </div>
        <div className={styles.productRowDetails}>
          <ProductEditMetadata product={product} />
          <div className={styles.productRowIdentity}>
            <h3>{product.name}</h3>
            {price ? <p>{price}</p> : null}
          </div>
        </div>
        <ArrowRightIcon
          className={styles.productRowArrow}
          size={18}
          weight="regular"
          aria-hidden="true"
        />
      </Link>
    </article>
  );
}

function RoomPreview({
  room,
  className,
  sizes,
}: {
  room: Room;
  className: string;
  sizes: string;
}) {
  const image = getPrimaryImage(room.media);

  return (
    <article className={`${styles.roomPreview} ${className}`}>
      <Link
        className={styles.roomLink}
        href={`/rooms/${room.slug}`}
        prefetch={false}
        transitionTypes={[sharedMediaTransitionType("room", room.slug)]}
      >
        <SharedMediaTransition kind="room" slug={room.slug}>
          <div
            className={styles.roomImageFrame}
            data-shared-media-name={sharedMediaName("room", room.slug)}
            data-primary-image-id={image.id}
          >
            <Image
              className={styles.editorialImage}
              src={image.url}
              alt={image.alt}
              fill
              sizes={sizes}
            />
          </div>
        </SharedMediaTransition>
        <div className={styles.roomCaption}>
          <h3>{room.name}</h3>
          <p>{room.shortDescription}</p>
          <ArrowRightIcon size={18} weight="regular" aria-hidden="true" />
        </div>
      </Link>
    </article>
  );
}

export function HomePage() {
  const heroImage = getPrimaryImage(catalog.site.heroMedia);
  const heroDetail = catalog.site.heroMedia[2] ?? catalog.site.heroMedia[1];
  const featuredProducts = getFeaturedProducts(6);
  const anchorProduct = featuredProducts.find(
    (product) => product.slug === "vale-modular-sofa",
  );
  const supportingProducts = featuredProducts.filter(
    (product) => product.slug !== "vale-modular-sofa",
  );
  const materialCollection = getCollectionBySlug("material-study");

  if (
    !materialCollection ||
    catalog.looks.length === 0 ||
    !anchorProduct ||
    supportingProducts.length !== 5
  ) {
    throw new Error("Homepage editorial selections are missing from the catalog.");
  }

  const materialImage = getPrimaryImage(materialCollection.media);
  const planningPolicies = catalog.policies.filter((policy) =>
    ["shipping-delivery", "installation-access", "materials-swatches"].includes(
      policy.slug,
    ),
  );

  return (
    <div className={styles.page}>
      <section className={styles.hero} aria-labelledby="home-hero-title">
        <Container className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <p className={styles.heroBrand}>{catalog.site.brandName}</p>
            <h1 id="home-hero-title" className={styles.heroTitle}>
              <span>Modern rooms,</span>
              <span>collected slowly.</span>
            </h1>
            <p className={styles.heroSupport}>{catalog.site.positioning}</p>
            <div className={styles.heroActions}>
              <ButtonLink href="/design-services/inquire">Plan your room</ButtonLink>
              <Link className={styles.quietLink} href="/shop">
                Explore furniture
                <ArrowRightIcon size={18} weight="regular" aria-hidden="true" />
              </Link>
            </div>
          </div>

          <div className={styles.heroVisual}>
            <div className={styles.heroPrimaryImage}>
              <Image
                className={styles.editorialImage}
                src={heroImage.url}
                alt={heroImage.alt}
                fill
                sizes="(min-width: 768px) and (max-height: 688px) 800px, (max-width: 544px) 165vw, (max-width: 768px) 140vw, (max-width: 1024px) 125vw, 1280px"
                loading="eager"
                fetchPriority="high"
              />
            </div>
            {heroDetail ? (
              <div className={styles.heroDetailImage}>
                <Image
                  className={styles.editorialImage}
                  src={heroDetail.url}
                  alt={heroDetail.alt}
                  fill
                  sizes="(max-width: 704px) 1px, (max-width: 1024px) 640px, 700px"
                />
              </div>
            ) : null}
          </div>
        </Container>
      </section>

      <section className={styles.roomsSection} aria-labelledby="rooms-title">
        <Container>
          <div className={styles.sectionIntro}>
            <h2 id="rooms-title">Explore by room</h2>
            <p>Begin with how the room needs to live, then build its material language.</p>
          </div>
          <div className={styles.roomGrid}>
            {catalog.rooms.map((room, index) => {
              const placement = roomPlacements[index] ?? roomPlacements[0];
              return (
                <RoomPreview
                  key={room.id}
                  room={room}
                  className={placement.className}
                  sizes={placement.sizes}
                />
              );
            })}
          </div>
        </Container>
      </section>

      <section className={styles.featuredSection} aria-labelledby="featured-title">
        <Container>
          <div className={styles.featuredIntro}>
            <h2 id="featured-title">The considered edit</h2>
            <div className={styles.featuredSupport}>
              <p>Start with one room-defining anchor. Add contrast through timber, sculptural seating, mineral weight, deeper lounging, and quiet storage.</p>
            </div>
          </div>
          <div className={styles.productEditLayout}>
            <ProductAnchor product={anchorProduct} />
            <div className={styles.productRail}>
              {supportingProducts.map((product) => (
                <ProductEditRow key={product.id} product={product} />
              ))}
            </div>
          </div>
          <div className={styles.featuredActions}>
            <ButtonLink href="/design-services/inquire">
              Plan an edit for your room
            </ButtonLink>
            <Link className={styles.textLink} href="/shop">
              View all furniture
              <ArrowRightIcon size={18} weight="regular" aria-hidden="true" />
            </Link>
          </div>
        </Container>
      </section>

      <section className={styles.materialStory} aria-labelledby="material-title">
        <SharedMediaTransition kind="collection" slug={materialCollection.slug}>
          <div
            className={styles.materialImageFrame}
            data-shared-media-name={sharedMediaName(
              "collection",
              materialCollection.slug,
            )}
            data-primary-image-id={materialImage.id}
          >
            <Image
              className={styles.editorialImage}
              src={materialImage.url}
              alt={materialImage.alt}
              fill
              sizes="100vw"
            />
          </div>
        </SharedMediaTransition>
        <Container className={styles.materialBody}>
          <div className={styles.materialHeading}>
            <p>{materialCollection.seasonLabel}</p>
            <h2 id="material-title">{materialCollection.name}</h2>
          </div>
          <div className={styles.materialCopy}>
            <p className={styles.materialLead}>{materialCollection.shortDescription}</p>
            <p>{materialCollection.description}</p>
            <ul className={styles.palette} aria-label="Collection materials">
              {materialCollection.palette.map((material) => (
                <li key={material}>{material}</li>
              ))}
            </ul>
            <Link
              className={styles.materialLink}
              href={`/collections/${materialCollection.slug}`}
              transitionTypes={[
                sharedMediaTransitionType(
                  "collection",
                  materialCollection.slug,
                ),
              ]}
            >
              Explore the collection
              <ArrowRightIcon size={18} weight="regular" aria-hidden="true" />
            </Link>
          </div>
        </Container>
      </section>

      <section className={styles.lookSection} aria-label="Curated looks">
        <Container>
          <LookCarousel labels={catalog.looks.map((look) => look.name)}>
            {catalog.looks.map((look) => {
              const lookImage = getPrimaryImage(look.media);
              const lookProducts = getProductsByLook(look);
              const previewProducts = lookProducts.slice(0, 4);

              return (
                <article className={carouselStyles.lookCard} key={look.id}>
                  <header className={carouselStyles.lookHeader}>
                    <h2 className={carouselStyles.lookTitle}>{look.name}</h2>
                    <p className={carouselStyles.lookDescription}>{look.description}</p>
                  </header>
                  <div className={carouselStyles.lookLayout}>
                    <figure className={carouselStyles.lookFigure}>
                      <SharedMediaTransition kind="look" slug={look.slug}>
                        <div
                          className={carouselStyles.lookImageFrame}
                          data-shared-media-name={sharedMediaName("look", look.slug)}
                          data-primary-image-id={lookImage.id}
                        >
                          <Image
                            className={carouselStyles.lookImage}
                            src={lookImage.url}
                            alt={lookImage.alt}
                            fill
                            sizes="(max-width: 768px) calc(100vw - 4rem), (max-width: 1024px) 55vw, (max-width: 1439px) 52vw, 760px"
                          />
                        </div>
                      </SharedMediaTransition>
                      <figcaption className={carouselStyles.lookCredit}>
                        Reference interior image. Photograph by {lookImage.creatorName}.
                      </figcaption>
                    </figure>
                    <div className={carouselStyles.lookProducts}>
                      <ol>
                        {previewProducts.map((product, index) => (
                          <li key={product.id}>
                            <Link href={`/products/${product.slug}`} prefetch={false}>
                              <span className={carouselStyles.lookIndex} aria-hidden="true">
                                {String(index + 1).padStart(2, "0")}
                              </span>
                              <span className={carouselStyles.lookProductName}>{product.name}</span>
                              <span className={carouselStyles.lookPrice}>
                                {formatProductPrice(product)}
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ol>
                      <Link
                        className={carouselStyles.completeLink}
                        href={`/looks/${look.slug}`}
                        transitionTypes={[
                          sharedMediaTransitionType("look", look.slug),
                        ]}
                      >
                        View the complete look
                        <ArrowRightIcon size={18} weight="regular" aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </LookCarousel>
        </Container>
      </section>

      <section className={styles.consultation} aria-labelledby="consultation-title">
        <Container>
          <div className={styles.consultationInner}>
            <h2 id="consultation-title">{catalog.inquiry.title}</h2>
            <div className={styles.consultationAction}>
              <p>
                A consultant will shape an edited furniture plan, confirm fit, and prepare a transparent proposal.
              </p>
              <ButtonLink
                className={styles.consultationButton}
                href="/design-services/inquire"
              >
                {catalog.site.primaryCtaLabel}
              </ButtonLink>
            </div>
          </div>
        </Container>
      </section>

      <section className={styles.planning} aria-labelledby="planning-title">
        <Container className={styles.planningGrid}>
          <h2 id="planning-title">Delivery and planning</h2>
          {planningPolicies.map((policy) => (
            <article key={policy.id} className={styles.policy}>
              <h3>{policy.title}</h3>
              <p>{policy.summary}</p>
            </article>
          ))}
        </Container>
      </section>
    </div>
  );
}

import { ArrowRightIcon } from "@phosphor-icons/react/ssr";
import Image from "next/image";
import Link from "next/link";
import type { CatalogImage, Product, Room } from "@/data/catalog";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import {
  catalog,
  formatProductPrice,
  getCategoryById,
  getCollectionBySlug,
  getFeaturedProducts,
  getLookBySlug,
  getProductsByLook,
  getRoomById,
} from "@/lib/catalog";
import styles from "./home-page.module.css";
import previewStyles from "./product-preview.module.css";

const featuredPlacements = [
  { className: styles.productOne, shape: "landscape" as const, sizes: "(max-width: 768px) calc(100vw - 2rem), 46vw" },
  { className: styles.productTwo, shape: "portrait" as const, sizes: "(max-width: 768px) calc(100vw - 2rem), 36vw" },
  { className: styles.productThree, shape: "portrait" as const, sizes: "(max-width: 768px) calc(100vw - 2rem), 29vw" },
  { className: styles.productFour, shape: "square" as const, sizes: "(max-width: 768px) calc(100vw - 2rem), 34vw" },
  { className: styles.productFive, shape: "portrait" as const, sizes: "(max-width: 768px) calc(100vw - 2rem), 24vw" },
  { className: styles.productSix, shape: "wide" as const, sizes: "(max-width: 768px) calc(100vw - 2rem), 58vw" },
];

const roomPlacements = [
  { className: styles.roomLiving, sizes: "(max-width: 768px) calc(100vw - 2rem), 55vw" },
  { className: styles.roomDining, sizes: "(max-width: 768px) calc(100vw - 2rem), 30vw" },
  { className: styles.roomBedroom, sizes: "(max-width: 768px) calc(100vw - 2rem), 31vw" },
  { className: styles.roomWorkspace, sizes: "(max-width: 768px) calc(100vw - 2rem), 47vw" },
];

function getPrimaryImage(images: readonly CatalogImage[]): CatalogImage {
  const image =
    images.find((candidate) => candidate.role === "hero") ?? images[0];

  if (!image) throw new Error("Catalog media group is missing its primary image.");
  return image;
}

function FeaturedProductPreview({
  product,
  className,
  imageSizes,
  shape,
}: {
  product: Product;
  className: string;
  imageSizes: string;
  shape: (typeof featuredPlacements)[number]["shape"];
}) {
  const image = getPrimaryImage(product.images);
  const category = getCategoryById(product.categoryId);
  const room = product.roomIds[0] ? getRoomById(product.roomIds[0]) : undefined;
  const context = [category?.name, room?.name].filter(Boolean).join(" / ");
  const price = formatProductPrice(product);
  const shapeClass = {
    landscape: previewStyles.landscape,
    portrait: previewStyles.portrait,
    square: previewStyles.square,
    wide: previewStyles.wide,
  }[shape];

  return (
    <article className={`${previewStyles.preview} ${className}`.trim()}>
      <Link className={previewStyles.link} href={`/products/${product.slug}`} prefetch={false}>
        <div className={`${previewStyles.imageFrame} ${shapeClass}`}>
          <Image
            className={previewStyles.image}
            src={image.url}
            alt={image.alt}
            fill
            sizes={imageSizes}
          />
        </div>
        <div className={previewStyles.details}>
          <p className={previewStyles.context}>
            Reference image{context ? ` | ${context}` : ""}
          </p>
          <div className={previewStyles.identity}>
            <h3 className={previewStyles.name}>{product.name}</h3>
            {price ? <p className={previewStyles.price}>{price}</p> : null}
          </div>
        </div>
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
      <Link className={styles.roomLink} href={`/rooms/${room.slug}`} prefetch={false}>
        <div className={styles.roomImageFrame}>
          <Image
            className={styles.editorialImage}
            src={image.url}
            alt={image.alt}
            fill
            sizes={sizes}
          />
        </div>
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
  const materialCollection = getCollectionBySlug("material-study");
  const look = getLookBySlug("warm-monolith");

  if (!materialCollection || !look) {
    throw new Error("Homepage editorial selections are missing from the catalog.");
  }

  const materialImage = getPrimaryImage(materialCollection.media);
  const lookImage = getPrimaryImage(look.media);
  const lookProducts = getProductsByLook(look);
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
              <ButtonLink href="/shop">Shop furniture</ButtonLink>
              <Link className={styles.quietLink} href="/design-services/inquire">
                Design consultation
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
                sizes="(max-width: 768px) calc(100vw - 2rem), (max-width: 1439px) 52vw, 760px"
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
                  sizes="(max-width: 768px) 1px, 10vw"
                />
              </div>
            ) : null}
          </div>
        </Container>
      </section>

      <section className={styles.roomsSection} aria-labelledby="rooms-title">
        <Container>
          <div className={styles.sectionIntro}>
            <h2 id="rooms-title">Shop by room</h2>
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
            <div className={styles.sectionIntro}>
              <h2 id="featured-title">The considered edit</h2>
              <p>Six pieces chosen for proportion, material presence, and life across rooms.</p>
            </div>
            <Link className={styles.textLink} href="/shop">
              View all furniture
              <ArrowRightIcon size={18} weight="regular" aria-hidden="true" />
            </Link>
          </div>
          <div className={styles.productGrid}>
            {featuredProducts.map((product, index) => {
              const placement = featuredPlacements[index] ?? featuredPlacements[0];
              return (
                <FeaturedProductPreview
                  key={product.id}
                  product={product}
                  className={placement.className}
                  imageSizes={placement.sizes}
                  shape={placement.shape}
                />
              );
            })}
          </div>
        </Container>
      </section>

      <section className={styles.materialStory} aria-labelledby="material-title">
        <div className={styles.materialImageFrame}>
          <Image
            className={styles.editorialImage}
            src={materialImage.url}
            alt={materialImage.alt}
            fill
            sizes="100vw"
          />
        </div>
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
            >
              Explore the collection
              <ArrowRightIcon size={18} weight="regular" aria-hidden="true" />
            </Link>
          </div>
        </Container>
      </section>

      <section className={styles.lookSection} aria-labelledby="look-title">
        <Container>
          <div className={styles.lookIntro}>
            <p>{look.eyebrow}</p>
            <h2 id="look-title">{look.name}</h2>
            <p>{look.description}</p>
          </div>
          <div className={styles.lookLayout}>
            <div className={styles.lookImageFrame}>
              <Image
                className={styles.editorialImage}
                src={lookImage.url}
                alt={lookImage.alt}
                fill
                sizes="(max-width: 768px) calc(100vw - 2rem), (max-width: 1439px) 62vw, 860px"
              />
            </div>
            <div className={styles.lookProducts}>
              <ol>
                {lookProducts.map((product, index) => (
                  <li key={product.id}>
                    <Link href={`/products/${product.slug}`} prefetch={false}>
                      <span className={styles.lookIndex} aria-hidden="true">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className={styles.lookProductName}>{product.name}</span>
                      <span className={styles.lookPrice}>
                        {formatProductPrice(product)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
              <Link className={styles.textLink} href={`/looks/${look.slug}`}>
                View the complete look
                <ArrowRightIcon size={18} weight="regular" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </Container>
      </section>

      <section className={styles.consultation} aria-labelledby="consultation-title">
        <Container className={styles.consultationInner}>
          <h2 id="consultation-title">{catalog.inquiry.title}</h2>
          <div className={styles.consultationAction}>
            <p>
              A consultant will shape an edited furniture plan, confirm fit, and prepare a transparent proposal.
            </p>
            <ButtonLink href="/design-services/inquire">
              {catalog.site.primaryCtaLabel}
            </ButtonLink>
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

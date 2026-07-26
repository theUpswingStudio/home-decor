import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BreadcrumbTrail } from "@/components/catalog/breadcrumb-trail";
import { ProductGallery } from "@/components/catalog/product-gallery";
import { ProductGrid } from "@/components/catalog/product-grid";
import { VariantSelector, type VariantChoice } from "@/components/catalog/variant-selector";
import {
  createBreadcrumbJsonLd,
  JsonLd,
} from "@/components/seo/json-ld";
import { Container } from "@/components/ui/container";
import { catalog, formatPrice, getCategoryById, getProductBySlug, getProductVariants, getRelatedProducts } from "@/lib/catalog";
import styles from "./product.module.css";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return catalog.products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) return {};
  return {
    title: product.seo.title,
    description: product.seo.description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      title: product.seo.title,
      description: product.seo.description,
      type: "website",
      url: `/products/${product.slug}`,
      images: [
        {
          url: "/opengraph-image",
          width: 1200,
          height: 630,
          alt: `${product.name} at Vestrel House; product photography is illustrative.`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: product.seo.title,
      description: product.seo.description,
      images: ["/opengraph-image"],
    },
  };
}

function dimensionsLabel(dimensions: { widthIn: number; heightIn: number; depthIn: number }) {
  return `${dimensions.widthIn} W × ${dimensions.depthIn} D × ${dimensions.heightIn} H in`;
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  if (!product) notFound();
  const category = getCategoryById(product.categoryId);
  const variants = getProductVariants(product);
  const variantChoices: VariantChoice[] = variants.map((variant) => ({
    id: variant.id,
    sku: variant.sku,
    label: variant.options.map((option) => `${option.name}: ${option.value}`).join(" / "),
    priceMinor: variant.priceMinor,
    priceLabel: formatPrice(variant.priceMinor, variant.currency),
    leadTimeLabel: variant.leadTimeLabel,
    dimensionsLabel: dimensionsLabel(variant.overallDimensions ?? product.dimensions.overall),
  }));
  const reviews = (product.sampleReviewIds ?? []).flatMap((id) => catalog.sampleReviews.find((review) => review.id === id) ?? []);
  const deliveryPolicy = catalog.policies.find((policy) => policy.slug === "shipping-delivery");
  const relatedProducts = getRelatedProducts(product, 4);
  const overall = product.dimensions.overall;
  const breadcrumbItems = [
    { href: "/", label: "Home" },
    { href: "/shop", label: "Shop" },
    ...(category ? [{ href: `/shop/${category.slug}`, label: category.name }] : []),
    { label: product.name },
  ];
  const structuredBreadcrumbs = [
    { name: "Home", path: "/" },
    { name: "Shop", path: "/shop" },
    ...(category
      ? [{ name: category.name, path: `/shop/${category.slug}` }]
      : []),
    { name: product.name, path: `/products/${product.slug}` },
  ];

  return (
    <>
      <JsonLd
        id="product-breadcrumb-json-ld"
        data={createBreadcrumbJsonLd(structuredBreadcrumbs)}
      />
      <div className={styles.page}>
        <Container>
          <BreadcrumbTrail items={breadcrumbItems} />

        <div className={styles.productLayout}>
          <ProductGallery images={product.images} productName={product.name} />
          <section className={styles.summary} aria-labelledby="product-title">
            {category ? <p className={styles.category}>{category.name}</p> : null}
            <h1 className={styles.title} id="product-title">{product.name}</h1>
            <p className={styles.shortDescription}>{product.shortDescription}</p>
            <VariantSelector productName={product.name} variants={variantChoices} />
            <p className={styles.commerceNote}>Delivery, installation, duties, and taxes are confirmed separately for the destination and access plan.</p>
          </section>
        </div>

        <section className={styles.descriptionSection} aria-labelledby="design-title">
          <div className={styles.descriptionGrid}>
            <h2 className={styles.sectionTitle} id="design-title">Design and use</h2>
            <p className={styles.longDescription}>{product.description}</p>
          </div>
        </section>

        <section className={styles.detailsSection} aria-labelledby="details-title">
          <h2 className={styles.sectionTitle} id="details-title">Product details</h2>
          <div className={styles.detailGrid}>
            <section className={styles.detailBlock}>
              <h3 className={styles.detailTitle}>Dimensions</h3>
              <dl className={styles.definitionList}>
                <dt>Overall</dt><dd>{dimensionsLabel(overall)}</dd>
                <dt>Item weight</dt><dd>{product.dimensions.itemWeightLb} lb</dd>
                {product.dimensions.seat ? <><dt>Seat</dt><dd>{dimensionsLabel(product.dimensions.seat)}</dd></> : null}
                {product.dimensions.cordLengthIn ? <><dt>Cord length</dt><dd>{product.dimensions.cordLengthIn} in</dd></> : null}
              </dl>
              <ul className={styles.packageList} aria-label="Package dimensions">
                {product.dimensions.packages.map((itemPackage, index) => (
                  <li className={styles.package} key={itemPackage.packageId}>
                    Package {index + 1}: {dimensionsLabel(itemPackage)}, {itemPackage.weightLb} lb
                  </li>
                ))}
              </ul>
            </section>

            <section className={styles.detailBlock}>
              <h3 className={styles.detailTitle}>Materials and construction</h3>
              <ul className={styles.list}>{product.materials.map((material) => <li key={material}>{material}</li>)}</ul>
            </section>

            <section className={styles.detailBlock}>
              <h3 className={styles.detailTitle}>Features</h3>
              <ul className={styles.list}>{product.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>
            </section>

            <section className={styles.detailBlock}>
              <h3 className={styles.detailTitle}>Care</h3>
              <ul className={styles.list}>{product.care.map((instruction) => <li key={instruction}>{instruction}</li>)}</ul>
            </section>

            <section className={styles.detailBlock}>
              <h3 className={styles.detailTitle}>Assembly</h3>
              <dl className={styles.definitionList}>
                <dt>Level</dt><dd>{product.assembly.level}</dd>
                <dt>Estimated time</dt><dd>{product.assembly.estimatedMinutes === 0 ? "None" : `${product.assembly.estimatedMinutes} minutes`}</dd>
                <dt>Professional service</dt><dd>{product.assembly.professionalInstallationAvailable ? "Available by proposal" : "Not required"}</dd>
              </dl>
              <p className={styles.longDescription}>{product.assembly.description}</p>
            </section>

            {product.comfort ? (
              <section className={styles.detailBlock}>
                <h3 className={styles.detailTitle}>Comfort</h3>
                <dl className={styles.definitionList}>
                  <dt>Feel</dt><dd>{product.comfort.feel}</dd>
                  <dt>Support</dt><dd>{product.comfort.support}</dd>
                  <dt>Cushion</dt><dd>{product.comfort.cushionFill}</dd>
                  <dt>Posture</dt><dd>{product.comfort.posture}</dd>
                </dl>
              </section>
            ) : null}

            {product.willItFit ? (
              <section className={styles.detailBlock}>
                <h3 className={styles.detailTitle}>Will it fit?</h3>
                <dl className={styles.definitionList}>
                  <dt>Minimum doorway</dt><dd>{product.willItFit.minimumDoorwayWidthIn} in</dd>
                  <dt>Recommended path</dt><dd>{product.willItFit.recommendedPathWidthIn} in</dd>
                  <dt>Elevator</dt><dd>{product.willItFit.elevatorRecommended ? "Recommended" : "Usually not required"}</dd>
                  <dt>Components</dt><dd>{product.willItFit.componentBreakdown}</dd>
                  <dt>Planning note</dt><dd>{product.willItFit.notes}</dd>
                </dl>
              </section>
            ) : null}

            {deliveryPolicy ? (
              <section className={styles.detailBlock}>
                <h3 className={styles.detailTitle}>{deliveryPolicy.title}</h3>
                <p className={styles.longDescription}>{deliveryPolicy.summary}</p>
                <ul className={styles.list}>{deliveryPolicy.details.map((detail) => <li key={detail}>{detail}</li>)}</ul>
              </section>
            ) : null}
          </div>
        </section>

        {reviews.length > 0 ? (
          <section className={styles.reviews} aria-labelledby="reviews-title">
            <h2 className={styles.sectionTitle} id="reviews-title">Sample reviews</h2>
            <p className={styles.disclosure}>These reviews are labelled fictional samples for portfolio demonstration. They are not customer testimonials and carry no aggregate rating.</p>
            <ul className={styles.reviewList}>
              {reviews.map((review) => (
                <li className={styles.review} key={review.id}>
                  <p className={styles.sampleLabel}>Fictional sample review</p>
                  <blockquote className={styles.quote}>
                    <strong className={styles.quoteTitle}>{review.title}</strong>
                    <p className={styles.quoteBody}>{review.body}</p>
                  </blockquote>
                  <p className={styles.reviewer}>{review.displayName}, {review.location}</p>
                  <p className={styles.disclosure}>{review.disclosure}</p>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className={styles.related} aria-labelledby="related-title">
          <div className={styles.relatedHeader}>
            <h2 className={styles.sectionTitle} id="related-title">Consider with</h2>
          </div>
          <ProductGrid products={relatedProducts} labelledBy="related-title" />
        </section>
        </Container>
      </div>
    </>
  );
}

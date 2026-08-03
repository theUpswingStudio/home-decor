import Image from "next/image";
import Link from "next/link";
import {
  SharedMediaTransition,
  sharedMediaName,
  sharedMediaTransitionType,
} from "@/components/motion/shared-media-transition";
import type { Product } from "@/data/catalog";
import { ProjectEditSaveAction } from "@/components/project-edit/project-edit-save-action";
import { formatProductPrice, getCategoryById } from "@/lib/catalog";
import styles from "./catalog.module.css";

interface ProductCardProps {
  product: Product;
  highPriority?: boolean;
  sharedMedia?: boolean;
}

export function ProductCard({
  product,
  highPriority = false,
  sharedMedia = true,
}: ProductCardProps) {
  const image = product.images.find((candidate) => candidate.role === "hero") ?? product.images[0];
  const category = getCategoryById(product.categoryId);
  const price = formatProductPrice(product);
  const overall = product.dimensions.overall;
  const dimensions = `${overall.widthIn} W × ${overall.depthIn} D × ${overall.heightIn} H in`;
  const href = `/products/${product.slug}`;
  const imageLink = (
    <Link
      className={styles.imageLink}
      href={href}
      prefetch={false}
      transitionTypes={
        sharedMedia
          ? [sharedMediaTransitionType("product", product.slug)]
          : undefined
      }
      tabIndex={-1}
      aria-hidden="true"
      data-intent-prefetch="true"
      data-shared-media-name={
        sharedMedia ? sharedMediaName("product", product.slug) : undefined
      }
      data-primary-image-id={sharedMedia ? image.id : undefined}
    >
      <Image
        className={styles.image}
        src={image.url}
        alt=""
        width={image.width}
        height={image.height}
        sizes="(max-width: 39.99rem) calc(100vw - 2rem), (max-width: 63.99rem) calc(50vw - 2.5rem), (max-width: 79.99rem) calc(33vw - 3rem), 19rem"
        fetchPriority={highPriority ? "high" : undefined}
      />
    </Link>
  );

  return (
    <article className={styles.card}>
      {sharedMedia ? (
        <SharedMediaTransition kind="product" slug={product.slug}>
          {imageLink}
        </SharedMediaTransition>
      ) : imageLink}
      <div className={styles.cardBody}>
        <h2 className={styles.title}>
          <Link
            className={styles.titleLink}
            href={href}
            prefetch={false}
            transitionTypes={
              sharedMedia
                ? [sharedMediaTransitionType("product", product.slug)]
                : undefined
            }
            data-intent-prefetch="true"
          >
            {product.name}
          </Link>
        </h2>
        {price ? <p className={styles.price}>{price}</p> : null}
        {category ? (
          <p className={styles.category}>
            <Link className={styles.categoryLink} href={`/shop/${category.slug}`} prefetch={false}>
              {category.name}
            </Link>
          </p>
        ) : null}
        <dl className={styles.planningFacts}>
          <div>
            <dt>Material</dt>
            <dd>{product.materials[0]}</dd>
          </div>
          <div>
            <dt>Size</dt>
            <dd>{dimensions}</dd>
          </div>
        </dl>
        <ProjectEditSaveAction
          className={styles.saveAction}
          target={{ type: "product", id: product.id }}
          label="Save product"
        />
      </div>
    </article>
  );
}

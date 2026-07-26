import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/data/catalog";
import { formatProductPrice, getCategoryById } from "@/lib/catalog";
import styles from "./catalog.module.css";

interface ProductCardProps {
  product: Product;
  highPriority?: boolean;
}

export function ProductCard({ product, highPriority = false }: ProductCardProps) {
  const image = product.images.find((candidate) => candidate.role === "hero") ?? product.images[0];
  const category = getCategoryById(product.categoryId);
  const price = formatProductPrice(product);

  return (
    <article className={styles.card}>
      <Link className={styles.imageLink} href={`/products/${product.slug}`} prefetch={false} tabIndex={-1} aria-hidden="true">
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
      <div className={styles.cardBody}>
        <p className={styles.referenceLabel}>Reference image</p>
        <h2 className={styles.title}>
          <Link className={styles.titleLink} href={`/products/${product.slug}`} prefetch={false}>
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
      </div>
    </article>
  );
}

import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/data/catalog";
import {
  formatProductPrice,
  getCategoryById,
  getRoomById,
} from "@/lib/catalog";
import styles from "./product-preview.module.css";

type ProductImageShape = "landscape" | "portrait" | "square" | "wide";

interface ProductPreviewProps {
  product: Product;
  imageSizes: string;
  shape?: ProductImageShape;
  className?: string;
}

const imageShapeClasses: Record<ProductImageShape, string> = {
  landscape: styles.landscape,
  portrait: styles.portrait,
  square: styles.square,
  wide: styles.wide,
};

export function ProductPreview({
  product,
  imageSizes,
  shape = "landscape",
  className = "",
}: ProductPreviewProps) {
  const image =
    product.images.find((candidate) => candidate.role === "hero") ??
    product.images[0];
  const category = getCategoryById(product.categoryId);
  const room = product.roomIds[0] ? getRoomById(product.roomIds[0]) : undefined;
  const price = formatProductPrice(product);

  if (!image) return null;

  return (
    <article className={`${styles.preview} ${className}`.trim()}>
      <Link className={styles.link} href={`/products/${product.slug}`}>
        <div className={`${styles.imageFrame} ${imageShapeClasses[shape]}`}>
          <Image
            className={styles.image}
            src={image.url}
            alt={image.alt}
            fill
            sizes={imageSizes}
          />
        </div>
        <div className={styles.details}>
          <p className={styles.context}>
            {[category?.name, room?.name].filter(Boolean).join(" / ")}
          </p>
          <div className={styles.identity}>
            <h3 className={styles.name}>{product.name}</h3>
            {price ? <p className={styles.price}>{price}</p> : null}
          </div>
        </div>
      </Link>
    </article>
  );
}

"use client";

import Image from "next/image";
import { useState } from "react";
import type { CatalogImage } from "@/data/catalog";
import styles from "./product-gallery.module.css";

interface ProductGalleryProps {
  images: readonly CatalogImage[];
  productName: string;
}

export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeImage = images[activeIndex] ?? images[0];

  return (
    <div className={styles.gallery}>
      <figure className={styles.stage}>
        <Image
          className={styles.stageImage}
          src={activeImage.url}
          alt={activeImage.alt}
          width={activeImage.width}
          height={activeImage.height}
          sizes="(max-width: 63.99rem) calc(100vw - 2rem), 58vw"
          loading="eager"
          fetchPriority="high"
        />
        <figcaption className={styles.caption}>
          <span>Reference image for {productName}; not an exact catalog product.</span>
          <span>Photograph by {activeImage.creatorName}</span>
        </figcaption>
      </figure>
      {images.length > 1 ? (
        <ul className={styles.thumbnails} aria-label={`${productName} images`}>
          {images.map((image, index) => (
            <li key={image.id}>
              <button
                className={styles.thumbnailButton}
                type="button"
                aria-label={`Show image ${index + 1} of ${images.length}`}
                aria-pressed={index === activeIndex}
                onClick={() => setActiveIndex(index)}
              >
                <Image
                  className={styles.thumbnail}
                  src={image.url}
                  alt=""
                  width={image.width}
                  height={image.height}
                  sizes="7rem"
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

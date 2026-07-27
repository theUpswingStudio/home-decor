"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import {
  SharedMediaTransition,
  sharedMediaName,
} from "@/components/motion/shared-media-transition";
import type { CatalogImage } from "@/data/catalog";
import styles from "./product-gallery.module.css";

interface ProductGalleryProps {
  images: readonly CatalogImage[];
  productName: string;
  productSlug: string;
}

export function ProductGallery({
  images,
  productName,
  productSlug,
}: ProductGalleryProps) {
  const heroIndex = Math.max(
    images.findIndex((image) => image.role === "hero"),
    0,
  );
  const [displayedIndex, setDisplayedIndex] = useState(heroIndex);
  const [selectedIndex, setSelectedIndex] = useState(heroIndex);
  const [pendingIndex, setPendingIndex] = useState<number | null>(null);
  const [isCrossfading, setIsCrossfading] = useState(false);
  const requestRef = useRef(0);
  const transitionTimerRef = useRef<number | null>(null);
  const displayedImage = images[displayedIndex] ?? images[0];
  const pendingImage = pendingIndex === null ? null : images[pendingIndex];

  useEffect(
    () => () => {
      requestRef.current += 1;
      if (transitionTimerRef.current !== null) {
        window.clearTimeout(transitionTimerRef.current);
      }
    },
    [],
  );

  function selectImage(index: number) {
    if (index === selectedIndex && pendingIndex !== null) return;
    requestRef.current += 1;
    setSelectedIndex(index);
    setIsCrossfading(false);
    if (transitionTimerRef.current !== null) {
      window.clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }

    if (index === displayedIndex) {
      setPendingIndex(null);
      return;
    }
    setPendingIndex(index);
  }

  async function revealPendingImage(
    index: number,
    request: number,
    image: HTMLImageElement,
  ) {
    try {
      await image.decode();
    } catch {
      if (request === requestRef.current) {
        setSelectedIndex(displayedIndex);
        setPendingIndex(null);
      }
      return;
    }
    if (request !== requestRef.current || index !== pendingIndex) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplayedIndex(index);
      setPendingIndex(null);
      return;
    }

    await new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => resolve());
      });
    });
    if (request !== requestRef.current || index !== pendingIndex) return;

    setIsCrossfading(true);
    transitionTimerRef.current = window.setTimeout(() => {
      if (request !== requestRef.current) return;
      setDisplayedIndex(index);
      setPendingIndex(null);
      setIsCrossfading(false);
      transitionTimerRef.current = null;
    }, 200);
  }

  function discardPendingImage(request: number) {
    if (request !== requestRef.current) return;
    requestRef.current += 1;
    setSelectedIndex(displayedIndex);
    setPendingIndex(null);
    setIsCrossfading(false);
  }

  const pendingRequest = pendingImage ? requestRef.current : null;

  return (
    <div className={styles.gallery}>
      <figure className={styles.stage} id="product-gallery-stage">
        <SharedMediaTransition kind="product" slug={productSlug}>
          <div
            className={styles.stageMedia}
            data-shared-media-name={sharedMediaName("product", productSlug)}
            data-primary-image-id={displayedImage.id}
          >
            <Image
              className={`${styles.stageImage} ${isCrossfading ? styles.stageImageOutgoing : ""}`.trim()}
              src={displayedImage.url}
              alt={displayedImage.alt}
              width={displayedImage.width}
              height={displayedImage.height}
              sizes="(max-width: 63.99rem) calc(100vw - 2rem), 58vw"
              loading="eager"
              fetchPriority="high"
            />
            {pendingImage && pendingIndex !== null ? (
              <Image
                key={pendingImage.id}
                className={`${styles.stageImage} ${styles.stageImagePending} ${isCrossfading ? styles.stageImagePendingVisible : ""}`.trim()}
                src={pendingImage.url}
                alt=""
                aria-hidden="true"
                width={pendingImage.width}
                height={pendingImage.height}
                sizes="(max-width: 63.99rem) calc(100vw - 2rem), 58vw"
                loading="eager"
                onLoad={(event) => {
                  if (pendingRequest !== null) {
                    void revealPendingImage(
                      pendingIndex,
                      pendingRequest,
                      event.currentTarget,
                    );
                  }
                }}
                onError={() => {
                  if (pendingRequest !== null) discardPendingImage(pendingRequest);
                }}
              />
            ) : null}
          </div>
        </SharedMediaTransition>
        <figcaption className={styles.caption}>
          <span>Reference image for {productName}; not an exact catalog product.</span>
          <span>Photograph by {displayedImage.creatorName}</span>
        </figcaption>
        <p
          className="sr-only"
          data-gallery-status="true"
          aria-live="polite"
          aria-atomic="true"
        >
          Image {displayedIndex + 1} of {images.length}: {displayedImage.alt}.
          Photograph by {displayedImage.creatorName}.
        </p>
      </figure>
      {images.length > 1 ? (
        <ul className={styles.thumbnails} aria-label={`${productName} images`}>
          {images.map((image, index) => (
            <li key={image.id}>
              <button
                className={styles.thumbnailButton}
                type="button"
                aria-label={`Show image ${index + 1} of ${images.length}`}
                aria-pressed={index === selectedIndex}
                aria-controls="product-gallery-stage"
                onClick={() => selectImage(index)}
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

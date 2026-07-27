"use client";

import { Children, type ReactNode, useEffect, useRef, useState } from "react";
import styles from "./look-carousel.module.css";

interface LookCarouselProps {
  labels: readonly string[];
  children: ReactNode;
}

export function LookCarousel({ labels, children }: LookCarouselProps) {
  const slides = Children.toArray(children);
  const [activeIndex, setActiveIndex] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const settleTimerRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (settleTimerRef.current !== null) {
        window.clearTimeout(settleTimerRef.current);
      }
    },
    [],
  );

  function settleOnClosestSlide() {
    const track = trackRef.current;
    if (!track) return;

    const slideElements = Array.from(track.children) as HTMLElement[];
    let closestIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;

    slideElements.forEach((slide, index) => {
      const distance = Math.abs(slide.offsetLeft - track.scrollLeft);
      if (distance < closestDistance) {
        closestIndex = index;
        closestDistance = distance;
      }
    });

    setActiveIndex(closestIndex);
  }

  function handleScroll() {
    if (settleTimerRef.current !== null) {
      window.clearTimeout(settleTimerRef.current);
    }
    settleTimerRef.current = window.setTimeout(settleOnClosestSlide, 120);
  }

  function showSlide(index: number) {
    const track = trackRef.current;
    const slide = track?.children.item(index) as HTMLElement | null;
    if (!track || !slide) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    track.scrollTo({
      left: slide.offsetLeft,
      behavior: reducedMotion ? "auto" : "smooth",
    });

    if (reducedMotion) setActiveIndex(index);
  }

  const activeLabel = labels[activeIndex] ?? labels[0] ?? "Look";

  return (
    <div
      className={styles.carousel}
      role="region"
      aria-roledescription="carousel"
      aria-label="Collected looks"
    >
      <div className={styles.toolbar}>
        <div className={styles.lookControls} role="group" aria-label="Choose a look">
          {labels.map((label, index) => (
            <button
              className={styles.lookControl}
              type="button"
              key={label}
              aria-controls={`look-slide-${index + 1}`}
              aria-current={index === activeIndex ? "true" : undefined}
              onClick={() => showSlide(index)}
            >
              Look {index + 1}
            </button>
          ))}
        </div>
        <div className={styles.stepControls} role="group" aria-label="Move through looks">
          <button
            className={styles.stepControl}
            type="button"
            disabled={activeIndex === 0}
            onClick={() => showSlide(activeIndex - 1)}
          >
            Previous
          </button>
          <button
            className={styles.stepControl}
            type="button"
            disabled={activeIndex === slides.length - 1}
            onClick={() => showSlide(activeIndex + 1)}
          >
            Next
          </button>
        </div>
      </div>

      <div
        id="look-carousel-track"
        className={styles.track}
        ref={trackRef}
        onScroll={handleScroll}
      >
        {slides.map((slide, index) => (
          <div
            className={styles.slide}
            id={`look-slide-${index + 1}`}
            key={labels[index] ?? index}
            role="group"
            aria-roledescription="slide"
            aria-label={`Look ${index + 1} of ${slides.length}: ${labels[index] ?? "Untitled"}`}
            aria-hidden={index !== activeIndex}
            inert={index !== activeIndex}
          >
            {slide}
          </div>
        ))}
      </div>

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        Showing Look {activeIndex + 1} of {slides.length}: {activeLabel}
      </p>
    </div>
  );
}

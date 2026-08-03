"use client";

import Image from "next/image";
import Link from "next/link";
import { useLayoutEffect, useRef, useState } from "react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { formatPrice } from "@/lib/catalog";
import {
  MAX_PROJECT_QUANTITY,
  MIN_PROJECT_QUANTITY,
  PROJECT_EDIT_RETENTION_DAYS,
  projectEntryKey,
  useProjectEdit,
} from "@/lib/project-edit";
import { clampProjectQuantity } from "@/lib/project-edit/reducer";
import styles from "./project-edit-page.module.css";

const BREADCRUMBS = [
  { href: "/", label: "Home" },
  { label: "Project Edit" },
] as const;

function dimensionsLabel(dimensions: {
  readonly widthIn: number;
  readonly heightIn: number;
  readonly depthIn: number;
}) {
  return `${dimensions.widthIn} W × ${dimensions.depthIn} D × ${dimensions.heightIn} H in`;
}

export function ProjectEditPage() {
  const projectEdit = useProjectEdit();
  const [announcement, setAnnouncement] = useState("");
  const headingRef = useRef<HTMLHeadingElement>(null);
  const pendingFocusRef = useRef<string[] | null>(null);
  const entrySignature = projectEdit.entries.map(projectEntryKey).join("|");

  useLayoutEffect(() => {
    const candidateIds = pendingFocusRef.current;
    if (candidateIds === null) return;
    pendingFocusRef.current = null;
    const frame = window.requestAnimationFrame(() => {
      const candidate = candidateIds
        .map((id) => document.getElementById(`remove-${id}`))
        .find((element): element is HTMLElement => element instanceof HTMLElement);
      (candidate ?? headingRef.current)?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [entrySignature]);

  if (projectEdit.status === "loading") {
    return (
      <Container className={styles.page}>
        <Breadcrumbs items={BREADCRUMBS} />
        <h1>Project Edit</h1>
        <p aria-live="polite">Loading saved entries…</p>
      </Container>
    );
  }

  const updatedLabel = projectEdit.updatedAt
    ? new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(
        projectEdit.updatedAt,
      )
    : null;

  function removeEntry(key: string, name: string, neighboringKeys: readonly string[]) {
    pendingFocusRef.current = [...neighboringKeys];
    if (projectEdit.remove(key)) {
      setAnnouncement(`${name} removed from Project Edit.`);
    } else {
      pendingFocusRef.current = null;
      setAnnouncement(`${name} was already removed from Project Edit.`);
    }
  }

  const allKeys = [
    ...projectEdit.products.map((item) => item.key),
    ...projectEdit.rooms.map((item) => item.key),
    ...projectEdit.materials.map((item) => item.key),
  ];

  return (
    <Container className={styles.page}>
      <Breadcrumbs items={BREADCRUMBS} />
      <header className={styles.header}>
        <div>
          <h1 ref={headingRef} tabIndex={-1}>Your Project Edit</h1>
          <p>
            Review products, room directions, and material notes together before
            you preview a consultation.
          </p>
        </div>
        <div className={styles.headerMeta}>
          <p>{projectEdit.entryCount} {projectEdit.entryCount === 1 ? "entry" : "entries"}</p>
          {updatedLabel ? <p>Updated {updatedLabel}</p> : null}
          {projectEdit.entryCount > 0 ? (
            <button
              className={styles.clear}
              type="button"
              onClick={() => {
                pendingFocusRef.current = [];
                if (projectEdit.clear()) setAnnouncement("Project Edit cleared.");
              }}
            >
              Clear Project Edit
            </button>
          ) : null}
        </div>
      </header>

      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>

      {projectEdit.entryCount === 0 ? (
        <section className={styles.empty} aria-labelledby="empty-project-title">
          <h2 id="empty-project-title">Your direction starts with one useful choice.</h2>
          <p>
            Save products, room edits, or material notes. They will stay in this
            browser for up to {PROJECT_EDIT_RETENTION_DAYS} days.
          </p>
          <ButtonLink href="/shop">Explore The House Edit</ButtonLink>
        </section>
      ) : (
        <div className={styles.layout}>
          <div className={styles.entries}>
            {projectEdit.products.length > 0 ? (
              <section aria-labelledby="saved-products-title">
                <div className={styles.sectionHeading}>
                  <h2 id="saved-products-title">Products</h2>
                  <p>Confirm finishes and quantities before consultation.</p>
                </div>
                <ul className={styles.productList}>
                  {projectEdit.products.map((item) => {
                    const index = allKeys.indexOf(item.key);
                    const options = item.variant?.options.map((option) => option.value).join(" / ");
                    return (
                      <li key={item.key}>
                        <article className={styles.productEntry}>
                          <Image
                            className={styles.productImage}
                            src={item.image.url}
                            alt=""
                            width={item.image.width}
                            height={item.image.height}
                            sizes="(max-width: 39.99rem) 7rem, 10rem"
                          />
                          <div className={styles.productDetails}>
                            <div className={styles.productTitleRow}>
                              <div>
                                <h3>
                                  <Link href={`/products/${item.product.slug}`}>
                                    {item.product.name}
                                  </Link>
                                </h3>
                                <p>{options || "Finish not selected"}</p>
                              </div>
                              <p>{item.variant ? formatPrice(item.lineTotalMinor) : `From ${formatPrice(item.lineTotalMinor)}`}</p>
                            </div>
                            <dl className={styles.productFacts}>
                              <div><dt>Material</dt><dd>{item.product.materials[0]}</dd></div>
                              <div><dt>Overall</dt><dd>{dimensionsLabel(item.product.dimensions.overall)}</dd></div>
                              {item.variant ? <div><dt>Lead time</dt><dd>{item.variant.leadTimeLabel}</dd></div> : null}
                            </dl>
                            <div className={styles.entryActions}>
                              {item.variant ? (
                                <label className={styles.quantity}>
                                  <span>Quantity</span>
                                  <input
                                    type="number"
                                    min={MIN_PROJECT_QUANTITY}
                                    max={MAX_PROJECT_QUANTITY}
                                    value={item.entry.quantity}
                                    onChange={(event) => {
                                      const value = event.currentTarget.valueAsNumber;
                                      if (!Number.isFinite(value)) return;
                                      const quantity = clampProjectQuantity(value);
                                      projectEdit.setQuantity(item.key, quantity);
                                      setAnnouncement(`${item.product.name} quantity updated to ${quantity}.`);
                                    }}
                                  />
                                </label>
                              ) : (
                                <Link href={`/products/${item.product.slug}`}>Choose a finish</Link>
                              )}
                              <button
                                id={`remove-${item.key}`}
                                type="button"
                                onClick={() => removeEntry(
                                  item.key,
                                  item.product.name,
                                  [allKeys[index + 1], allKeys[index - 1]].filter((key): key is string => Boolean(key)),
                                )}
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </article>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}

            {projectEdit.rooms.length > 0 ? (
              <section aria-labelledby="saved-rooms-title">
                <div className={styles.sectionHeading}>
                  <h2 id="saved-rooms-title">Room directions</h2>
                  <p>Use these as planning context, not finished rooms to reproduce.</p>
                </div>
                <ul className={styles.contextList}>
                  {projectEdit.rooms.map((item) => {
                    const index = allKeys.indexOf(item.key);
                    return (
                      <li key={item.key}>
                        <Image src={item.image.url} alt="" width={item.image.width} height={item.image.height} sizes="9rem" />
                        <div>
                          <h3><Link href={`/rooms/${item.room.slug}`}>{item.room.name}</Link></h3>
                          <p>{item.room.shortDescription}</p>
                        </div>
                        <button
                          id={`remove-${item.key}`}
                          type="button"
                          onClick={() => removeEntry(item.key, item.room.name, [allKeys[index + 1], allKeys[index - 1]].filter((key): key is string => Boolean(key)))}
                        >Remove</button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}

            {projectEdit.materials.length > 0 ? (
              <section aria-labelledby="saved-materials-title">
                <div className={styles.sectionHeading}>
                  <h2 id="saved-materials-title">Material notes</h2>
                  <p>Keep the material logic beside the products it informs.</p>
                </div>
                <ul className={styles.contextList}>
                  {projectEdit.materials.map((item) => {
                    const index = allKeys.indexOf(item.key);
                    return (
                      <li key={item.key}>
                        <Image src={item.image.url} alt="" width={item.image.width} height={item.image.height} sizes="9rem" />
                        <div>
                          <h3><Link href={`/collections/${item.collection.slug}`}>{item.collection.name}</Link></h3>
                          <p>{item.collection.shortDescription}</p>
                        </div>
                        <button
                          id={`remove-${item.key}`}
                          type="button"
                          onClick={() => removeEntry(item.key, item.collection.name, [allKeys[index + 1], allKeys[index - 1]].filter((key): key is string => Boolean(key)))}
                        >Remove</button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}
          </div>

          <aside className={styles.summary} aria-labelledby="project-summary-title">
            <h2 id="project-summary-title">Direction started</h2>
            <p>
              {projectEdit.products.length} product {projectEdit.products.length === 1 ? "entry" : "entries"}, {projectEdit.rooms.length} room {projectEdit.rooms.length === 1 ? "direction" : "directions"}, and {projectEdit.materials.length} material {projectEdit.materials.length === 1 ? "note" : "notes"} saved.
            </p>
            {projectEdit.products.length > 0 ? (
              <dl className={styles.guidanceTotal}>
                <dt>Product guidance</dt>
                <dd>{formatPrice(projectEdit.guidanceTotalMinor)}</dd>
              </dl>
            ) : null}
            <p className={styles.qualifier}>
              Product guidance only. A consultation would review finish, fit,
              availability, delivery access, and installation.
            </p>
            <ButtonLink href="/design-services/inquire?from=project-edit">
              Start consultation preview
            </ButtonLink>
            <ButtonLink href="/shop" variant="secondary">Keep browsing</ButtonLink>
            <p className={styles.disclosure}>
              Portfolio demonstration. Entries stay in this browser. Nothing is
              reserved, purchased, or sent.
            </p>
          </aside>
        </div>
      )}
    </Container>
  );
}

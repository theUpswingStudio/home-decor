import type { Metadata } from "next";
import Link from "next/link";
import { BreadcrumbTrail } from "@/components/catalog/breadcrumb-trail";
import {
  catalogFilterGroups,
  type CatalogSearchParams,
} from "@/components/catalog/catalog-selection";
import { ShopEditorialIndex, ShopEntryGrid } from "@/components/catalog/shop-editorial-index";
import { ShopFilters } from "@/components/catalog/shop-filters";
import { getShopSelection, shopFilterRecords } from "@/components/catalog/shop-index";
import { ProjectEditEndCap } from "@/components/project-edit/project-edit-end-cap";
import { Container } from "@/components/ui/container";
import { catalog } from "@/lib/catalog";
import styles from "./shop.module.css";

const description =
  "Explore Vestrel House products, room edits, and material notes in one curated planning index.";

export const metadata: Metadata = {
  title: "The House Edit",
  description,
  alternates: { canonical: "/shop" },
  openGraph: {
    title: "The House Edit",
    description,
    type: "website",
    url: "/shop",
    images: ["/opengraph-image"],
  },
  twitter: {
    card: "summary_large_image",
    title: "The House Edit",
    description,
    images: ["/opengraph-image"],
  },
};

interface ShopPageProps {
  searchParams: Promise<CatalogSearchParams>;
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const selection = getShopSelection(await searchParams);

  return (
    <div className={styles.page}>
      <Container>
        <BreadcrumbTrail items={[{ href: "/", label: "Home" }, { label: "Shop" }]} />
        <header className={styles.header}>
          <h1 className={styles.title}>The House Edit</h1>
          <p className={styles.description}>
            Begin with a room, a material, or one useful object. Save the parts
            that belong together, then carry the edit into a consultation preview.
          </p>
        </header>
        <nav className={styles.startPaths} aria-label="Start exploring">
          <Link href="/shop?entry=room-edit">Begin with a room</Link>
          <Link href="/shop?entry=material-note">Begin with material</Link>
          <Link href="/shop?entry=product">Begin with an object</Link>
        </nav>
        <section className={styles.disclosure} aria-labelledby="catalog-images-title">
          <h2 id="catalog-images-title">About the catalog images</h2>
          <p>
            Photography shows material and room references. It does not show exact
            Vestrel House products. Credits and context appear on each detail page.
          </p>
        </section>
        <ShopFilters
          groups={catalogFilterGroups}
          initialValues={selection.active}
          initialSort={selection.sort}
          resultCount={selection.curated ? catalog.rooms.length * 6 : selection.resultCount}
          entryType={selection.entryType}
          typeCounts={selection.typeCounts}
          records={shopFilterRecords}
        >
          {selection.curated ? (
            <ShopEditorialIndex />
          ) : selection.entries.length > 0 ? (
            <ShopEntryGrid entries={selection.entries} />
          ) : (
            <div className={styles.empty}>
              <h2 className={styles.emptyTitle}>No entries match this edit.</h2>
              <p className={styles.emptyCopy}>Remove the last filter, broaden the direction, or return to the curated index.</p>
              <Link className={styles.emptyLink} href="/shop">Return to The House Edit</Link>
            </div>
          )}
        </ShopFilters>
        <ProjectEditEndCap />
      </Container>
    </div>
  );
}

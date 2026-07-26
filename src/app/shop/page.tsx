import type { Metadata } from "next";
import Link from "next/link";
import { BreadcrumbTrail } from "@/components/catalog/breadcrumb-trail";
import {
  catalogFilterGroups,
  getCatalogSelection,
  type CatalogSearchParams,
} from "@/components/catalog/catalog-selection";
import { ProductGrid } from "@/components/catalog/product-grid";
import { ShopFilters } from "@/components/catalog/shop-filters";
import { Container } from "@/components/ui/container";
import styles from "./shop.module.css";

const description =
  "Browse the complete Vestrel House edit of furniture, lighting, and textiles by room, material, style, and price.";

export const metadata: Metadata = {
  title: "Shop the Complete Catalog",
  description,
  alternates: { canonical: "/shop" },
  openGraph: {
    title: "Shop the Complete Catalog",
    description,
    type: "website",
    url: "/shop",
    images: ["/opengraph-image"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Shop the Complete Catalog",
    description,
    images: ["/opengraph-image"],
  },
};

interface ShopPageProps {
  searchParams: Promise<CatalogSearchParams>;
}

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const selection = getCatalogSelection(await searchParams);

  return (
    <div className={styles.page}>
      <Container>
        <BreadcrumbTrail items={[{ href: "/", label: "Home" }, { label: "Shop" }]} />
        <header className={styles.header}>
          <h1 className={styles.title}>The complete catalog</h1>
          <p className={styles.description}>
            An edited whole-home collection built around useful proportions, tactile material, and pieces that hold a room without overfilling it.
          </p>
        </header>
        <ShopFilters
          groups={catalogFilterGroups}
          initialValues={selection.active}
          initialSort={selection.sort}
          resultCount={selection.products.length}
        >
          {selection.products.length > 0 ? (
            <ProductGrid products={selection.products} priorityCount={4} />
          ) : (
            <div className={styles.empty}>
              <h2 className={styles.emptyTitle}>No pieces match this edit.</h2>
              <p className={styles.emptyCopy}>Remove one or two filters, broaden the price range, or begin again with all 24 pieces.</p>
              <Link className={styles.emptyLink} href="/shop">View the complete catalog</Link>
            </div>
          )}
        </ShopFilters>
      </Container>
    </div>
  );
}

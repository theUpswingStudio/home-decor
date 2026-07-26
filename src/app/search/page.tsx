import type { Metadata } from "next";
import { BreadcrumbTrail } from "@/components/catalog/breadcrumb-trail";
import { ProductGrid } from "@/components/catalog/product-grid";
import { Container } from "@/components/ui/container";
import { catalog, searchProducts, sortProducts } from "@/lib/catalog";
import { SearchForm } from "./search-form";
import styles from "./search.module.css";

const title = "Search the Catalog";
const description =
  "Search Vestrel House furniture, lighting, and textiles by piece, room, material, or style.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/search" },
  robots: {
    index: false,
    follow: true,
    googleBot: { index: false, follow: true },
  },
  openGraph: {
    title,
    description,
    type: "website",
    url: "/search",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Vestrel House portfolio concept",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/opengraph-image"],
  },
};

interface SearchPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const rawQuery = (await searchParams).q;
  const query = (Array.isArray(rawQuery) ? rawQuery[0] : rawQuery)?.trim() ?? "";
  const products = query ? sortProducts(searchProducts(query)) : sortProducts(catalog.products);
  const status = query
    ? `${products.length} ${products.length === 1 ? "result" : "results"} for “${query}”`
    : `Browse all ${products.length} products`;

  return (
    <div className={styles.page}>
      <Container>
        <BreadcrumbTrail items={[{ href: "/", label: "Home" }, { label: "Search" }]} />
        <header className={styles.header}>
          <h1 className={styles.title}>Search the catalog</h1>
          <SearchForm initialQuery={query} />
        </header>
        <p className={styles.status} aria-live="polite">{status}</p>
        <section className={styles.results} aria-label={status}>
          {products.length > 0 ? (
            <ProductGrid products={products} priorityCount={4} />
          ) : (
            <div className={styles.empty}>
              <h2>No matching pieces</h2>
              <p>Try a room such as living room, a material such as walnut, or a broader style term such as tailored.</p>
            </div>
          )}
        </section>
      </Container>
    </div>
  );
}

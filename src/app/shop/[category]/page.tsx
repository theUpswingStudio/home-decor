import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BreadcrumbTrail } from "@/components/catalog/breadcrumb-trail";
import { ProductGrid } from "@/components/catalog/product-grid";
import { Container } from "@/components/ui/container";
import { catalog, getCategoryBySlug, getProductsByCategory } from "@/lib/catalog";
import styles from "../shop.module.css";

interface CategoryPageProps {
  params: Promise<{ category: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return catalog.categories.map((category) => ({ category: category.slug }));
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { category: slug } = await params;
  const category = getCategoryBySlug(slug);
  if (!category) return {};
  return {
    title: category.seo.title,
    description: category.seo.description,
    alternates: { canonical: `/shop/${category.slug}` },
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { category: slug } = await params;
  const category = getCategoryBySlug(slug);
  if (!category) notFound();
  const products = getProductsByCategory(category);

  return (
    <div className={styles.page}>
      <Container>
        <BreadcrumbTrail items={[
          { href: "/", label: "Home" },
          { href: "/shop", label: "Shop" },
          { label: category.name },
        ]} />
        <header className={styles.categoryHeader}>
          <h1 className={styles.categoryTitle}>{category.name}</h1>
          <p className={styles.description}>{category.description}</p>
          <p className={styles.count}>{products.length} {products.length === 1 ? "piece" : "pieces"}</p>
        </header>
        <ProductGrid products={products} priorityCount={4} />
      </Container>
    </div>
  );
}

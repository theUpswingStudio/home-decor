import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EditorialDetail, EditorialProductSection } from "@/components/catalog/editorial";
import { catalog, getCollectionBySlug, getProductsByCollection } from "@/lib/catalog";

interface CollectionPageProps { params: Promise<{ slug: string }> }

export const dynamicParams = false;

export function generateStaticParams() {
  return catalog.collections.map((collection) => ({ slug: collection.slug }));
}

export async function generateMetadata({ params }: CollectionPageProps): Promise<Metadata> {
  const collection = getCollectionBySlug((await params).slug);
  if (!collection) return {};
  return { title: collection.seo.title, description: collection.seo.description, alternates: { canonical: `/collections/${collection.slug}` } };
}

export default async function CollectionPage({ params }: CollectionPageProps) {
  const collection = getCollectionBySlug((await params).slug);
  if (!collection) notFound();
  const products = getProductsByCollection(collection);
  const headingId = `collection-${collection.slug}-products`;

  return (
    <EditorialDetail
      title={collection.name}
      description={collection.description}
      parentHref="/collections"
      parentLabel="Collections"
      media={collection.media}
      kicker={collection.seasonLabel}
      notes={collection.palette.map((color) => `${color} anchors the collection palette.`)}
    >
      <EditorialProductSection title="The collection" products={products} id={headingId} />
    </EditorialDetail>
  );
}

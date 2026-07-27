import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EditorialDetail, EditorialProductSection } from "@/components/catalog/editorial";
import { catalog, getLookBySlug, getProductsByLook } from "@/lib/catalog";

interface LookPageProps { params: Promise<{ slug: string }> }

export const dynamicParams = false;

export function generateStaticParams() {
  return catalog.looks.map((look) => ({ slug: look.slug }));
}

export async function generateMetadata({ params }: LookPageProps): Promise<Metadata> {
  const look = getLookBySlug((await params).slug);
  if (!look) return {};
  return { title: look.seo.title, description: look.seo.description, alternates: { canonical: `/looks/${look.slug}` } };
}

export default async function LookPage({ params }: LookPageProps) {
  const look = getLookBySlug((await params).slug);
  if (!look) notFound();
  const products = getProductsByLook(look);
  const headingId = `look-${look.slug}-products`;

  return (
    <EditorialDetail
      title={look.name}
      description={look.description}
      parentHref="/looks"
      parentLabel="The lookbook"
      kind="look"
      slug={look.slug}
      media={look.media}
      kicker={look.eyebrow}
      notes={look.stylingNotes}
    >
      <EditorialProductSection title="Pieces in this look" products={products} id={headingId} />
    </EditorialDetail>
  );
}

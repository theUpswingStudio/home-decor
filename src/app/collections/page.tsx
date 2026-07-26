import type { Metadata } from "next";
import { EditorialLanding } from "@/components/catalog/editorial";
import { catalog } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Furniture Collections",
  description: "Explore three material-led Vestrel House furniture collections: Soft Geometry, Material Study, and Afterlight.",
  alternates: { canonical: "/collections" },
};

export default function CollectionsPage() {
  return (
    <EditorialLanding
      title="Collections"
      introduction="Three studies in shape, surface, and atmosphere. Each collection offers a distinct material logic while remaining open enough to mix across the house."
      entries={catalog.collections.map((collection) => ({
        href: `/collections/${collection.slug}`,
        title: collection.name,
        description: collection.shortDescription,
        image: collection.media[0],
        kicker: collection.seasonLabel,
      }))}
    />
  );
}

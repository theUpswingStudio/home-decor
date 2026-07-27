import type { Metadata } from "next";
import { EditorialLanding } from "@/components/catalog/editorial";
import { catalog } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "The Lookbook",
  description: "Explore four collected-modern styling directions with practical notes and shoppable furniture edits.",
  alternates: { canonical: "/looks" },
};

export default function LooksPage() {
  return (
    <EditorialLanding
      title="The lookbook"
      introduction="Not finished rooms to reproduce, but useful positions to take: four ways to control proportion, contrast, material, and color across a home."
      entries={catalog.looks.map((look) => ({
        href: `/looks/${look.slug}`,
        kind: "look" as const,
        slug: look.slug,
        title: look.name,
        description: look.description,
        image: look.media.find((image) => image.role === "hero") ?? look.media[0],
        kicker: look.eyebrow,
      }))}
    />
  );
}

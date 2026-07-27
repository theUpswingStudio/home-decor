import type { Metadata } from "next";
import { EditorialLanding } from "@/components/catalog/editorial";
import { catalog } from "@/lib/catalog";

export const metadata: Metadata = {
  title: "Shop by Room",
  description: "Explore collected-modern furniture edits for living rooms, dining rooms, bedrooms, and workspaces.",
  alternates: { canonical: "/rooms" },
};

export default function RoomsPage() {
  return (
    <EditorialLanding
      title="Rooms"
      introduction="Begin with how the room needs to work. Each edit balances anchor pieces, circulation, light, storage, and the quieter layers that make a space feel lived in."
      entries={catalog.rooms.map((room) => ({
        href: `/rooms/${room.slug}`,
        kind: "room" as const,
        slug: room.slug,
        title: room.name,
        description: room.shortDescription,
        image: room.media.find((image) => image.role === "hero") ?? room.media[0],
      }))}
    />
  );
}

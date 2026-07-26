import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EditorialDetail, EditorialProductSection } from "@/components/catalog/editorial";
import { catalog, getProductsByRoom, getRoomBySlug } from "@/lib/catalog";

interface RoomPageProps { params: Promise<{ slug: string }> }

export const dynamicParams = false;

export function generateStaticParams() {
  return catalog.rooms.map((room) => ({ slug: room.slug }));
}

export async function generateMetadata({ params }: RoomPageProps): Promise<Metadata> {
  const room = getRoomBySlug((await params).slug);
  if (!room) return {};
  return { title: room.seo.title, description: room.seo.description, alternates: { canonical: `/rooms/${room.slug}` } };
}

export default async function RoomPage({ params }: RoomPageProps) {
  const room = getRoomBySlug((await params).slug);
  if (!room) notFound();
  const products = getProductsByRoom(room);
  const headingId = `room-${room.slug}-products`;

  return (
    <EditorialDetail title={room.name} description={room.description} parentHref="/rooms" parentLabel="Rooms" media={room.media}>
      <EditorialProductSection title="Pieces for the room" products={products} id={headingId} />
    </EditorialDetail>
  );
}

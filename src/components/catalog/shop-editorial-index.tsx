import Image from "next/image";
import Link from "next/link";
import { ProjectEditSaveAction } from "@/components/project-edit/project-edit-save-action";
import { catalog, getProductsByRoom } from "@/lib/catalog";
import { ProductCard } from "./product-card";
import { ProductGrid } from "./product-grid";
import type { ShopIndexEntry } from "./shop-index";
import styles from "./shop-index.module.css";

function heroImage(media: typeof catalog.rooms[number]["media"]) {
  return media.find((image) => image.role === "hero") ?? media[0];
}

function detailImage(media: typeof catalog.collections[number]["media"]) {
  return media.find((image) => image.role === "detail") ?? media[0];
}

function RoomEditCard({
  room,
  highPriority = false,
}: {
  readonly room: typeof catalog.rooms[number];
  readonly highPriority?: boolean;
}) {
  const image = heroImage(room.media);
  const productCount = getProductsByRoom(room).length;
  if (!image) return null;
  return (
    <article className={styles.roomCard}>
      <Link className={styles.mediaLink} href={`/rooms/${room.slug}`}>
        <Image
          className={styles.roomImage}
          src={image.url}
          alt={image.alt}
          width={image.width}
          height={image.height}
          sizes="(max-width: 63.99rem) calc(100vw - 2rem), 60vw"
          loading={highPriority ? "eager" : undefined}
          fetchPriority={highPriority ? "high" : undefined}
        />
      </Link>
      <div className={styles.roomCopy}>
        <p className={styles.typeLabel}>Room edit</p>
        <h2><Link href={`/rooms/${room.slug}`}>{room.name}</Link></h2>
        <p>{room.description}</p>
        <dl className={styles.entryFacts}>
          <div><dt>Included products</dt><dd>{productCount}</dd></div>
          <div><dt>Planning aim</dt><dd>{room.shortDescription}</dd></div>
        </dl>
        <ProjectEditSaveAction
          target={{ type: "room", id: room.id }}
          label="Save room direction"
        />
      </div>
    </article>
  );
}

function MaterialNoteCard({
  collection,
  highPriority = false,
}: {
  readonly collection: typeof catalog.collections[number];
  readonly highPriority?: boolean;
}) {
  const image = detailImage(collection.media);
  if (!image) return null;
  return (
    <article className={styles.materialCard}>
      <Link className={styles.mediaLink} href={`/collections/${collection.slug}`}>
        <Image
          className={styles.materialImage}
          src={image.url}
          alt={image.alt}
          width={image.width}
          height={image.height}
          sizes="(max-width: 63.99rem) calc(100vw - 2rem), 28vw"
          loading={highPriority ? "eager" : undefined}
          fetchPriority={highPriority ? "high" : undefined}
        />
      </Link>
      <div className={styles.materialCopy}>
        <p className={styles.typeLabel}>Material note</p>
        <h2><Link href={`/collections/${collection.slug}`}>{collection.name}</Link></h2>
        <p>{collection.description}</p>
        <p className={styles.palette}>{collection.palette.join(" · ")}</p>
        <ProjectEditSaveAction
          target={{ type: "material", id: collection.id }}
          label="Save material note"
        />
      </div>
    </article>
  );
}

export function ShopEditorialIndex() {
  const usedProducts = new Set<string>();
  const chapters = catalog.rooms.map((room, index) => {
    const roomProducts = getProductsByRoom(room);
    const fresh = roomProducts.filter((product) => !usedProducts.has(product.id));
    const products = [...fresh, ...roomProducts.filter((product) => usedProducts.has(product.id))].slice(0, 4);
    products.forEach((product) => usedProducts.add(product.id));
    return {
      room,
      products,
      collection: catalog.collections[index % catalog.collections.length],
    };
  });

  return (
    <div className={styles.editorialIndex}>
      {chapters.map((chapter, index) => (
        <section className={styles.chapter} key={chapter.room.id}>
          <div className={styles.chapterLead}>
            <RoomEditCard room={chapter.room} highPriority={index === 0} />
            <MaterialNoteCard collection={chapter.collection} highPriority={index === 0} />
          </div>
          <div className={styles.chapterProducts}>
            <div className={styles.productHeading}>
              <h2>Pieces for {chapter.room.name.toLocaleLowerCase("en-US")}</h2>
              <Link href={`/shop?entry=product&room=${chapter.room.slug}`}>View all products</Link>
            </div>
            <ProductGrid products={chapter.products} />
          </div>
        </section>
      ))}
      <div className={styles.completeCatalog}>
        <p>Prefer the complete object list?</p>
        <Link href="/shop?entry=product">View all {catalog.products.length} products</Link>
      </div>
    </div>
  );
}

export function ShopEntryGrid({ entries }: { readonly entries: readonly ShopIndexEntry[] }) {
  return (
    <ol className={styles.resultGrid}>
      {entries.map((entry, index) => {
        if (entry.type === "product") {
          return (
            <li className={styles.productResult} key={entry.product.id}>
              <ProductCard product={entry.product} highPriority={index === 0} />
            </li>
          );
        }
        if (entry.type === "room-edit") {
          return <li key={entry.room.id}><RoomEditCard room={entry.room} highPriority={index === 0} /></li>;
        }
        return (
          <li key={entry.collection.id}>
            <MaterialNoteCard collection={entry.collection} highPriority={index === 0} />
          </li>
        );
      })}
    </ol>
  );
}

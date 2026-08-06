import type { Metadata } from "next";
import { Suspense } from "react";
import {
  AiConsultationPrototype,
  type ConsultationPrototypeFixture,
} from "@/components/ai-consultation-prototype/ai-consultation-prototype";
import { catalog } from "@/data/catalog";

export const metadata: Metadata = {
  title: "AI consultation prototype",
  description: "Throwaway workspace variants for the Vestrel House AI consultation.",
  robots: { index: false, follow: false },
};

const PRODUCT_IDS = [
  "prod-vale-sofa",
  "prod-brera-chair",
  "prod-plinth-table",
] as const;

function formatPrice(valueMinor: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(valueMinor / 100);
}

function buildFixture(): ConsultationPrototypeFixture {
  const room = catalog.rooms.find((candidate) => candidate.id === "room-living");
  if (!room) throw new Error("Living room fixture is missing.");

  const products = PRODUCT_IDS.map((productId) => {
    const product = catalog.products.find((candidate) => candidate.id === productId);
    if (!product) throw new Error(`Prototype product ${productId} is missing.`);

    const variant = catalog.variants.find(
      (candidate) => candidate.id === product.variantIds[0],
    );
    if (!variant) throw new Error(`Prototype variant for ${productId} is missing.`);

    return {
      id: product.id,
      name: product.name,
      description: product.shortDescription,
      price: formatPrice(variant.priceMinor),
      finish: variant.options.map((option) => option.value).join(" / "),
      dimensions: `${product.dimensions.overall.widthIn} × ${product.dimensions.overall.depthIn} in`,
      image: product.images[0],
    };
  });

  return {
    room: {
      name: "Living room",
      image: room.media[0],
    },
    products,
  };
}

export default function AiConsultationPrototypePage() {
  return (
    <Suspense fallback={<div aria-busy="true" aria-label="Loading prototype" />}>
      <AiConsultationPrototype fixture={buildFixture()} />
    </Suspense>
  );
}

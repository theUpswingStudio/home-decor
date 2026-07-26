import type {
  CatalogImage,
  Product,
  ProductVariant,
} from "@/data/catalog";
import { getProductById, getVariantById } from "@/lib/catalog";
import type { CartItem } from "./types";

export interface ResolvedCartLine {
  readonly variantId: string;
  readonly quantity: number;
  readonly variant: ProductVariant;
  readonly product: Product;
  readonly image: CatalogImage;
  readonly lineTotalMinor: number;
}

export function resolveCartLines(
  items: readonly CartItem[],
): readonly ResolvedCartLine[] {
  return items.flatMap((item) => {
    const variant = getVariantById(item.variantId);
    const product = variant ? getProductById(variant.productId) : undefined;
    const image =
      product?.images.find((candidate) => candidate.role === "hero") ??
      product?.images[0];

    if (!variant || !product || !image) return [];

    return [
      {
        ...item,
        variant,
        product,
        image,
        lineTotalMinor: variant.priceMinor * item.quantity,
      },
    ];
  });
}

export function getCartItemCount(items: readonly CartItem[]): number {
  return items.reduce((total, item) => total + item.quantity, 0);
}

export function getCartSubtotalMinor(
  lines: readonly ResolvedCartLine[],
): number {
  return lines.reduce(
    (total, line) => total + line.lineTotalMinor,
    0,
  );
}

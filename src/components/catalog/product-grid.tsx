import type { Product } from "@/data/catalog";
import styles from "./catalog.module.css";
import { IntentPrefetchList } from "./intent-prefetch-list";
import { ProductCard } from "./product-card";

interface ProductGridProps {
  products: readonly Product[];
  priorityCount?: number;
  labelledBy?: string;
  sharedMedia?: boolean;
}

export function ProductGrid({
  products,
  priorityCount = 0,
  labelledBy,
  sharedMedia = true,
}: ProductGridProps) {
  return (
    <IntentPrefetchList className={styles.grid} labelledBy={labelledBy}>
      {products.map((product, index) => (
        <li className={styles.item} key={product.id}>
          <ProductCard
            product={product}
            highPriority={priorityCount > 0 && index === 0}
            sharedMedia={sharedMedia}
          />
        </li>
      ))}
    </IntentPrefetchList>
  );
}

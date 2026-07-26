import type { Product } from "@/data/catalog";
import styles from "./catalog.module.css";
import { ProductCard } from "./product-card";

interface ProductGridProps {
  products: readonly Product[];
  priorityCount?: number;
  labelledBy?: string;
}

export function ProductGrid({ products, priorityCount = 0, labelledBy }: ProductGridProps) {
  return (
    <ul className={styles.grid} aria-labelledby={labelledBy}>
      {products.map((product, index) => (
        <li className={styles.item} key={product.id}>
          <ProductCard product={product} highPriority={priorityCount > 0 && index === 0} />
        </li>
      ))}
    </ul>
  );
}

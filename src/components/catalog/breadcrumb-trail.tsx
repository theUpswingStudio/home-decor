import { Breadcrumbs, type BreadcrumbItem } from "@/components/ui/breadcrumbs";
import styles from "./catalog.module.css";

interface BreadcrumbTrailProps {
  items: readonly BreadcrumbItem[];
}

export function BreadcrumbTrail({ items }: BreadcrumbTrailProps) {
  return <Breadcrumbs className={styles.trail} items={items} />;
}

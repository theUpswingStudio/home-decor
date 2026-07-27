import Link from "next/link";

export interface BreadcrumbItem {
  href?: string;
  label: string;
  transitionTypes?: string[];
}

interface BreadcrumbsProps {
  items: readonly BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className = "" }: BreadcrumbsProps) {
  return (
    <nav
      className={`breadcrumbs ${className}`.trim()}
      aria-label="Breadcrumb"
    >
      <ol className="breadcrumbs__list">
        {items.map((item, index) => {
          const isCurrent = index === items.length - 1;

          return (
            <li className="breadcrumbs__item" key={`${item.href}-${item.label}`}>
              {item.href && !isCurrent ? (
                <Link
                  className="breadcrumbs__link"
                  href={item.href}
                  transitionTypes={item.transitionTypes}
                >
                  {item.label}
                </Link>
              ) : (
                <span aria-current={isCurrent ? "page" : undefined}>
                  {item.label}
                </span>
              )}
              {!isCurrent ? (
                <span className="breadcrumbs__separator" aria-hidden="true">
                  /
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

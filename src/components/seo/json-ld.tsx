import { catalog } from "@/lib/catalog";
import { absoluteUrl, getSiteUrl } from "./site-url";

export interface BreadcrumbJsonLdItem {
  readonly name: string;
  readonly path: string;
}

function serializeJsonLd(value: unknown): string {
  return (JSON.stringify(value) ?? "null")
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export function JsonLd({ id, data }: { readonly id: string; readonly data: unknown }) {
  return (
    <script
      id={id}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}

export function createWebsiteJsonLd() {
  const siteUrl = getSiteUrl().toString();

  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": absoluteUrl("/#website"),
    name: catalog.site.brandName,
    url: siteUrl,
    description: catalog.site.story,
    inLanguage: catalog.site.locale,
  };
}

export function createBreadcrumbJsonLd(
  items: readonly BreadcrumbJsonLdItem[],
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

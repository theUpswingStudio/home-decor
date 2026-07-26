import type { Metadata } from "next";
import { HomePage } from "@/components/home/home-page";
import { createWebsiteJsonLd, JsonLd } from "@/components/seo/json-ld";
import { catalog } from "@/lib/catalog";

export const metadata: Metadata = {
  title: { absolute: catalog.site.seo.title },
  description: catalog.site.seo.description,
  alternates: { canonical: "/" },
  openGraph: {
    title: catalog.site.seo.title,
    description: catalog.site.seo.description,
    siteName: catalog.site.brandName,
    locale: catalog.site.locale.replace("-", "_"),
    type: "website",
    url: "/",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: `${catalog.site.brandName} - ${catalog.site.tagline}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: catalog.site.seo.title,
    description: catalog.site.seo.description,
    images: ["/opengraph-image"],
  },
};

export default function Home() {
  return (
    <>
      <JsonLd id="website-json-ld" data={createWebsiteJsonLd()} />
      <HomePage />
    </>
  );
}

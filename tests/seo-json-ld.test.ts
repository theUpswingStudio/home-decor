import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  createBreadcrumbJsonLd,
  createWebsiteJsonLd,
  JsonLd,
} from "@/components/seo/json-ld";

describe("SEO JSON-LD", () => {
  it("describes the fictional concept as a website, not a store", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://portfolio.test");

    expect(createWebsiteJsonLd()).toMatchObject({
      "@context": "https://schema.org",
      "@type": "WebSite",
      url: "https://portfolio.test/",
    });
  });

  it("keeps breadcrumb JSON-LD and escapes script-breaking characters", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://portfolio.test");
    const breadcrumbs = createBreadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: "</script><script>alert('&')</script>", path: "/products/test" },
    ]);
    const markup = renderToStaticMarkup(
      JsonLd({ id: "breadcrumbs", data: breadcrumbs }),
    );

    expect(breadcrumbs).toMatchObject({
      "@type": "BreadcrumbList",
      itemListElement: [
        { position: 1, item: "https://portfolio.test/" },
        { position: 2, item: "https://portfolio.test/products/test" },
      ],
    });
    expect(markup).not.toContain("</script><script>");
    expect(markup).toContain("\\u003c/script\\u003e");
    expect(markup).toContain("\\u0026");
  });
});

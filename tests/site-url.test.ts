import { afterEach, describe, expect, it, vi } from "vitest";
import {
  absoluteUrl,
  getSiteUrl,
  isIndexingEnabled,
} from "@/components/seo/site-url";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("site URL policy", () => {
  it("uses the safe non-production fallback for missing or invalid URLs", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    expect(getSiteUrl().toString()).toBe("https://vestrelhouse.example/");

    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://insecure.test/path");
    expect(getSiteUrl().toString()).toBe("https://vestrelhouse.example/");
  });

  it("normalizes a configured secure URL to its origin", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://www.vestrel.test/catalog?q=1");
    expect(getSiteUrl().toString()).toBe("https://www.vestrel.test/");
    expect(absoluteUrl("/shop")).toBe("https://www.vestrel.test/shop");
  });

  it("enables indexing only for a real production deployment", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://www.vestrel.test");
    expect(isIndexingEnabled()).toBe(true);

    vi.stubEnv("VERCEL_ENV", "preview");
    expect(isIndexingEnabled()).toBe(false);

    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://vestrelhouse.example");
    expect(isIndexingEnabled()).toBe(false);
  });
});

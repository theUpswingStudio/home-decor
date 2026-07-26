const FALLBACK_SITE_URL = new URL("https://vestrelhouse.example");

function parseSiteUrl(value: string | undefined): URL | null {
  if (!value?.trim()) return null;

  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    return new URL(url.origin);
  } catch {
    return null;
  }
}

function isExampleHostname(hostname: string): boolean {
  return (
    hostname === "example.com" ||
    hostname.endsWith(".example.com") ||
    hostname.endsWith(".example")
  );
}

export function getSiteUrl(): URL {
  return parseSiteUrl(process.env.NEXT_PUBLIC_SITE_URL) ?? FALLBACK_SITE_URL;
}

export function isIndexingEnabled(): boolean {
  const configuredUrl = parseSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);
  const isProductionDeployment =
    process.env.NODE_ENV === "production" &&
    (!process.env.VERCEL_ENV || process.env.VERCEL_ENV === "production");

  return Boolean(
    isProductionDeployment &&
      configuredUrl &&
      !isExampleHostname(configuredUrl.hostname),
  );
}

export function absoluteUrl(path: string): string {
  return new URL(path, getSiteUrl()).toString();
}

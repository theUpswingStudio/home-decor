import type { Metadata } from "next";
import { Footer } from "@/components/site/footer";
import { Header } from "@/components/site/header";
import { getSiteUrl, isIndexingEnabled } from "@/components/seo/site-url";
import { catalog } from "@/lib/catalog";
import { geist, newsreader } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: {
    default: catalog.site.seo.title,
    // Catalog-authored detail titles already include the brand name.
    template: "%s",
  },
  description: catalog.site.seo.description,
  applicationName: catalog.site.brandName,
  authors: [{ name: catalog.site.brandName, url: "/about" }],
  creator: catalog.site.brandName,
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/brand/mark.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.ico",
  },
  category: "Home furnishings and interior design",
  formatDetection: {
    address: false,
    email: false,
    telephone: false,
  },
  robots: isIndexingEnabled()
    ? {
        index: true,
        follow: true,
        googleBot: { index: true, follow: true },
      }
    : {
        index: false,
        follow: false,
        googleBot: { index: false, follow: false, noimageindex: true },
      },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geist.variable} ${newsreader.variable}`}>
      <body>
        <a className="skip-link" href="#main-content">
          Skip to main content
        </a>
        <div className="site-shell">
          <Header />
          <main id="main-content" className="site-main" tabIndex={-1}>
            {children}
          </main>
          <Footer />
        </div>
      </body>
    </html>
  );
}

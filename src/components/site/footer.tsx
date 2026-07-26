import Link from "next/link";
import { Container } from "@/components/ui/container";
import { catalog } from "@/lib/catalog";
import type { NavigationItem } from "./navigation";
import { SiteWordmark } from "./site-wordmark";

const shopLinks: readonly NavigationItem[] = [
  { href: "/shop", label: "All pieces" },
  { href: "/shop/sofas-sectionals", label: "Sofas & sectionals" },
  { href: "/shop/tables-consoles", label: "Tables & consoles" },
  { href: "/shop/storage-cabinets", label: "Storage & cabinets" },
  { href: "/shop/lighting-textiles", label: "Lighting & textiles" },
];

const discoverLinks: readonly NavigationItem[] = [
  { href: "/rooms", label: "Rooms" },
  { href: "/looks", label: "Looks" },
  { href: "/collections", label: "Collections" },
  { href: "/design-services", label: "Design Services" },
];

const helpLinks: readonly NavigationItem[] = [
  { href: "/contact", label: "Contact" },
  { href: "/shipping-returns", label: "Delivery & returns" },
  { href: "/care", label: "Product care" },
  { href: "/faq", label: "FAQ" },
];

interface FooterNavigationProps {
  title: string;
  items: readonly NavigationItem[];
}

function FooterNavigation({ title, items }: FooterNavigationProps) {
  return (
    <nav className="site-footer__nav" aria-label={title}>
      <h2 className="site-footer__nav-title">{title}</h2>
      <ul className="site-footer__nav-list">
        {items.map((item) => (
          <li key={item.href}>
            <Link className="site-footer__link" href={item.href}>
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function Footer() {
  return (
    <footer className="site-footer">
      <Container>
        <div className="site-footer__main">
          <div className="site-footer__brand">
            <SiteWordmark />
            <p className="site-footer__statement">
              {catalog.site.tagline}
            </p>
          </div>
          <FooterNavigation title="Shop" items={shopLinks} />
          <FooterNavigation title="Discover" items={discoverLinks} />
          <FooterNavigation title="Help" items={helpLinks} />
        </div>

        <div className="site-footer__base">
          <p className="site-footer__copyright">
            &copy; {new Date().getFullYear()} {catalog.site.brandName}
          </p>
          <nav aria-label="Legal">
            <ul className="site-footer__legal-list">
              <li>
                <Link className="site-footer__legal-link" href="/privacy">
                  Privacy
                </Link>
              </li>
              <li>
                <Link className="site-footer__legal-link" href="/terms">
                  Terms
                </Link>
              </li>
              <li>
                <Link className="site-footer__legal-link" href="/accessibility">
                  Accessibility
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </Container>
    </footer>
  );
}

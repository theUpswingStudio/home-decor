import {
  HandbagIcon,
  MagnifyingGlassIcon,
} from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { CartCount } from "@/components/cart/cart-count";
import { Container } from "@/components/ui/container";
import { MobileNavigation } from "./mobile-navigation";
import { primaryNavigation } from "./navigation";
import { SiteWordmark } from "./site-wordmark";

export function Header() {
  return (
    <header className="site-header">
      <Container className="site-header__inner">
        <SiteWordmark />

        <nav className="site-header__desktop-nav" aria-label="Primary">
          <ul className="site-header__nav-list">
            {primaryNavigation.map((item) => (
              <li key={item.href}>
                <Link className="site-header__nav-link" href={item.href}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="site-header__utility">
          <MobileNavigation />
          <Link
            className="site-header__utility-link"
            href="/search"
            aria-label="Search"
          >
            <MagnifyingGlassIcon size={20} weight="regular" aria-hidden="true" />
            <span className="site-header__utility-label" aria-hidden="true">
              Search
            </span>
          </Link>
          <Link
            className="site-header__utility-link"
            href="/cart"
          >
            <HandbagIcon size={20} weight="regular" aria-hidden="true" />
            <span className="site-header__utility-label" aria-hidden="true">
              Cart
            </span>
            <CartCount className="site-header__cart-count" />
          </Link>
        </div>
      </Container>
    </header>
  );
}

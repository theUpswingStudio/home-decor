import Link from "next/link";

interface SiteWordmarkProps {
  className?: string;
}

export function SiteWordmark({ className = "" }: SiteWordmarkProps) {
  return (
    <Link
      href="/"
      className={`site-wordmark ${className}`.trim()}
      aria-label="Vestrel / House, home"
    >
      <span aria-hidden="true">Vestrel <span className="site-wordmark__divider">/</span> House</span>
    </Link>
  );
}

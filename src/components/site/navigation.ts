export interface NavigationItem {
  href: string;
  label: string;
}

export const primaryNavigation: readonly NavigationItem[] = [
  { href: "/shop", label: "Shop" },
  { href: "/rooms", label: "Rooms" },
  { href: "/looks", label: "Looks" },
  { href: "/collections", label: "Collections" },
  { href: "/design-services", label: "Design Services" },
  { href: "/ai-consultation", label: "Design with AI" },
];

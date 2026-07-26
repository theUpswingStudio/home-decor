import type { Metadata } from "next";
import { CartPage } from "@/components/cart/cart-page";

const title = "Your Cart";
const description = "Review your Vestrel House selections before a consultation.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/cart" },
  robots: {
    index: false,
    follow: true,
    googleBot: { index: false, follow: true },
  },
  openGraph: {
    title,
    description,
    type: "website",
    url: "/cart",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Vestrel House portfolio concept",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/opengraph-image"],
  },
};

export default function CartRoute() {
  return <CartPage />;
}

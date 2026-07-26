import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { Container } from "@/components/ui/container";
import { InquiryForm } from "@/components/inquiry/inquiry-form";
import { catalog } from "@/lib/catalog";
import styles from "./inquire.module.css";

const title = "Design Consultation Inquiry";
const description =
  "Share your project scope and selected Vestrel House pieces in a two-step consultation inquiry.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/design-services/inquire" },
  robots: {
    index: false,
    follow: true,
    googleBot: { index: false, follow: true },
  },
  openGraph: {
    title,
    description,
    type: "website",
    url: "/design-services/inquire",
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

interface InquiryPageProps {
  readonly searchParams: Promise<{
    readonly from?: string | readonly string[];
  }>;
}

export default async function InquiryPage({ searchParams }: InquiryPageProps) {
  const params = await searchParams;
  const fromCart = params.from === "cart";

  return (
    <Container className={styles.page}>
      <Breadcrumbs
        items={[
          { href: "/", label: "Home" },
          { href: "/design-services", label: "Design services" },
          { label: "Inquiry" },
        ]}
      />
      <InquiryForm inquiry={catalog.inquiry} fromCart={fromCart} />
    </Container>
  );
}

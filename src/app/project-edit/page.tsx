import type { Metadata } from "next";
import { ProjectEditPage } from "@/components/project-edit/project-edit-page";

const title = "Your Project Edit";
const description =
  "Review saved products, room directions, and material notes before a consultation preview.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/project-edit" },
  openGraph: {
    title,
    description,
    type: "website",
    url: "/project-edit",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
  robots: {
    index: false,
    follow: true,
    googleBot: { index: false, follow: true },
  },
};

export default function ProjectEditRoute() {
  return <ProjectEditPage />;
}

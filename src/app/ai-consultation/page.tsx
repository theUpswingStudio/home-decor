import type { Metadata } from "next";
import { ConsultationWorkspace } from "@/components/ai-consultation/consultation-workspace";

export const metadata: Metadata = {
  title: "Design with AI | Vestrel House",
  description: "Build an initial room brief and review catalog recommendations with the Vestrel House design assistant.",
};

export default function AiConsultationPage() {
  return <ConsultationWorkspace />;
}

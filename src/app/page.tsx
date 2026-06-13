import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/landing-page";

export const metadata: Metadata = {
  title: {
    absolute: "Cortex — Chat with your documents, get cited answers",
  },
  description:
    "Multi-tenant AI RAG platform. Upload your documents and ask anything — Cortex answers in plain language, grounded in your files with citations you can verify.",
};

export default function Home() {
  return <LandingPage />;
}

"use client";

import { Navbar } from "@/components/landing/Navbar";
import { Hero } from "@/components/landing/Hero";
import { FeatureBento } from "@/components/landing/FeatureBento";
import { BeforeAfterShowcase } from "@/components/landing/BeforeAfterShowcase";
import { WorkflowSteps } from "@/components/landing/WorkflowSteps";
import { PrivacyGrid } from "@/components/landing/PrivacyGrid";
import { Footer } from "@/components/landing/Footer";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-emerald-500 selection:text-slate-950 flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <FeatureBento />
        <BeforeAfterShowcase />
        <WorkflowSteps />
        <PrivacyGrid />
      </main>
      <Footer />
    </div>
  );
}

"use client";

import { StatsCards } from "@/components/dashboard/StatsCards";
import { QuickDropzone } from "@/components/dashboard/QuickDropzone";
import { RecentMeetingsList } from "@/components/dashboard/RecentMeetingsList";

export default function DashboardOverviewPage() {
  return (
    <div className="space-y-8">
      {/* Analytics & Metrics Header */}
      <section>
        <StatsCards />
      </section>

      {/* Main Workspace Bento */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Quick Dropzone (Span 5) */}
        <div className="lg:col-span-5 space-y-6">
          <QuickDropzone />
        </div>

        {/* Right Column: Recent Syntheses (Span 7) */}
        <div className="lg:col-span-7 space-y-6">
          <RecentMeetingsList />
        </div>
      </section>
    </div>
  );
}

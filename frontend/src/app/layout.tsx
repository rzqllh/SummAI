import type { Metadata } from "next";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";

export const metadata: Metadata = {
  title: {
    default: "SummAI - Meeting Intelligence & Synthesis",
    template: "%s | SummAI",
  },
  description:
    "AI-Powered Meeting Intelligence, Groq Whisper Speech-to-Text, and Google Gemini Structured Synthesis with 100% Local Privacy.",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icon.svg" />
      </head>
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}

import type React from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ClientAuthWrapper from "./client";
import { AgentProvider } from "@/context/AgentContext";

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SubSync AI - Smart Subscription Management",
  description:
    "AI-powered subscription tracking and management for individuals and teams",
  generator: "v0.app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        <ClientAuthWrapper>
          <AgentProvider>{children}</AgentProvider>
        </ClientAuthWrapper>
      </body>
    </html>
  );
}

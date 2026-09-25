import type { Metadata } from "next";
import ImpersonationBanner from "@/components/common/ImpersonationBanner";
import StagingWatermark from "@/components/common/StagingWatermark";
import "./globals.css";

export const metadata: Metadata = {
  title: "מערכת ניהול Onboarding",
  description: "מערכת ניהול ובקרת צק ליסט קליטת עובדים וספקים",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <body className="font-hebrew antialiased selection:bg-blue-100 selection:text-blue-900">
        <StagingWatermark />
        <ImpersonationBanner />
        {children}
      </body>
    </html>
  );
}

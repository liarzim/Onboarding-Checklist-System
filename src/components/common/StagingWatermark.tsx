"use client";

import { useEffect, useState } from "react";

export default function StagingWatermark() {
  const [isStaging, setIsStaging] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const host = window.location.hostname;
      // Strictly disabled in Production domain
      const isProduction =
        host === "onboardingchecklistsystem.vercel.app" ||
        (process.env.NEXT_PUBLIC_VERCEL_ENV === "production" &&
          !host.includes("staging") &&
          !host.includes("-git-") &&
          !host.includes("localhost") &&
          !host.includes("127.0.0.1"));

      setIsStaging(!isProduction);
    }
  }, []);

  if (!isStaging) {
    return null;
  }

  // Generate repeating rows for the diagonal background pattern
  const rows = [
    "טסט • STAGING • טסט • STAGING • טסט • STAGING • טסט",
    "סביבת בדיקות • טסט • TEST ENVIRONMENT • טסט • בדיקות",
    "טסט • STAGING • טסט • STAGING • טסט • STAGING • טסט",
    "סביבת בדיקות • טסט • TEST ENVIRONMENT • טסט • בדיקות",
    "טסט • STAGING • טסט • STAGING • טסט • STAGING • טסט",
    "סביבת בדיקות • טסט • TEST ENVIRONMENT • טסט • בדיקות",
    "טסט • STAGING • טסט • STAGING • טסט • STAGING • טסט",
    "סביבת בדיקות • טסט • TEST ENVIRONMENT • טסט • בדיקות",
  ];

  return (
    <>
      {/* 1. Full-screen diagonal repeating large watermark (pointer-events-none) */}
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none select-none z-30 overflow-hidden flex flex-col justify-around opacity-25 dark:opacity-20"
      >
        <div className="w-[180%] -translate-x-[20%] -translate-y-[10%] -rotate-12 flex flex-col gap-12 sm:gap-16">
          {rows.map((rowText, i) => (
            <div
              key={i}
              className={`whitespace-nowrap font-black tracking-widest text-4xl sm:text-6xl md:text-7xl uppercase text-amber-500/50 drop-shadow-sm ${
                i % 2 === 0 ? "translate-x-12" : "-translate-x-12"
              }`}
            >
              {rowText}
            </div>
          ))}
        </div>
      </div>

      {/* 2. Floating prominent staging banner at the very top (pointer-events-none) */}
      <div
        aria-hidden="true"
        className="fixed top-0 inset-x-0 z-50 pointer-events-none flex justify-center items-center py-1 bg-amber-500/90 text-amber-950 font-bold text-xs shadow-md border-b border-amber-600/40"
      >
        <span className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-900 animate-ping inline-block" />
          <span>⚠️ סביבת טסט (STAGING TEST ENVIRONMENT) - הנתונים כאן אינם משפיעים על הייצור ⚠️</span>
        </span>
      </div>

      {/* 3. Corner Ribbon watermark for crystal-clear visual indicator */}
      <div
        aria-hidden="true"
        className="fixed bottom-4 left-4 z-40 pointer-events-none select-none"
      >
        <div className="bg-amber-500/90 text-amber-950 font-black text-sm sm:text-base px-4 py-1.5 rounded-full shadow-lg border border-amber-400 flex items-center gap-2 uppercase tracking-wider backdrop-blur-sm">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
          <span>סביבת טסט / STAGING</span>
        </div>
      </div>
    </>
  );
}

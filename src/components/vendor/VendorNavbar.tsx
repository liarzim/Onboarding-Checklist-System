"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FileCheck,
  Users,
  LogOut,
  Building2,
  Menu,
  X,
  ChevronLeft,
} from "lucide-react";
import type { VendorSession } from "@/lib/auth";

interface VendorNavbarProps {
  session: VendorSession | null;
}

export default function VendorNavbar({ session }: VendorNavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [mobileMenuOpen]);

  const navItems = [
    {
      num: "01",
      label: "רשימת מועמדים",
      href: "/vendor",
      icon: Users,
    },
  ];

  return (
    <>
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-6">
            {/* Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition flex items-center gap-1.5"
              aria-label="פתח תפריט"
              title="תפריט ניווט"
            >
              <Menu className="w-5 h-5 text-blue-600" />
              <span className="hidden sm:inline text-xs font-semibold text-slate-700">
                תפריט
              </span>
            </button>

            {/* Logo and System Title */}
            <Link
              href="/vendor"
              className="flex items-center gap-2.5 font-bold text-slate-900 hover:text-blue-600 transition"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-100 p-1 flex items-center justify-center shadow-sm shrink-0 border border-slate-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/logos/app_logo.png"
                  alt="Onboarding Logo"
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-base sm:text-lg font-bold">מערכת קליטת עובדים</span>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1.5 mr-2">
              {navItems.map((item) => {
                const active = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                      active
                        ? "bg-blue-50 text-blue-700 font-bold border border-blue-200"
                        : "text-slate-700 hover:text-blue-600 hover:bg-slate-50"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {session && (
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="hidden sm:flex flex-col text-left text-xs">
                  <span className="font-semibold text-slate-800 flex items-center gap-1 justify-end">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    {session.company_name}
                  </span>
                  <span className="text-slate-500 text-[11px]">{session.email}</span>
                </div>
                <form action="/api/auth/vendor/logout" method="POST">
                  <button
                    type="submit"
                    title="התנתקות"
                    className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden" dir="rtl">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex">
            <div className="w-80 max-w-[85vw] bg-white border-l border-slate-200 text-slate-900 shadow-2xl flex flex-col justify-between">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 p-1 flex items-center justify-center shadow-sm shrink-0 border border-slate-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/logos/app_logo.png"
                      alt="Onboarding Logo"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 leading-tight">
                      פורטל ספקים
                    </h3>
                    <p className="text-[10px] text-slate-500">קליטה ואישור מועמדים</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                  aria-label="סגור תפריט"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {session && (
                <div className="px-5 py-4 bg-slate-50 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0 text-right">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {session.company_name}
                      </p>
                      <p className="text-[11px] text-blue-600 font-medium">ספק מורשה</p>
                      <p className="text-[10px] text-slate-500 truncate mt-0.5">
                        {session.email}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="p-4 flex-1 overflow-y-auto space-y-1.5">
                <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  עמודי המערכת
                </p>
                {navItems.map((item) => {
                  const active = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center justify-between p-3 rounded-xl text-sm font-semibold transition ${
                        active
                          ? "bg-blue-50 text-blue-700 border border-blue-200 font-bold"
                          : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                          {item.num}
                        </span>
                        <Icon className="w-4 h-4 text-blue-600" />
                        <span>{item.label}</span>
                      </div>
                      <ChevronLeft className="w-4 h-4 opacity-50" />
                    </Link>
                  );
                })}
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50">
                <form action="/api/auth/vendor/logout" method="POST">
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 transition"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>התנתקות מהמערכת</span>
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

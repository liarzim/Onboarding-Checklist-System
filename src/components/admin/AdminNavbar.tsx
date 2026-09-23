"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldCheck,
  Users,
  Archive,
  LogOut,
  UserCheck,
  Settings,
  FileText,
  History,
  Menu,
  X,
  ChevronLeft,
} from "lucide-react";
import type { AdminSession } from "@/lib/auth";

interface AdminNavbarProps {
  session: AdminSession | null;
}

export default function AdminNavbar({ session }: AdminNavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  // Close mobile drawer on route transition
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Lock background scroll when drawer is open on mobile
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
      label: "מועמדים פעילים",
      href: "/admin",
      icon: Users,
      exact: true,
      adminOnly: false,
    },
    {
      num: "02",
      label: "ארכיון שהושלמו",
      href: "/admin/completed",
      icon: Archive,
      exact: false,
      adminOnly: false,
    },
    {
      num: "03",
      label: "הגדרות מערכת",
      href: "/admin/settings",
      icon: Settings,
      exact: false,
      adminOnly: true,
    },
    {
      num: "04",
      label: "יומן פעולות",
      href: "/admin/audit-log",
      icon: FileText,
      exact: false,
      adminOnly: true,
    },
    {
      num: "05",
      label: "גרסאות מערכת",
      href: "/admin/versions",
      icon: History,
      exact: false,
      adminOnly: true,
    },
  ];

  const visibleItems = navItems.filter(
    (item) => !item.adminOnly || session?.role === "Admin"
  );

  const isActive = (item: (typeof navItems)[0]) => {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname.startsWith(item.href);
  };

  return (
    <>
      <header className="bg-slate-900 text-white sticky top-0 z-30 shadow-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Right Section: Logo, Title & Hamburger Toggle */}
          <div className="flex items-center gap-3 sm:gap-6">
            {/* Hamburger / Menu Button (Visible on mobile, plus quick access button) */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 transition flex items-center gap-1.5"
              aria-label="פתח תפריט ניווט"
              title="תפריט ניווט"
            >
              <Menu className="w-5 h-5 text-blue-400" />
              <span className="hidden sm:inline text-xs font-semibold text-slate-300">
                תפריט
              </span>
            </button>

            {/* Logo and System Title */}
            <Link
              href="/admin"
              className="flex items-center gap-2.5 font-bold hover:text-blue-400 transition"
            >
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="flex flex-col text-right">
                <span className="text-sm sm:text-base leading-tight font-bold text-white">
                  פורטל ניהול ומשאבי אנוש
                </span>
                <span className="hidden sm:block text-[11px] text-slate-400 font-normal">
                  בקרת קליטה וכרטיסים חכמים
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links (Visible on large screens) */}
            <nav className="hidden lg:flex items-center gap-1.5 mr-2">
              {visibleItems.map((item) => {
                const active = isActive(item);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                      active
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-slate-300 hover:text-white hover:bg-slate-800"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Left Section: User Status & Logout */}
          <div className="flex items-center gap-2 sm:gap-4">
            {session && (
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="hidden sm:flex flex-col text-left text-xs">
                  <span className="font-semibold text-slate-200 flex items-center gap-1 justify-end">
                    <UserCheck className="w-3.5 h-3.5 text-blue-400" />
                    {session.full_name}
                  </span>
                  <span className="text-slate-400 text-[11px]">
                    {session.role === "HR" ? "משאבי אנוש" : "מנהל ראשי"}
                  </span>
                </div>

                <form action="/api/auth/admin/logout" method="POST">
                  <button
                    type="submit"
                    title="התנתקות ממערכת הניהול"
                    className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile & Regular App Slide-Over Menu Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden" dir="rtl">
          {/* Backdrop Blur Overlay */}
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Slide-over Drawer Panel */}
          <div className="fixed inset-y-0 right-0 max-w-full flex">
            <div className="w-80 max-w-[85vw] bg-slate-900 border-l border-slate-800 text-white shadow-2xl flex flex-col justify-between">
              {/* Drawer Header */}
              <div className="p-5 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-md">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div className="text-right">
                    <h3 className="font-bold text-sm text-white leading-tight">
                      תפריט ניווט מהיר
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      בקרת קליטה וכרטיסים חכמים
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                  aria-label="סגור תפריט"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer User Card */}
              {session && (
                <div className="px-5 py-4 bg-slate-800/50 border-b border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0 text-right">
                      <p className="text-xs font-bold text-white truncate">
                        {session.full_name}
                      </p>
                      <p className="text-[11px] text-blue-400 font-medium">
                        {session.role === "HR" ? "משאבי אנוש" : "מנהל מערכת ראשי"}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">
                        {session.email}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Drawer Navigation List */}
              <div className="p-4 flex-1 overflow-y-auto space-y-1.5">
                <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  עמודי המערכת
                </p>
                {visibleItems.map((item) => {
                  const active = isActive(item);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center justify-between p-3 rounded-xl text-sm font-semibold transition ${
                        active
                          ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                          : "text-slate-300 hover:bg-slate-800 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                            active
                              ? "bg-blue-500/40 text-blue-100"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {item.num}
                        </span>
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </div>
                      <ChevronLeft className="w-4 h-4 opacity-50" />
                    </Link>
                  );
                })}
              </div>

              {/* Drawer Footer with Logout Button */}
              <div className="p-4 border-t border-slate-800 bg-slate-950/40">
                <form action="/api/auth/admin/logout" method="POST">
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-bold border border-rose-500/20 transition"
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

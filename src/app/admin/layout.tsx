import Link from "next/link";
import { getAdminSession } from "@/lib/auth";
import {
  ShieldCheck,
  Users,
  Archive,
  LogOut,
  UserCheck,
  Settings,
  FileText,
  History,
} from "lucide-react";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAdminSession();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Admin Top Header */}
      <header className="bg-slate-900 text-white sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link
              href="/admin"
              className="flex items-center gap-2.5 font-bold hover:text-blue-400 transition"
            >
              <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-md">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="flex flex-col">
                <span className="text-base leading-tight font-bold">פורטל ניהול ומשאבי אנוש</span>
                <span className="text-[11px] text-slate-400 font-normal">בקרת קליטה וכרטיסים חכמים</span>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-2">
              <Link
                href="/admin"
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <Users className="w-4 h-4" />
                <span>מועמדים פעילים</span>
              </Link>
              <Link
                href="/admin/completed"
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <Archive className="w-4 h-4" />
                <span>ארכיון שהושלמו</span>
              </Link>
              {session?.role === "Admin" && (
                <>
                  <Link
                    href="/admin/settings"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition"
                  >
                    <Settings className="w-4 h-4" />
                    <span>הגדרות מערכת</span>
                  </Link>
                  <Link
                    href="/admin/audit-log"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition"
                  >
                    <FileText className="w-4 h-4" />
                    <span>יומן פעולות</span>
                  </Link>
                  <Link
                    href="/admin/versions"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 transition"
                  >
                    <History className="w-4 h-4" />
                    <span>גרסאות מערכת</span>
                  </Link>
                </>
              )}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {session && (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col text-left text-xs">
                  <span className="font-semibold text-slate-200 flex items-center gap-1 justify-end">
                    <UserCheck className="w-3.5 h-3.5 text-blue-400" />
                    {session.full_name}
                  </span>
                  <span className="text-slate-400">
                    תפקיד: {session.role === "HR" ? "משאבי אנוש" : "מנהל מערכת"}
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

      {/* Main Administrative Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </div>
    </div>
  );
}

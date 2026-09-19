import Link from "next/link";
import { getVendorSession } from "@/lib/auth";
import { Building2, LogOut, Users, FileCheck } from "lucide-react";

export default async function VendorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getVendorSession();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link
              href="/vendor"
              className="flex items-center gap-2.5 font-bold text-slate-900 hover:text-blue-600 transition"
            >
              <div className="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-sm">
                <FileCheck className="w-5 h-5" />
              </div>
              <span className="text-lg">מערכת קליטת עובדים</span>
            </Link>

            <nav className="hidden md:flex items-center gap-2">
              <Link
                href="/vendor"
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-700 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition"
              >
                <Users className="w-4 h-4" />
                <span>מועמדים</span>
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-4">
            {session && (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col text-left text-xs">
                  <span className="font-semibold text-slate-800 flex items-center gap-1 justify-end">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    {session.company_name}
                  </span>
                  <span className="text-slate-500">{session.email}</span>
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

      {/* Main Content Area */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </div>
    </div>
  );
}

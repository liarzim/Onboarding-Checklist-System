import { getAdminSession } from "@/lib/auth";
import AdminNavbar from "@/components/admin/AdminNavbar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getAdminSession();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Admin Responsive Navbar with Mobile Drawer and Desktop Menu */}
      <AdminNavbar session={session} />

      {/* Main Administrative Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </div>
    </div>
  );
}

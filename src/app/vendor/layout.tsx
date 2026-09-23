import { getVendorSession } from "@/lib/auth";
import VendorNavbar from "@/components/vendor/VendorNavbar";

export default async function VendorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getVendorSession();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navbar */}
      <VendorNavbar session={session} />

      {/* Main Content Area */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </div>
    </div>
  );
}

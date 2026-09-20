"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

function AdminLoginRedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("portal", "admin");
    router.replace(`/login?${params.toString()}`);
  }, [router, searchParams]);

  return (
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      <span className="text-sm text-slate-400">מעביר למסך ההתחברות המרכזי...</span>
    </div>
  );
}

export default function AdminLoginRedirect() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900 text-white">
      <Suspense
        fallback={
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <span className="text-sm text-slate-400">טוען...</span>
          </div>
        }
      >
        <AdminLoginRedirectContent />
      </Suspense>
    </div>
  );
}

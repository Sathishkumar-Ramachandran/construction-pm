"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { Sidebar } from "@/components/layout/sidebar";
import { Spinner } from "@/components/ui/loading";

// Context so Header anywhere in the dashboard can trigger the sidebar
const SidebarToggleContext = createContext<() => void>(() => {});
export function useSidebarToggle() { return useContext(SidebarToggleContext); }

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, initialize } = useAuthStore();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => { initialize(); }, [initialize]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push("/login");
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner className="h-8 w-8 text-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <SidebarToggleContext.Provider value={() => setSidebarOpen((o) => !o)}>
      <div className="flex h-full">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 md:ml-64 flex flex-col min-h-screen overflow-auto bg-gray-50">
          {children}
        </main>
      </div>
    </SidebarToggleContext.Provider>
  );
}

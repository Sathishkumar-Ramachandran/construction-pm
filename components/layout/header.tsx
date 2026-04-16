"use client";
import { Bell, Menu } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import useSWR from "swr";
import { api, APIResponse } from "@/lib/api";
import { useSidebarToggle } from "@/app/(dashboard)/layout";

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function Header({ title, subtitle, actions }: HeaderProps) {
  const { user } = useAuthStore();
  const toggleSidebar = useSidebarToggle();

  const { data: notifData } = useSWR(
    user ? "/notifications/unread-count" : null,
    () => api.get<APIResponse<{ unread_count: number }>>("/notifications/unread-count"),
    { refreshInterval: 30000 }
  );
  const unreadCount = notifData?.data?.unread_count || 0;

  return (
    <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-3 sticky top-0 z-10">
      {/* Hamburger — mobile only */}
      <button
        onClick={toggleSidebar}
        className="md:hidden flex-shrink-0 p-2 -ml-1 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5 text-gray-600" />
      </button>

      {/* Title */}
      <div className="flex-1 min-w-0">
        <h1 className="text-base sm:text-xl font-bold text-gray-900 truncate">{title}</h1>
        {subtitle && (
          <p className="text-xs sm:text-sm text-gray-500 mt-0.5 truncate hidden xs:block">{subtitle}</p>
        )}
      </div>

      {/* Actions + Bell */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {actions && <div className="flex items-center gap-2">{actions}</div>}
        <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <Bell className="w-5 h-5 text-gray-500" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}

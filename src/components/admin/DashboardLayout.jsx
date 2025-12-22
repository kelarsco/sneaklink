import { Sidebar } from "./Sidebar";
import { MobileBottomNav } from "./MobileBottomNav";

export function DashboardLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col w-full bg-gradient-to-br from-[#fafafa] via-[#f5f5f5] to-[#fef9e7] dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <Sidebar />
      <main className="flex-1 overflow-x-hidden pt-0 pb-20 md:pb-0">
        <div className="px-[12px] py-6 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
      <MobileBottomNav />
    </div>
  );
}

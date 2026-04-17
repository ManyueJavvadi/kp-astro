import { Sidebar } from "@/components/pro/sidebar";

export default function ProLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen app-bg text-text-primary font-sans relative">
      <div className="flex relative z-10">
        <Sidebar />
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}

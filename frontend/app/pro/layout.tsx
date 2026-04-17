import { Sidebar } from "@/components/pro/sidebar";

export default function ProLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#070B14",
        color: "#F1F5F9",
        fontFamily: "'Inter', 'DM Sans', system-ui, -apple-system, sans-serif",
      }}
    >
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <Sidebar />
        <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
      </div>
    </div>
  );
}

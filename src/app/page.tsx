import { Suspense } from "react";
import Dashboard from "./DashboardClient";

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-xs text-text-faint">Loading…</div>}>
      <Dashboard />
    </Suspense>
  );
}

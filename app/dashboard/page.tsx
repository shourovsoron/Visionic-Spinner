import { redirect } from "next/navigation";
import { isAuthenticatedPage } from "@/lib/adminAuth";
import DashboardApp from "@/components/dashboard/DashboardApp";

export default async function DashboardPage() {
  if (!(await isAuthenticatedPage())) {
    redirect("/dashboard/login");
  }

  return <DashboardApp />;
}

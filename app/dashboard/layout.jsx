import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import DashboardShell from "@/components/DashboardShell";

export default async function DashboardLayout({ children }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return <DashboardShell email={session.email}>{children}</DashboardShell>;
}

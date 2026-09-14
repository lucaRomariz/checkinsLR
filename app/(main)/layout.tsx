import NavShell from "@/components/NavShell";
import { getSession } from "@/lib/session";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await getSession();
  return <NavShell profile={profile}>{children}</NavShell>;
}

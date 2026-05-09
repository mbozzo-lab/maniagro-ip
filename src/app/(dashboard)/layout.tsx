import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import DashboardShell from "./DashboardShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user;
  const prefs = user.id
    ? await prisma.userPreferences.findUnique({ where: { userId: user.id } })
    : null;
  const profilePicture = prefs?.profilePicture ?? user.image ?? null;

  return (
    <DashboardShell
      user={{
        id: user.id ?? "",
        name: user.name ?? "Usuario",
        email: user.email ?? "",
        image: user.image ?? null,
      }}
      profilePicture={profilePicture}
    >
      {children}
    </DashboardShell>
  );
}

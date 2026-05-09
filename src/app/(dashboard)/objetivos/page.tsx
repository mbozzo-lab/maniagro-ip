import { auth } from "@/lib/auth";
import ObjetivosClient from "./ObjetivosClient";

export default async function ObjetivosPage() {
  const session = await auth();
  return <ObjetivosClient userEmail={session?.user?.email ?? null} />;
}

import { redirect } from "next/navigation";
import { auth } from "@/auth";

/** Returns the session or redirects to /login. Node runtime only (uses Prisma). */
export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user;
}

/** Returns the session if admin/instructor, else redirects. */
export async function requireAdmin() {
  const session = await auth();
  const role = session?.user?.role;
  if (!session?.user?.id) redirect("/login");
  if (role !== "admin" && role !== "instructor") redirect("/learn");
  return session.user;
}

export async function getOptionalUser() {
  const session = await auth();
  return session?.user ?? null;
}

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionToken } from "./auth";

export type Session = {
  userId: string;
  email: string;
  role: string;
};

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("pa_session")?.value;
  if (!token) {
    return null;
  }
  try {
    return await verifySessionToken(token);
  } catch (error) {
    return null;
  }
}

export async function requireSession() {
  const session = await getSession();
  if (!session) {
    redirect("/");
  }
  return session;
}

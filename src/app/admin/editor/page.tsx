import { requireSession } from "@/lib/session";
import EditorClient from "./EditorClient";

export default async function EditorPage() {
  const session = await requireSession();
  if (session.role !== "ADMIN") {
    return (
      <main className="mx-auto max-w-4xl px-6 py-12 text-center">
        <h1 className="text-2xl font-semibold">Access denied</h1>
        <p className="text-sm text-[color:var(--muted)]">
          This area is for Prestige Accounting admin only.
        </p>
      </main>
    );
  }

  return <EditorClient />;
}

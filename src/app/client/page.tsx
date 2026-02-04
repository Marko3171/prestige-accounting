import UploadPanel from "@/components/UploadPanel";
import { prisma } from "@/lib/db";
import { getEditorConfig } from "@/lib/editor";
import { requireSession } from "@/lib/session";

export default async function ClientPage() {
  const session = await requireSession();
  if (session.role !== "CLIENT") {
    return (
      <main className="mx-auto max-w-4xl px-6 py-12 text-center">
        <h1 className="text-2xl font-semibold">Access denied</h1>
        <p className="text-sm text-[color:var(--muted)]">
          This area is for client accounts only.
        </p>
      </main>
    );
  }

  const config = await getEditorConfig();

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { profile: true },
  });

  const uploads = await prisma.upload.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
  });

  const uploadList = uploads.map((upload) => ({
    ...upload,
    createdAt: upload.createdAt.toISOString(),
    warnings: upload.warnings ?? null,
    bankName: upload.bankName ?? null,
    storedMime: upload.storedMime,
    qaReport: upload.qaReport ?? null,
    previewPath: upload.previewPath ?? null,
  }));

  const sections = config.client.sectionsOrder;

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12">
      {sections.map((section) => {
        if (section === "header") {
          return (
            <header key="header" className="mb-10 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-[color:var(--muted)]">
                  {config.client.title}
                </p>
                <h1 className="text-3xl font-semibold">Welcome back</h1>
                <p className="text-sm text-[color:var(--muted)]">
                  {user?.profile?.businessName ?? user?.email}
                </p>
                <p className="text-xs text-[color:var(--muted)]">{config.client.subtitle}</p>
              </div>
              <form action="/api/auth/logout" method="post">
                <button
                  type="submit"
                  className="rounded-full border border-[color:var(--line)] px-5 py-2 text-sm text-[color:var(--muted)] hover:border-[color:var(--accent)]"
                >
                  Log out
                </button>
              </form>
            </header>
          );
        }

        if (section === "uploads") {
          return (
            <UploadPanel
              key="uploads"
              uploads={uploadList}
              showQa={config.client.showQa}
              showPreview={config.client.showPreview}
            />
          );
        }

        return null;
      })}
    </main>
  );
}

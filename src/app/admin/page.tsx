import AdminClientList from "@/components/AdminClientList";
import { prisma } from "@/lib/db";
import { getEditorConfig } from "@/lib/editor";
import { requireSession } from "@/lib/session";

export default async function AdminPage() {
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

  const config = await getEditorConfig();

  const clients = await prisma.user.findMany({
    where: { role: "CLIENT" },
    include: {
      profile: true,
      uploads: { orderBy: { createdAt: "desc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  const clientList = clients.map((client) => ({
    id: client.id,
    email: client.email,
    createdAt: client.createdAt.toISOString(),
    profile: client.profile
      ? {
          businessName: client.profile.businessName,
          taxNumber: client.profile.taxNumber,
          vatNumber: client.profile.vatNumber,
          registrationNumber: client.profile.registrationNumber,
          contactName: client.profile.contactName,
          phone: client.profile.phone,
          address: client.profile.address,
        }
      : null,
    uploads: client.uploads.map((upload) => ({
      id: upload.id,
      originalName: upload.originalName,
      status: upload.status,
      createdAt: upload.createdAt.toISOString(),
      bankName: upload.bankName,
      warnings: upload.warnings,
      qaReport: upload.qaReport ?? null,
      previewPath: upload.previewPath ?? null,
    })),
  }));

  const sections = config.admin.sectionsOrder;

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12">
      {sections.map((section) => {
        if (section === "header") {
          return (
            <header key="header" className="mb-10 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-[color:var(--muted)]">
                  Prestige Accounting
                </p>
                <h1 className="text-3xl font-semibold">{config.admin.title}</h1>
                <p className="text-sm text-[color:var(--muted)]">{config.admin.subtitle}</p>
              </div>
              <div className="flex items-center gap-3">
                <a
                  href="/admin/editor"
                  className="rounded-full border border-[color:var(--accent)] px-4 py-2 text-sm text-[color:var(--accent)]"
                >
                  Open Editor
                </a>
                <form action="/api/auth/logout" method="post">
                  <button
                    type="submit"
                    className="rounded-full border border-[color:var(--line)] px-5 py-2 text-sm text-[color:var(--muted)] hover:border-[color:var(--accent)]"
                  >
                    Log out
                  </button>
                </form>
              </div>
            </header>
          );
        }

        if (section === "clients") {
          return (
            <AdminClientList
              key="clients"
              clients={clientList}
              showQa={config.admin.showQa}
              showPreview={config.admin.showPreview}
            />
          );
        }

        return null;
      })}
    </main>
  );
}

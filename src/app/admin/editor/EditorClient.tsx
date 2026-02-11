"use client";

import { useEffect, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const sectionLabels: Record<string, string> = {
  logo: "Logo + Name",
  login: "Login Form",
  signup: "Signup Form",
  header: "Page Header",
  uploads: "Uploads Panel",
  clients: "Client List",
};

type EditorConfig = {
  landing: {
    companyName: string;
    logoSize: number;
    showLogin: boolean;
    showSignup: boolean;
    sectionsOrder: Array<"logo" | "login" | "signup">;
    layout: "two-column" | "stack";
  };
  client: {
    title: string;
    subtitle: string;
    showQa: boolean;
    showPreview: boolean;
    sectionsOrder: Array<"header" | "uploads">;
  };
  admin: {
    title: string;
    subtitle: string;
    showQa: boolean;
    showPreview: boolean;
    sectionsOrder: Array<"header" | "clients">;
  };
};

type SortableItemProps = {
  id: string;
};

function SortableItem({ id }: SortableItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="flex items-center justify-between rounded-xl border border-[color:var(--line)] bg-[color:var(--panel)]/80 px-4 py-3 text-sm"
    >
      <span>{sectionLabels[id] ?? id}</span>
      <span className="text-xs text-[color:var(--muted)]">Drag</span>
    </div>
  );
}

export default function EditorClient() {
  const [config, setConfig] = useState<EditorConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor));

  useEffect(() => {
    fetch("/api/admin/editor")
      .then((res) => res.json())
      .then((data) => setConfig(data.config));
  }, []);

  const landingOrder = config?.landing.sectionsOrder ?? [];
  const clientOrder = config?.client.sectionsOrder ?? [];
  const adminOrder = config?.admin.sectionsOrder ?? [];

  function handleDragEnd(section: "landing" | "client" | "admin") {
    return (event: DragEndEvent) => {
      if (!config) return;
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const order: string[] =
        section === "landing"
          ? [...config.landing.sectionsOrder]
          : section === "client"
            ? [...config.client.sectionsOrder]
            : [...config.admin.sectionsOrder];

      const oldIndex = order.indexOf(active.id as string);
      const newIndex = order.indexOf(over.id as string);
      const nextOrder = arrayMove(order, oldIndex, newIndex);

      if (section === "landing") {
        setConfig({
          ...config,
          landing: {
            ...config.landing,
            sectionsOrder: nextOrder as EditorConfig["landing"]["sectionsOrder"],
          },
        });
        return;
      }

      if (section === "client") {
        setConfig({
          ...config,
          client: {
            ...config.client,
            sectionsOrder: nextOrder as EditorConfig["client"]["sectionsOrder"],
          },
        });
        return;
      }

      setConfig({
        ...config,
        admin: {
          ...config.admin,
          sectionsOrder: nextOrder as EditorConfig["admin"]["sectionsOrder"],
        },
      });
    };
  }

  async function saveChanges() {
    if (!config) return;
    setSaving(true);
    setStatus(null);
    const res = await fetch("/api/admin/editor", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config }),
    });
    if (!res.ok) {
      setStatus("Save failed.");
    } else {
      setStatus("Saved successfully.");
    }
    setSaving(false);
  }

  if (!config) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-16">
        <p className="text-sm text-[color:var(--muted)]">Loading editor...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-12">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-[color:var(--muted)]">
            Prestige Accounting
          </p>
          <h1 className="text-3xl font-semibold">Visual Editor</h1>
          <p className="text-sm text-[color:var(--muted)]">
            Drag sections to reorder and edit labels.
          </p>
        </div>
        <button
          type="button"
          onClick={saveChanges}
          disabled={saving}
          className="rounded-full bg-[color:var(--accent)] px-6 py-2 text-sm font-semibold text-black"
        >
          {saving ? "Saving..." : "Save changes"}
        </button>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="rounded-3xl border border-[color:var(--line)] bg-black/40 p-6">
          <h2 className="text-lg font-semibold">Landing page</h2>
          <div className="mt-4 space-y-4 text-sm">
            <label className="block">
              Company name
              <input
                className="mt-2 w-full rounded-xl border border-[color:var(--line)] bg-transparent px-3 py-2"
                value={config.landing.companyName}
                onChange={(event) =>
                  setConfig({
                    ...config,
                    landing: {
                      ...config.landing,
                      companyName: event.target.value,
                    },
                  })
                }
              />
            </label>
            <label className="block">
              Logo size (px)
              <input
                type="number"
                className="mt-2 w-full rounded-xl border border-[color:var(--line)] bg-transparent px-3 py-2"
                value={config.landing.logoSize}
                onChange={(event) =>
                  setConfig({
                    ...config,
                    landing: {
                      ...config.landing,
                      logoSize: Number(event.target.value),
                    },
                  })
                }
              />
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.landing.showLogin}
                onChange={(event) =>
                  setConfig({
                    ...config,
                    landing: {
                      ...config.landing,
                      showLogin: event.target.checked,
                    },
                  })
                }
              />
              Show login form
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.landing.showSignup}
                onChange={(event) =>
                  setConfig({
                    ...config,
                    landing: {
                      ...config.landing,
                      showSignup: event.target.checked,
                    },
                  })
                }
              />
              Show signup form
            </label>
            <label className="block">
              Layout
              <select
                className="mt-2 w-full rounded-xl border border-[color:var(--line)] bg-transparent px-3 py-2"
                value={config.landing.layout}
                onChange={(event) =>
                  setConfig({
                    ...config,
                    landing: {
                      ...config.landing,
                      layout: event.target.value as "two-column" | "stack",
                    },
                  })
                }
              >
                <option value="two-column">Two column</option>
                <option value="stack">Stack</option>
              </select>
            </label>
          </div>
          <div className="mt-6">
            <p className="mb-2 text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
              Section order
            </p>
            <DndContext sensors={sensors} onDragEnd={handleDragEnd("landing")}>
              <SortableContext
                items={landingOrder}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {landingOrder.map((id) => (
                    <SortableItem key={id} id={id} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        </section>

        <section className="rounded-3xl border border-[color:var(--line)] bg-black/40 p-6">
          <h2 className="text-lg font-semibold">Client page</h2>
          <div className="mt-4 space-y-4 text-sm">
            <label className="block">
              Title
              <input
                className="mt-2 w-full rounded-xl border border-[color:var(--line)] bg-transparent px-3 py-2"
                value={config.client.title}
                onChange={(event) =>
                  setConfig({
                    ...config,
                    client: { ...config.client, title: event.target.value },
                  })
                }
              />
            </label>
            <label className="block">
              Subtitle
              <input
                className="mt-2 w-full rounded-xl border border-[color:var(--line)] bg-transparent px-3 py-2"
                value={config.client.subtitle}
                onChange={(event) =>
                  setConfig({
                    ...config,
                    client: { ...config.client, subtitle: event.target.value },
                  })
                }
              />
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.client.showQa}
                onChange={(event) =>
                  setConfig({
                    ...config,
                    client: { ...config.client, showQa: event.target.checked },
                  })
                }
              />
              Show QA panel
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.client.showPreview}
                onChange={(event) =>
                  setConfig({
                    ...config,
                    client: {
                      ...config.client,
                      showPreview: event.target.checked,
                    },
                  })
                }
              />
              Show OCR preview
            </label>
          </div>
          <div className="mt-6">
            <p className="mb-2 text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
              Section order
            </p>
            <DndContext sensors={sensors} onDragEnd={handleDragEnd("client")}>
              <SortableContext
                items={clientOrder}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {clientOrder.map((id) => (
                    <SortableItem key={id} id={id} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        </section>

        <section className="rounded-3xl border border-[color:var(--line)] bg-black/40 p-6">
          <h2 className="text-lg font-semibold">Admin page</h2>
          <div className="mt-4 space-y-4 text-sm">
            <label className="block">
              Title
              <input
                className="mt-2 w-full rounded-xl border border-[color:var(--line)] bg-transparent px-3 py-2"
                value={config.admin.title}
                onChange={(event) =>
                  setConfig({
                    ...config,
                    admin: { ...config.admin, title: event.target.value },
                  })
                }
              />
            </label>
            <label className="block">
              Subtitle
              <input
                className="mt-2 w-full rounded-xl border border-[color:var(--line)] bg-transparent px-3 py-2"
                value={config.admin.subtitle}
                onChange={(event) =>
                  setConfig({
                    ...config,
                    admin: { ...config.admin, subtitle: event.target.value },
                  })
                }
              />
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.admin.showQa}
                onChange={(event) =>
                  setConfig({
                    ...config,
                    admin: { ...config.admin, showQa: event.target.checked },
                  })
                }
              />
              Show QA panel
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.admin.showPreview}
                onChange={(event) =>
                  setConfig({
                    ...config,
                    admin: { ...config.admin, showPreview: event.target.checked },
                  })
                }
              />
              Show OCR preview
            </label>
          </div>
          <div className="mt-6">
            <p className="mb-2 text-xs uppercase tracking-[0.3em] text-[color:var(--muted)]">
              Section order
            </p>
            <DndContext sensors={sensors} onDragEnd={handleDragEnd("admin")}>
              <SortableContext
                items={adminOrder}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {adminOrder.map((id) => (
                    <SortableItem key={id} id={id} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        </section>
      </div>

      {status ? (
        <p className="mt-6 text-sm text-[color:var(--accent)]">{status}</p>
      ) : null}
    </main>
  );
}

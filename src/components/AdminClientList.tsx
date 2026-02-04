"use client";

import { useState } from "react";

type QaReport = {
  method: "pdftotext" | "ocr" | "csv";
  pageCount?: number;
  totalLines?: number;
  matchedLines?: number;
  unmatchedLines?: number;
  transactions: number;
  debitTotal: number;
  creditTotal: number;
  balanceCount: number;
  sampleUnmatched?: string[];
  reconciliationNote?: string;
};

type Upload = {
  id: string;
  originalName: string;
  status: string;
  createdAt: string;
  bankName: string | null;
  warnings: string | null;
  qaReport?: QaReport | null;
  previewPath?: string | null;
};

type Profile = {
  businessName: string;
  taxNumber: string;
  vatNumber?: string | null;
  registrationNumber?: string | null;
  contactName?: string | null;
  phone?: string | null;
  address?: string | null;
};

type Client = {
  id: string;
  email: string;
  profile: Profile | null;
  uploads: Upload[];
  createdAt: string;
};

type Props = {
  clients: Client[];
  showQa: boolean;
  showPreview: boolean;
};

function formatMoney(value: number) {
  return value.toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function AdminClientList({
  clients,
  showQa,
  showPreview,
}: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [converting, setConverting] = useState<string | null>(null);

  async function handleConvert(uploadId: string) {
    setConverting(uploadId);
    await fetch(`/api/convert/${uploadId}`, { method: "POST" });
    setConverting(null);
    window.location.reload();
  }

  return (
    <div className="space-y-4">
      {clients.map((client) => {
        const isOpen = openId === client.id;
        return (
          <div
            key={client.id}
            className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)]/70"
          >
            <button
              type="button"
              onClick={() => setOpenId(isOpen ? null : client.id)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
            >
              <div>
                <p className="text-sm font-semibold text-white">
                  {client.profile?.businessName ?? "Unnamed business"}
                </p>
                <p className="text-xs text-[color:var(--muted)]">
                  {client.email} · {client.profile?.taxNumber ?? "Tax number pending"}
                </p>
              </div>
              <span className="text-xs text-[color:var(--accent)]">
                {client.uploads.length} file(s)
              </span>
            </button>

            {isOpen ? (
              <div className="border-t border-[color:var(--line)] px-5 py-4">
                <div className="grid gap-2 text-xs text-[color:var(--muted)] sm:grid-cols-2">
                  <p>
                    Contact: {client.profile?.contactName ?? "-"} · {client.profile?.phone ?? "-"}
                  </p>
                  <p>Address: {client.profile?.address ?? "-"}</p>
                  <p>VAT: {client.profile?.vatNumber ?? "-"}</p>
                  <p>Reg: {client.profile?.registrationNumber ?? "-"}</p>
                </div>
                <div className="mt-4 space-y-3">
                  {client.uploads.map((upload) => (
                    <div
                      key={upload.id}
                      className="rounded-xl border border-[color:var(--line)] bg-black/30 px-4 py-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm text-white">{upload.originalName}</p>
                          <p className="text-xs text-[color:var(--muted)]">
                            {upload.bankName ? `${upload.bankName} · ` : ""}
                            {new Date(upload.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-full border border-[color:var(--line)] px-3 py-1 text-xs">
                            {upload.status}
                          </span>
                          {upload.status === "UPLOADED" &&
                          upload.originalName.toLowerCase().endsWith(".pdf") ? (
                            <button
                              type="button"
                              onClick={() => handleConvert(upload.id)}
                              disabled={converting === upload.id}
                              className="rounded-full bg-[color:var(--accent)] px-3 py-1 text-xs font-semibold text-black"
                            >
                              {converting === upload.id
                                ? "Converting..."
                                : "Convert PDF to CSV"}
                            </button>
                          ) : null}
                          {upload.status === "CONVERTED" ? (
                            <a
                              href={`/api/download/${upload.id}`}
                              className="rounded-full border border-[color:var(--accent)] px-3 py-1 text-xs text-[color:var(--accent)]"
                            >
                              Download CSV
                            </a>
                          ) : null}
                        </div>
                      </div>
                      {showQa && upload.qaReport ? (
                        <div className="mt-3 rounded-xl border border-[color:var(--line)] bg-black/40 px-4 py-3 text-xs text-[color:var(--muted)]">
                          <div className="flex flex-wrap gap-4">
                            <span>QA method: {upload.qaReport.method}</span>
                            {upload.qaReport.pageCount ? (
                              <span>Pages: {upload.qaReport.pageCount}</span>
                            ) : null}
                            <span>Transactions: {upload.qaReport.transactions}</span>
                            <span>
                              Debit total: R {formatMoney(upload.qaReport.debitTotal)}
                            </span>
                            <span>
                              Credit total: R {formatMoney(upload.qaReport.creditTotal)}
                            </span>
                            {upload.qaReport.unmatchedLines !== undefined ? (
                              <span>
                                Unmatched lines: {upload.qaReport.unmatchedLines}
                              </span>
                            ) : null}
                            {upload.qaReport.reconciliationNote ? (
                              <span>{upload.qaReport.reconciliationNote}</span>
                            ) : null}
                          </div>
                        </div>
                      ) : null}
                      {showPreview && upload.previewPath ? (
                        <div className="mt-3 rounded-xl border border-[color:var(--line)] bg-black/50 p-3">
                          <p className="mb-2 text-xs text-[color:var(--muted)]">
                            OCR preview
                          </p>
                          <img
                            src={`/api/preview/${upload.id}`}
                            alt="OCR preview"
                            className="max-h-64 w-full rounded-lg object-contain"
                          />
                        </div>
                      ) : null}
                      {upload.warnings ? (
                        <p className="mt-2 text-xs text-[color:var(--accent)]">
                          {upload.warnings}
                        </p>
                      ) : null}
                    </div>
                  ))}
                  {!client.uploads.length ? (
                    <p className="text-xs text-[color:var(--muted)]">
                      No uploads yet.
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
      {!clients.length ? (
        <p className="text-sm text-[color:var(--muted)]">No clients yet.</p>
      ) : null}
    </div>
  );
}


"use client";
// UTF-8

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

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
  storedMime: string;
  status: "UPLOADED" | "CONVERTED" | "FAILED";
  warnings: string | null;
  bankName: string | null;
  transactions: number | null;
  createdAt: string;
  qaReport?: QaReport | null;
  previewPath?: string | null;
};

type Props = {
  uploads: Upload[];
  showQa: boolean;
  showPreview: boolean;
};

function formatMoney(value: number) {
  return value.toLocaleString("en-ZA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function UploadPanel({ uploads, showQa, showPreview }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [file, setFile] = useState<File | null>(null);
  const [bankName, setBankName] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [converting, setConverting] = useState<string | null>(null);

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setStatus("Please select a PDF or CSV file.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    if (bankName) {
      formData.append("bankName", bankName);
    }

    setStatus(null);
    const res = await fetch("/api/upload", { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok) {
      setStatus(data?.error ?? "Upload failed.");
      return;
    }
    setFile(null);
    setBankName("");
    startTransition(() => router.refresh());
  }

  async function handleConvert(uploadId: string) {
    setConverting(uploadId);
    const res = await fetch(`/api/convert/${uploadId}`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setStatus(data?.error ?? "Conversion failed.");
    }
    setConverting(null);
    startTransition(() => router.refresh());
  }

  return (
    <section className="space-y-6">
      <form
        onSubmit={handleUpload}
        className="rounded-3xl border border-[color:var(--line)] bg-[color:var(--panel)]/80 p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Upload bank statements</h2>
            <p className="text-sm text-[color:var(--muted)]">
              PDF or CSV files from any South African bank.
            </p>
          </div>
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-[color:var(--accent)] px-6 py-2 text-sm font-semibold text-black transition hover:bg-[color:var(--accent-strong)] disabled:opacity-60"
          >
            {pending ? "Uploading..." : "Upload"}
          </button>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-[1.5fr_1fr]">
          <label className="block text-sm">
            Statement file
            <input
              type="file"
              required
              accept=".pdf,.csv"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="mt-2 w-full rounded-xl border border-[color:var(--line)] bg-transparent px-4 py-3 text-sm text-white"
            />
          </label>
          <label className="block text-sm">
            Bank name (optional)
            <input
              type="text"
              value={bankName}
              onChange={(event) => setBankName(event.target.value)}
              placeholder="FNB, ABSA, Standard Bank"
              className="mt-2 w-full rounded-xl border border-[color:var(--line)] bg-transparent px-4 py-3 text-sm text-white"
            />
          </label>
        </div>
        {status ? (
          <p className="mt-4 text-sm text-[color:var(--accent)]">{status}</p>
        ) : null}
      </form>

      <div className="rounded-3xl border border-[color:var(--line)] bg-black/40 p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Recent uploads</h3>
          <p className="text-sm text-[color:var(--muted)]">
            {uploads.length} file(s)
          </p>
        </div>
        <div className="mt-4 space-y-4">
          {uploads.map((upload) => (
            <div
              key={upload.id}
              className="rounded-2xl border border-[color:var(--line)] bg-[color:var(--panel)]/60 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">
                    {upload.originalName}
                  </p>
                  <p className="text-xs text-[color:var(--muted)]">
                    {upload.bankName ? `${upload.bankName} · ` : ""}
                    {new Date(upload.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full border border-[color:var(--line)] px-3 py-1">
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
                      {converting === upload.id ? "Converting..." : "Convert PDF to CSV"}
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
                    <span>Debit total: R {formatMoney(upload.qaReport.debitTotal)}</span>
                    <span>Credit total: R {formatMoney(upload.qaReport.creditTotal)}</span>
                    {upload.qaReport.unmatchedLines !== undefined ? (
                      <span>Unmatched lines: {upload.qaReport.unmatchedLines}</span>
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
                <p className="mt-3 text-xs text-[color:var(--accent)]">
                  {upload.warnings}
                </p>
              ) : null}
            </div>
          ))}
          {!uploads.length ? (
            <p className="text-sm text-[color:var(--muted)]">
              No uploads yet. Add your first statement above.
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}




import type { QaReport } from "./types";

export type ConversionServiceResult = {
  csv: string;
  warnings: string[];
  qaReport: QaReport;
  transactions: number;
  pageCount: number;
  preview?: {
    bytes: Buffer;
    mime: string;
  };
};

function getConversionServiceUrl() {
  const raw = process.env.CONVERSION_SERVICE_URL?.trim();
  if (!raw) return null;
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

function isQaReport(value: unknown): value is QaReport {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  const method = record.method;
  return method === "pdftotext" || method === "ocr" || method === "csv";
}

export async function convertViaService(args: {
  fileName: string;
  fileBytes: Buffer;
  bankName?: string;
  uploadId: string;
}): Promise<ConversionServiceResult | null> {
  const baseUrl = getConversionServiceUrl();
  if (!baseUrl) return null;

  const form = new FormData();
  form.set(
    "file",
    new Blob([new Uint8Array(args.fileBytes)], { type: "application/pdf" }),
    args.fileName
  );
  form.set("uploadId", args.uploadId);
  if (args.bankName) {
    form.set("bankName", args.bankName);
  }

  const response = await fetch(`${baseUrl}/convert-pdf`, {
    method: "POST",
    headers: process.env.CONVERSION_SERVICE_TOKEN
      ? { Authorization: `Bearer ${process.env.CONVERSION_SERVICE_TOKEN}` }
      : undefined,
    body: form,
  });

  if (!response.ok) {
    throw new Error(`Conversion service failed: ${response.status} ${response.statusText}`);
  }

  const payload = (await response.json()) as Record<string, unknown>;
  if (typeof payload.csv !== "string") {
    throw new Error("Conversion service payload missing CSV.");
  }
  if (!isQaReport(payload.qaReport)) {
    throw new Error("Conversion service payload missing QA report.");
  }

  const warnings = Array.isArray(payload.warnings)
    ? payload.warnings.filter((item): item is string => typeof item === "string")
    : [];

  const previewBase64 =
    typeof payload.previewBase64 === "string" ? payload.previewBase64 : null;
  const previewMime =
    typeof payload.previewMime === "string" ? payload.previewMime : "image/png";

  return {
    csv: payload.csv,
    warnings,
    qaReport: payload.qaReport,
    transactions:
      typeof payload.transactions === "number"
        ? payload.transactions
        : payload.qaReport.transactions,
    pageCount:
      typeof payload.pageCount === "number"
        ? payload.pageCount
        : payload.qaReport.pageCount ?? 0,
    preview:
      previewBase64 !== null
        ? {
            bytes: Buffer.from(previewBase64, "base64"),
            mime: previewMime,
          }
        : undefined,
  };
}

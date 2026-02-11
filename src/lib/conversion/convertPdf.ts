import fs from "fs/promises";
import path from "path";
import { ensureStorage, previewsDir, tempDir } from "../storage";
import { runCommand } from "../process";
import { extractTransactionsFromText, transactionsToCsv } from "./normalize";
import type { QaReport } from "./types";

const DEFAULT_DPI = 300;
const BATCH_SIZE = 10;

type AggregateQa = {
  method: QaReport["method"];
  pageCount: number;
  totalLines: number;
  matchedLines: number;
  unmatchedLines: number;
  transactions: number;
  debitTotal: number;
  creditTotal: number;
  balanceCount: number;
  sampleUnmatched: string[];
  reconciliationNote?: string;
};

async function getPageCount(pdfPath: string) {
  const { stdout } = await runCommand("pdfinfo", [pdfPath]);
  const match = stdout.match(/Pages:\s+(\d+)/i);
  if (!match) {
    return 0;
  }
  return Number.parseInt(match[1], 10);
}

async function extractTextFromPdf(pdfPath: string) {
  const { stdout } = await runCommand("pdftotext", ["-layout", pdfPath, "-"]);
  return stdout;
}

function resolveTessdataPath() {
  if (process.env.TESSDATA_PREFIX) {
    return process.env.TESSDATA_PREFIX;
  }
  const userProfile = process.env.USERPROFILE ?? "";
  return path.join(userProfile, "scoop", "apps", "tesseract", "current", "tessdata");
}

async function ocrImage(imagePath: string) {
  const tessdata = resolveTessdataPath();
  const { stdout } = await runCommand(
    "tesseract",
    [imagePath, "stdout", "-l", "eng", "--psm", "6"],
    {
      env: { TESSDATA_PREFIX: tessdata },
    }
  );
  return stdout;
}

export async function convertPdfToCsv(
  pdfPath: string,
  options?: { maxPages?: number; uploadId?: string; bankName?: string }
) {
  await ensureStorage();
  const warnings: string[] = [];
  const transactions: ReturnType<typeof extractTransactionsFromText>["transactions"] = [];

  const pageCount = await getPageCount(pdfPath);
  if (!pageCount) {
    throw new Error("Unable to read PDF page count.");
  }
  const effectivePageCount = options?.maxPages
    ? Math.min(pageCount, options.maxPages)
    : pageCount;
  const pageLabelWidth = String(pageCount).length;

  let aggregateQa: AggregateQa = {
    method: "ocr" as const,
    pageCount,
    totalLines: 0,
    matchedLines: 0,
    unmatchedLines: 0,
    transactions: 0,
    debitTotal: 0,
    creditTotal: 0,
    balanceCount: 0,
    sampleUnmatched: [] as string[],
  };

  const directText = await extractTextFromPdf(pdfPath);
  const directResult = extractTransactionsFromText(
    directText,
    "pdftotext",
    options?.bankName
  );

  let previewPath: string | null = null;

  if (directResult.transactions.length >= 5) {
    transactions.push(...directResult.transactions);
    const qa = directResult.qaReport;
    aggregateQa = {
      method: qa.method,
      pageCount,
      totalLines: qa.totalLines ?? 0,
      matchedLines: qa.matchedLines ?? 0,
      unmatchedLines: qa.unmatchedLines ?? 0,
      transactions: qa.transactions,
      debitTotal: qa.debitTotal,
      creditTotal: qa.creditTotal,
      balanceCount: qa.balanceCount,
      sampleUnmatched: qa.sampleUnmatched ?? [],
      reconciliationNote: qa.reconciliationNote,
    };
    warnings.push(...directResult.warnings);
  } else {
    if (directResult.transactions.length > 0) {
      warnings.push("Low transaction count from text extraction; OCR fallback used.");
    }
    for (let start = 1; start <= effectivePageCount; start += BATCH_SIZE) {
      const end = Math.min(start + BATCH_SIZE - 1, effectivePageCount);
      const prefix = path.join(tempDir, `prestige-${Date.now()}-${start}`);

      await runCommand("pdftoppm", [
        "-f",
        `${start}`,
        "-l",
        `${end}`,
        "-r",
        `${DEFAULT_DPI}`,
        "-gray",
        "-png",
        pdfPath,
        prefix,
      ]);

      for (let page = start; page <= end; page += 1) {
        const pageLabel = String(page).padStart(pageLabelWidth, "0");
        const imagePath = `${prefix}-${pageLabel}.png`;
        try {
          if (!previewPath) {
            const previewName = `${options?.uploadId ?? "preview"}-${Date.now()}.png`;
            previewPath = path.join(previewsDir, previewName);
            await fs.copyFile(imagePath, previewPath);
          }

          const text = await ocrImage(imagePath);
          const result = extractTransactionsFromText(text, "ocr", options?.bankName);
          transactions.push(...result.transactions);
          warnings.push(...result.warnings.map((warn) => `Page ${page}: ${warn}`));

          aggregateQa.totalLines += result.qaReport.totalLines ?? 0;
          aggregateQa.matchedLines += result.qaReport.matchedLines ?? 0;
          aggregateQa.unmatchedLines += result.qaReport.unmatchedLines ?? 0;
          aggregateQa.transactions += result.qaReport.transactions;
          aggregateQa.debitTotal += result.qaReport.debitTotal;
          aggregateQa.creditTotal += result.qaReport.creditTotal;
          aggregateQa.balanceCount += result.qaReport.balanceCount;

          if (aggregateQa.sampleUnmatched.length < 6 && result.qaReport.sampleUnmatched) {
            aggregateQa.sampleUnmatched.push(...result.qaReport.sampleUnmatched);
            aggregateQa.sampleUnmatched = aggregateQa.sampleUnmatched.slice(0, 6);
          }
        } catch (error) {
          warnings.push(`Page ${page}: OCR failed. ${String(error)}`);
        } finally {
          await fs.rm(imagePath, { force: true });
        }
      }
    }
  }

  const qaReport = {
    ...aggregateQa,
    transactions: transactions.length,
    debitTotal: Number(aggregateQa.debitTotal.toFixed(2)),
    creditTotal: Number(aggregateQa.creditTotal.toFixed(2)),
    balanceCount: aggregateQa.balanceCount,
    pageCount,
  };

  if (qaReport.totalLines && qaReport.unmatchedLines !== undefined) {
    const ratio = qaReport.unmatchedLines / Math.max(qaReport.totalLines, 1);
    if (ratio > 0.45) {
      warnings.push("High unmatched line ratio; OCR may be unreliable.");
      qaReport.reconciliationNote = "High unmatched line ratio; OCR may be unreliable.";
    }
  }

  if (qaReport.transactions > 0) {
    const avgDebit = qaReport.debitTotal / Math.max(qaReport.transactions, 1);
    const avgCredit = qaReport.creditTotal / Math.max(qaReport.transactions, 1);
    if (avgDebit > 1000000 || avgCredit > 1000000) {
      warnings.push("Average transaction amount is unusually high; please review OCR.");
      qaReport.reconciliationNote = "Average transaction amount unusually high; review OCR.";
    }
    if (qaReport.debitTotal === 0 && qaReport.creditTotal === 0) {
      warnings.push("Totals are zero; statement may need manual review.");
      qaReport.reconciliationNote = "Totals are zero; statement may need manual review.";
    }
  }

  const csv = transactionsToCsv(transactions);

  return {
    csv,
    transactions: transactions.length,
    pageCount,
    warnings,
    qaReport,
    previewPath,
  };
}

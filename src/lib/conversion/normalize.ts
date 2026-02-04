import { stringify } from "csv-stringify/sync";
import { ConversionResult, Transaction, universalHeaders } from "./types";

const monthMap: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

const dateRegex =
  /\b(\d{2}[\/\-.]\d{2}[\/\-.]\d{2,4}|\d{4}[\/\-.]\d{2}[\/\-.]\d{2}|\d{2}\s?[A-Za-z]{3}\s?\d{2,4}|\d{2}\s?[A-Za-z]{3})\b/;

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function normalizeDate(raw: string) {
  const trimmed = raw.trim();
  const currentYear = new Date().getFullYear();
  if (/[A-Za-z]{3}/.test(trimmed)) {
    const parts = trimmed.replace(/\s+/g, " ").split(" ");
    const day = Number.parseInt(parts[0], 10);
    const month = monthMap[parts[1].slice(0, 3).toLowerCase()] ?? 0;
    let year = parts[2] ? Number.parseInt(parts[2], 10) : NaN;
    let guessed = false;

    if (!Number.isFinite(year)) {
      year = currentYear;
      guessed = true;
    } else if (year < 100) {
      year = 2000 + year;
    } else if (year >= 100 && year < 1000) {
      year = 2000 + (year % 100);
      guessed = true;
    }

    if (year > currentYear + 1) {
      year = currentYear;
      guessed = true;
    }

    return { date: `${year}-${pad(month)}-${pad(day)}`, guessed };
  }

  const cleaned = trimmed.replace(/\./g, "/").replace(/-/g, "/");
  const parts = cleaned.split("/");
  if (parts[0].length === 4) {
    return { date: `${parts[0]}-${parts[1]}-${parts[2]}`, guessed: false };
  }
  const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
  return { date: `${year}-${parts[1]}-${parts[0]}`, guessed: false };
}

function parseAmount(value: string) {
  let cleaned = value
    .replace(/\s/g, "")
    .replace(/[()]/g, "")
    .replace(/(CR|DR)$/i, "");

  if (!cleaned) return "";

  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");

  if (hasComma && !hasDot) {
    cleaned = cleaned.replace(/\./g, "");
    const lastComma = cleaned.lastIndexOf(",");
    cleaned =
      cleaned.slice(0, lastComma).replace(/,/g, "") +
      "." +
      cleaned.slice(lastComma + 1);
  } else if (hasComma && hasDot) {
    cleaned = cleaned.replace(/,/g, "");
  }

  const number = Number.parseFloat(cleaned);
  if (Number.isNaN(number)) {
    return "";
  }
  return number.toFixed(2);
}

function extractAmounts(line: string) {
  const amounts = line.match(
    /-?\d{1,3}(?:[ ,]\d{3})*(?:[.,]\d{2})|-?\d+[.,]\d{2}/g
  );
  return amounts ?? [];
}

function normalizeOcrText(text: string, bankName?: string) {
  let output = text.replace(/(\d)[\r\n]+(?=\d)/g, "$1");
  if (bankName?.toLowerCase().includes("absa")) {
    output = output
      .replace(/O(?=\d)/g, "0")
      .replace(/(?<=\d)O/g, "0")
      .replace(/I(?=\d)/g, "1")
      .replace(/(?<=\d)I/g, "1")
      .replace(/S(?=\d)/g, "5")
      .replace(/(?<=\d)S/g, "5");
  }
  return output;
}

export function extractTransactionsFromText(
  text: string,
  method: "pdftotext" | "ocr",
  bankName?: string
): ConversionResult {
  const warnings: string[] = [];
  const transactions: Transaction[] = [];
  const unmatchedSamples: string[] = [];

  const normalizedText = method === "ocr" ? normalizeOcrText(text, bankName) : text;
  const lines = normalizedText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  let current: Transaction | null = null;
  let matchedLines = 0;

  let debitTotal = 0;
  let creditTotal = 0;
  let balanceCount = 0;

  let skipUntil = -1;

  for (let i = 0; i < lines.length; i += 1) {
    if (i <= skipUntil) {
      continue;
    }

    const line = lines[i];
    if (/^page\s+\d+/i.test(line) || /statement/i.test(line)) {
      continue;
    }

    const dateMatch = line.match(dateRegex);
    if (dateMatch) {
      matchedLines += 1;
      const normalized = normalizeDate(dateMatch[1]);
      if (normalized.guessed) {
        warnings.push("Year missing or unclear; assumed current year.");
      }

      let afterDate = line.slice(dateMatch.index! + dateMatch[0].length).trim();
      let amounts = extractAmounts(afterDate);
      let descriptionSource = afterDate;

      if (amounts.length === 0) {
        const lookahead = [lines[i + 1], lines[i + 2]].filter(Boolean).join(" ");
        if (lookahead) {
          const combined = `${afterDate} ${lookahead}`.trim();
          const lookaheadAmounts = extractAmounts(combined);
          if (lookaheadAmounts.length > 0) {
            amounts = lookaheadAmounts;
            descriptionSource = combined;
            skipUntil = i + 1;
          }
        }
      }

      const description = descriptionSource
        .replace(/-?\d{1,3}(?:[ ,]\d{3})*(?:[.,]\d{2})|-?\d+[.,]\d{2}/g, "")
        .replace(/\s{2,}/g, " ")
        .trim();

      const debit =
        amounts.length >= 3 ? parseAmount(amounts[amounts.length - 3]) : "";
      const credit =
        amounts.length >= 3 ? parseAmount(amounts[amounts.length - 2]) : "";
      const balance =
        amounts.length >= 1 ? parseAmount(amounts[amounts.length - 1]) : "";

      const amount = amounts.length === 2 ? parseAmount(amounts[0]) : "";
      const amountIsCredit = /cr|credit/i.test(descriptionSource);

      let finalDebit = debit;
      let finalCredit = credit;

      if (finalDebit.startsWith("-")) {
        finalCredit = finalDebit.slice(1);
        finalDebit = "";
      }
      if (finalCredit.startsWith("-")) {
        finalDebit = finalCredit.slice(1);
        finalCredit = "";
      }

      if (amount) {
        if (amount.startsWith("-")) {
          finalDebit = amount.slice(1);
          finalCredit = "";
        } else if (amountIsCredit) {
          finalCredit = amount;
          finalDebit = "";
        } else {
          finalDebit = amount;
          finalCredit = "";
        }
      }

      const transaction: Transaction = {
        date: normalized.date,
        description: description || "Transaction",
        reference: "",
        debit: finalDebit,
        credit: finalCredit,
        balance,
        currency: "ZAR",
      };

      if (transaction.debit) {
        debitTotal += Number.parseFloat(transaction.debit);
      }
      if (transaction.credit) {
        creditTotal += Number.parseFloat(transaction.credit);
      }
      if (transaction.balance) {
        balanceCount += 1;
      }

      transactions.push(transaction);
      current = transaction;
    } else if (current) {
      if (line.length < 3) {
        continue;
      }
      current.description = `${current.description} ${line}`.trim();
    } else if (unmatchedSamples.length < 6) {
      unmatchedSamples.push(line);
    }
  }

  if (!transactions.length) {
    warnings.push("No transactions detected; check OCR quality or provide a clearer scan.");
  }

  const qaReport = {
    method,
    totalLines: lines.length,
    matchedLines,
    unmatchedLines: Math.max(lines.length - matchedLines, 0),
    transactions: transactions.length,
    debitTotal: Number(debitTotal.toFixed(2)),
    creditTotal: Number(creditTotal.toFixed(2)),
    balanceCount,
    sampleUnmatched: unmatchedSamples,
  };

  return { transactions, warnings, qaReport };
}

export function transactionsToCsv(transactions: Transaction[]) {
  return stringify(transactions, {
    header: true,
    columns: universalHeaders,
  });
}

import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import { ConversionResult, Transaction, universalHeaders } from "./types";

const headerAliases: Record<string, string[]> = {
  date: ["date", "transaction date", "posting date", "value date"],
  description: ["description", "details", "narrative", "transaction description"],
  reference: ["reference", "ref", "statement ref", "cheque"],
  debit: ["debit", "withdrawal", "paid out", "outflow"],
  credit: ["credit", "deposit", "paid in", "inflow"],
  amount: ["amount", "transaction amount"],
  balance: ["balance", "running balance"],
};

function normalizeHeader(header: string) {
  return header.toLowerCase().trim();
}

function mapHeaders(headers: string[]) {
  const map: Record<string, string | null> = {
    date: null,
    description: null,
    reference: null,
    debit: null,
    credit: null,
    amount: null,
    balance: null,
  };

  for (const header of headers) {
    const normalized = normalizeHeader(header);
    for (const [key, aliases] of Object.entries(headerAliases)) {
      if (aliases.includes(normalized)) {
        map[key] = header;
      }
    }
  }

  return map;
}

function parseAmount(value?: string) {
  if (!value) return "";
  const cleaned = value.replace(/,/g, "").trim();
  const number = Number.parseFloat(cleaned);
  if (Number.isNaN(number)) return "";
  return number.toFixed(2);
}

export function convertCsvToUniversal(csvText: string): ConversionResult & { csv: string } {
  const warnings: string[] = [];
  const records = parse(csvText, { columns: true, skip_empty_lines: true });
  if (!records.length) {
    return {
      csv: "",
      transactions: [],
      warnings: ["No rows found in CSV."],
      qaReport: {
        method: "csv",
        transactions: 0,
        debitTotal: 0,
        creditTotal: 0,
        balanceCount: 0,
      },
    };
  }

  const headers = Object.keys(records[0]);
  const headerMap = mapHeaders(headers);
  const transactions: Transaction[] = [];

  let debitTotal = 0;
  let creditTotal = 0;
  let balanceCount = 0;

  for (const row of records) {
    const date = headerMap.date ? row[headerMap.date] : "";
    const description = headerMap.description
      ? row[headerMap.description]
      : row[headers[0]];
    const reference = headerMap.reference ? row[headerMap.reference] : "";

    const debit = parseAmount(headerMap.debit ? row[headerMap.debit] : "");
    const credit = parseAmount(headerMap.credit ? row[headerMap.credit] : "");
    const amount = parseAmount(headerMap.amount ? row[headerMap.amount] : "");
    const balance = parseAmount(headerMap.balance ? row[headerMap.balance] : "");

    let finalDebit = debit;
    let finalCredit = credit;

    if (!debit && !credit && amount) {
      const number = Number.parseFloat(amount);
      if (number < 0) {
        finalDebit = Math.abs(number).toFixed(2);
      } else {
        finalCredit = number.toFixed(2);
      }
    }

    if (finalDebit) {
      debitTotal += Number.parseFloat(finalDebit);
    }
    if (finalCredit) {
      creditTotal += Number.parseFloat(finalCredit);
    }
    if (balance) {
      balanceCount += 1;
    }

    transactions.push({
      date,
      description,
      reference,
      debit: finalDebit,
      credit: finalCredit,
      balance,
      currency: "ZAR",
    });
  }

  if (!headerMap.date || !headerMap.description) {
    warnings.push("Some standard columns were missing; mapping may be incomplete.");
  }

  const csv = stringify(transactions, { header: true, columns: universalHeaders });

  return {
    csv,
    transactions,
    warnings,
    qaReport: {
      method: "csv",
      transactions: transactions.length,
      debitTotal: Number(debitTotal.toFixed(2)),
      creditTotal: Number(creditTotal.toFixed(2)),
      balanceCount,
    },
  };
}

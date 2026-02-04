export type Transaction = {
  date: string;
  description: string;
  reference: string;
  debit: string;
  credit: string;
  balance: string;
  currency: string;
};

export const universalHeaders = [
  "date",
  "description",
  "reference",
  "debit",
  "credit",
  "balance",
  "currency",
];

export type QaReport = {
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

export type ConversionResult = {
  transactions: Transaction[];
  warnings: string[];
  qaReport: QaReport;
};

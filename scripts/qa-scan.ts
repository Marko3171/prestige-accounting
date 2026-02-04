import { convertPdfToCsv } from "../src/lib/conversion/convertPdf";

const args = process.argv.slice(2);
const labelArg = args.find((arg) => arg.startsWith("--label="));
const fileArg = args.find((arg) => arg.startsWith("--file="));
const maxArg = args.find((arg) => arg.startsWith("--max="));

if (!labelArg || !fileArg) {
  console.log("Usage: node scripts/qa-scan.ts --label=ABSA --file=PATH --max=5");
  process.exit(1);
}

const label = labelArg.replace("--label=", "");
const file = fileArg.replace("--file=", "");
const maxPages = maxArg ? Number(maxArg.replace("--max=", "")) : undefined;

async function run() {
  console.log(`\n${label}`);
  try {
    const result = await convertPdfToCsv(file, { maxPages });
    console.log({
      method: result.qaReport.method,
      pageCount: result.qaReport.pageCount,
      transactions: result.qaReport.transactions,
      debitTotal: result.qaReport.debitTotal,
      creditTotal: result.qaReport.creditTotal,
      unmatchedLines: result.qaReport.unmatchedLines,
      warnings: result.warnings.length,
    });
  } catch (error) {
    console.log(`Failed: ${String(error)}`);
  }
}

run();

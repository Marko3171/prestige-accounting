import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const args = process.argv.slice(2);
const fileArg = args.find((arg) => arg.startsWith("--file="));

if (!fileArg) {
  console.log("Usage: node scripts/detect-dates-text.ts --file=PATH");
  process.exit(1);
}

const file = fileArg.replace("--file=", "");

async function run() {
  const { stdout } = await execFileAsync("pdftotext", [file, "-"]);
  const patterns = [
    /\b\d{2}[\/\-.]\d{2}[\/\-.]\d{2,4}\b/g,
    /\b\d{4}[\/\-.]\d{2}[\/\-.]\d{2}\b/g,
    /\b\d{2}\s?[A-Za-z]{3}\s?\d{2,4}\b/g,
    /\b\d{2}\s?[A-Za-z]{3}\b/g,
  ];

  const matches = new Set<string>();
  for (const pattern of patterns) {
    const found = stdout.match(pattern) || [];
    for (const item of found) {
      matches.add(item.trim());
    }
  }

  console.log({
    textLength: stdout.length,
    matchCount: matches.size,
    samples: Array.from(matches).slice(0, 12),
  });
}

run();

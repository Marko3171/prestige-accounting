import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const args = process.argv.slice(2);
const fileArg = args.find((arg) => arg.startsWith("--file="));

if (!fileArg) {
  console.log("Usage: node scripts/detect-amounts-text.ts --file=PATH");
  process.exit(1);
}

const file = fileArg.replace("--file=", "");

function maskDigits(token: string) {
  return token.replace(/\d/g, "#");
}

async function run() {
  const { stdout } = await execFileAsync("pdftotext", ["-layout", file, "-"]);
  const amounts = stdout.match(/-?[\d\s,\.]{3,}/g) || [];
  const masked = new Set<string>();
  for (const token of amounts) {
    const trimmed = token.trim();
    if (!trimmed) continue;
    if (!/[\d]/.test(trimmed)) continue;
    if (!/[\.,]/.test(trimmed)) continue;
    masked.add(maskDigits(trimmed));
  }

  console.log({
    textLength: stdout.length,
    patternCount: masked.size,
    samples: Array.from(masked).slice(0, 12),
  });
}

run();

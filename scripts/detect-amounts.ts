import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs/promises";

const execFileAsync = promisify(execFile);

const args = process.argv.slice(2);
const fileArg = args.find((arg) => arg.startsWith("--file="));
const pageArg = args.find((arg) => arg.startsWith("--page="));

if (!fileArg) {
  console.log("Usage: node scripts/detect-amounts.ts --file=PATH --page=1");
  process.exit(1);
}

const file = fileArg.replace("--file=", "");
const page = pageArg ? Number(pageArg.replace("--page=", "")) : 1;

function maskDigits(token: string) {
  return token.replace(/\d/g, "#");
}

async function run() {
  const tempDir = path.join(process.cwd(), "storage", "tmp");
  await fs.mkdir(tempDir, { recursive: true });
  const prefix = path.join(tempDir, `amount-${Date.now()}`);

  await execFileAsync("pdftoppm", [
    "-f",
    String(page),
    "-l",
    String(page),
    "-r",
    "300",
    "-gray",
    "-png",
    file,
    prefix,
  ]);

  const files = await fs.readdir(tempDir);
  const imageName = files.find((name) => name.startsWith(path.basename(prefix)));
  if (!imageName) {
    throw new Error("Image render failed.");
  }
  const imagePath = path.join(tempDir, imageName);

  const { stdout } = await execFileAsync("tesseract", [
    imagePath,
    "stdout",
    "-l",
    "eng",
    "--psm",
    "6",
  ], {
    env: {
      ...process.env,
      TESSDATA_PREFIX:
        process.env.TESSDATA_PREFIX ??
        path.join(process.env.USERPROFILE ?? "", "scoop", "apps", "tesseract", "current", "tessdata"),
    },
  });

  await fs.rm(imagePath, { force: true });

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
    patternCount: masked.size,
    samples: Array.from(masked).slice(0, 12),
  });
}

run();

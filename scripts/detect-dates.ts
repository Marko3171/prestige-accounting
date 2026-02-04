import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs/promises";

const execFileAsync = promisify(execFile);

const args = process.argv.slice(2);
const fileArg = args.find((arg) => arg.startsWith("--file="));
const pageArg = args.find((arg) => arg.startsWith("--page="));

if (!fileArg) {
  console.log("Usage: npx tsx scripts/detect-dates.ts --file=PATH --page=1");
  process.exit(1);
}

const file = fileArg.replace("--file=", "");
const page = pageArg ? Number(pageArg.replace("--page=", "")) : 1;

async function run() {
  const tempDir = path.join(process.cwd(), "storage", "tmp");
  await fs.mkdir(tempDir, { recursive: true });
  const prefix = path.join(tempDir, `sample-${Date.now()}`);

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
    matchCount: matches.size,
    samples: Array.from(matches).slice(0, 12),
  });
}

run();

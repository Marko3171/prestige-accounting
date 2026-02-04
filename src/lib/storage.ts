import path from "path";
import fs from "fs/promises";

export const storageRoot = path.join(process.cwd(), "storage");
export const uploadsDir = path.join(storageRoot, "uploads");
export const convertedDir = path.join(storageRoot, "converted");
export const tempDir = path.join(storageRoot, "tmp");
export const previewsDir = path.join(storageRoot, "previews");

export async function ensureStorage() {
  await fs.mkdir(uploadsDir, { recursive: true });
  await fs.mkdir(convertedDir, { recursive: true });
  await fs.mkdir(tempDir, { recursive: true });
  await fs.mkdir(previewsDir, { recursive: true });
}

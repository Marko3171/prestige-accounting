import path from "path";
import fs from "fs/promises";
import { del, put } from "@vercel/blob";

const BLOB_BASE_URL = ".public.blob.vercel-storage.com/";

export const storageRoot = path.join(process.cwd(), "storage");
export const uploadsDir = path.join(storageRoot, "uploads");
export const convertedDir = path.join(storageRoot, "converted");
export const tempDir = path.join(storageRoot, "tmp");
export const previewsDir = path.join(storageRoot, "previews");

export function isBlobStorageEnabled() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export function isBlobPath(storedPath: string) {
  return storedPath.includes(BLOB_BASE_URL);
}

function sanitizeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function ensureStorage() {
  await fs.mkdir(uploadsDir, { recursive: true });
  await fs.mkdir(convertedDir, { recursive: true });
  await fs.mkdir(tempDir, { recursive: true });
  await fs.mkdir(previewsDir, { recursive: true });
}

export async function storeBinary(
  folder: "uploads" | "converted" | "previews",
  fileName: string,
  data: Buffer,
  contentType: string
) {
  const safeName = sanitizeName(fileName);
  if (isBlobStorageEnabled()) {
    const key = `${folder}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
    const blob = await put(key, data, {
      access: "public",
      addRandomSuffix: false,
      contentType,
      allowOverwrite: false,
    });
    return blob.url;
  }

  await ensureStorage();
  const baseDir =
    folder === "uploads"
      ? uploadsDir
      : folder === "converted"
        ? convertedDir
        : previewsDir;
  const fullPath = path.join(baseDir, `${Date.now()}-${crypto.randomUUID()}-${safeName}`);
  await fs.writeFile(fullPath, data);
  return fullPath;
}

export async function readStoredBinary(storedPath: string) {
  if (isBlobPath(storedPath)) {
    const response = await fetch(storedPath);
    if (!response.ok) {
      throw new Error(`Blob read failed: ${response.status}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
  return fs.readFile(storedPath);
}

export async function removeStoredBinary(storedPath: string | null | undefined) {
  if (!storedPath) return;
  if (isBlobPath(storedPath)) {
    await del(storedPath);
    return;
  }
  await fs.rm(storedPath, { force: true });
}

export async function materializeStoredFile(storedPath: string, extension: string) {
  if (!isBlobPath(storedPath)) {
    return storedPath;
  }
  await ensureStorage();
  const tempPath = path.join(tempDir, `${crypto.randomUUID()}${extension}`);
  const data = await readStoredBinary(storedPath);
  await fs.writeFile(tempPath, data);
  return tempPath;
}

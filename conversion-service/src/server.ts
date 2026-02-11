import express from "express";
import multer from "multer";
import fs from "fs/promises";
import os from "os";
import path from "path";
import crypto from "crypto";
import { convertPdfToCsv } from "../../src/lib/conversion/convertPdf.ts";

const app = express();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: Number(process.env.MAX_FILE_SIZE_BYTES ?? 50 * 1024 * 1024) },
});

function getBearerToken(header: string | undefined) {
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/convert-pdf", upload.single("file"), async (req, res) => {
  const expectedToken = process.env.CONVERSION_SERVICE_TOKEN?.trim();
  if (expectedToken) {
    const provided = getBearerToken(req.header("authorization"));
    if (provided !== expectedToken) {
      return res.status(401).json({ error: "Unauthorized." });
    }
  }

  if (!req.file) {
    return res.status(400).json({ error: "No file provided." });
  }

  const uploadId = (req.body.uploadId as string | undefined)?.trim() || crypto.randomUUID();
  const bankName = (req.body.bankName as string | undefined)?.trim();
  const originalName = req.file.originalname || `${uploadId}.pdf`;
  const ext = path.extname(originalName).toLowerCase();
  if (ext !== ".pdf") {
    return res.status(400).json({ error: "Only PDF files are supported." });
  }

  const tempPdfPath = path.join(os.tmpdir(), `pa-${uploadId}-${Date.now()}.pdf`);

  try {
    await fs.writeFile(tempPdfPath, req.file.buffer);
    const result = await convertPdfToCsv(tempPdfPath, {
      uploadId,
      bankName,
    });

    let previewBase64: string | null = null;
    let previewMime: string | null = null;

    if (result.previewPath) {
      const previewBytes = await fs.readFile(result.previewPath);
      previewBase64 = previewBytes.toString("base64");
      previewMime = "image/png";
      await fs.rm(result.previewPath, { force: true });
    }

    return res.json({
      csv: result.csv,
      warnings: result.warnings,
      qaReport: result.qaReport,
      transactions: result.transactions,
      pageCount: result.pageCount,
      previewBase64,
      previewMime,
    });
  } catch (error) {
    return res.status(500).json({ error: String(error) });
  } finally {
    await fs.rm(tempPdfPath, { force: true });
  }
});

const port = Number(process.env.PORT ?? 8080);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`conversion-service listening on :${port}`);
});

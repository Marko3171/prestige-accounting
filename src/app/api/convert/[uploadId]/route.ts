import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import {
  ensureStorage,
  materializeStoredFile,
  readStoredBinary,
  storeBinary,
} from "@/lib/storage";
import { convertPdfToCsv } from "@/lib/conversion/convertPdf";
import { convertViaService } from "@/lib/conversion/service";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ uploadId: string }> }
) {
  const { uploadId } = await context.params;
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const upload = await prisma.upload.findUnique({
    where: { id: uploadId },
  });

  if (!upload) {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }

  if (session.role !== "ADMIN" && upload.userId !== session.userId) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  if (!upload.storedMime.includes("pdf") && !upload.originalName.endsWith(".pdf")) {
    return NextResponse.json({ error: "Only PDF conversion is supported." }, { status: 400 });
  }

  if (upload.status === "CONVERTED") {
    return NextResponse.json({ ok: true, already: true });
  }

  if (process.env.VERCEL && !process.env.CONVERSION_SERVICE_URL) {
    return NextResponse.json(
      {
        error:
          "PDF conversion service is not configured. Set CONVERSION_SERVICE_URL for Vercel deployments.",
      },
      { status: 503 }
    );
  }

  try {
    let conversion = await convertViaService({
      fileName: upload.originalName,
      fileBytes: await readStoredBinary(upload.storedPath),
      bankName: upload.bankName ?? undefined,
      uploadId: upload.id,
    });

    if (!conversion) {
      await ensureStorage();
      const localPdfPath = await materializeStoredFile(upload.storedPath, ".pdf");
      const result = await convertPdfToCsv(localPdfPath, {
        uploadId: upload.id,
        bankName: upload.bankName ?? undefined,
      });

      if (localPdfPath !== upload.storedPath) {
        await fs.rm(localPdfPath, { force: true });
      }

      let previewPath: string | null = null;
      let previewMime: string | null = null;
      if (result.previewPath) {
        const previewBuffer = await fs.readFile(result.previewPath);
        previewPath = await storeBinary(
          "previews",
          `${upload.id}-preview.png`,
          previewBuffer,
          "image/png"
        );
        previewMime = "image/png";
        await fs.rm(result.previewPath, { force: true });
      }

      conversion = {
        csv: result.csv,
        warnings: result.warnings,
        qaReport: result.qaReport,
        transactions: result.transactions,
        pageCount: result.pageCount,
        preview: previewPath
          ? {
              bytes: Buffer.alloc(0),
              mime: previewMime ?? "image/png",
            }
          : undefined,
      };

      const convertedPath = await storeBinary(
        "converted",
        `${upload.id}.csv`,
        Buffer.from(result.csv, "utf-8"),
        "text/csv"
      );

      await prisma.upload.update({
        where: { id: upload.id },
        data: {
          status: "CONVERTED",
          convertedPath,
          convertedMime: "text/csv",
          warnings: result.warnings.join("\n"),
          transactions: result.transactions,
          pageCount: result.pageCount,
          qaReport: result.qaReport,
          previewPath,
          previewMime,
        },
      });
      return NextResponse.json({ ok: true });
    }

    const convertedPath = await storeBinary(
      "converted",
      `${upload.id}.csv`,
      Buffer.from(conversion.csv, "utf-8"),
      "text/csv"
    );

    let previewPath: string | null = null;
    let previewMime: string | null = null;
    if (conversion.preview && conversion.preview.bytes.length > 0) {
      previewPath = await storeBinary(
        "previews",
        `${upload.id}-preview.png`,
        conversion.preview.bytes,
        conversion.preview.mime
      );
      previewMime = conversion.preview.mime;
    }

    await prisma.upload.update({
      where: { id: upload.id },
      data: {
        status: "CONVERTED",
        convertedPath,
        convertedMime: "text/csv",
        warnings: conversion.warnings.join("\n"),
        transactions: conversion.transactions,
        pageCount: conversion.pageCount,
        qaReport: conversion.qaReport,
        previewPath,
        previewMime,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    await prisma.upload.update({
      where: { id: upload.id },
      data: {
        status: "FAILED",
        warnings: String(error),
      },
    });
    return NextResponse.json({ error: "Conversion failed." }, { status: 500 });
  }
}

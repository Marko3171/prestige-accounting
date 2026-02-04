import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { convertedDir, ensureStorage } from "@/lib/storage";
import { convertPdfToCsv } from "@/lib/conversion/convertPdf";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: { uploadId: string } }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const upload = await prisma.upload.findUnique({
    where: { id: params.uploadId },
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

  await ensureStorage();

  try {
    const result = await convertPdfToCsv(upload.storedPath, {
      uploadId: upload.id,
      bankName: upload.bankName ?? undefined,
    });
    const convertedPath = path.join(convertedDir, `${upload.id}.csv`);
    await fs.writeFile(convertedPath, result.csv);

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
        previewPath: result.previewPath,
        previewMime: result.previewPath ? "image/png" : null,
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

import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { ensureStorage, uploadsDir, convertedDir } from "@/lib/storage";
import { convertCsvToUniversal } from "@/lib/conversion/convertCsv";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const bankName = formData.get("bankName")?.toString();

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  }

  const mime = file.type || "application/octet-stream";
  const isPdf = mime.includes("pdf") || file.name.toLowerCase().endsWith(".pdf");
  const isCsv = mime.includes("csv") || file.name.toLowerCase().endsWith(".csv");

  if (!isPdf && !isCsv) {
    return NextResponse.json({ error: "Only PDF or CSV files are allowed." }, { status: 400 });
  }

  await ensureStorage();
  const storedName = `${crypto.randomUUID()}-${file.name}`;
  const storedPath = path.join(uploadsDir, storedName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(storedPath, buffer);

  const upload = await prisma.upload.create({
    data: {
      userId: session.userId,
      originalName: file.name,
      storedPath,
      storedMime: mime,
      size: buffer.length,
      bankName: bankName?.trim() || null,
    },
  });

  if (isCsv) {
    const converted = convertCsvToUniversal(buffer.toString("utf-8"));
    const convertedPath = path.join(convertedDir, `${upload.id}.csv`);
    await fs.writeFile(convertedPath, converted.csv);
    await prisma.upload.update({
      where: { id: upload.id },
      data: {
        status: "CONVERTED",
        convertedPath,
        convertedMime: "text/csv",
        warnings: converted.warnings.join("\n"),
        transactions: converted.transactions.length,
        qaReport: converted.qaReport,
      },
    });
  }

  return NextResponse.json({ ok: true, uploadId: upload.id });
}

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { storeBinary } from "@/lib/storage";
import { convertCsvToUniversal } from "@/lib/conversion/convertCsv";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    if (process.env.VERCEL && !process.env.BLOB_READ_WRITE_TOKEN) {
      return NextResponse.json(
        {
          error:
            "File storage is not configured. Set BLOB_READ_WRITE_TOKEN in Vercel environment variables.",
        },
        { status: 503 }
      );
    }

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
      return NextResponse.json(
        { error: "Only PDF or CSV files are allowed." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const storedPath = await storeBinary("uploads", file.name, buffer, mime);

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
      const convertedPath = await storeBinary(
        "converted",
        `${upload.id}.csv`,
        Buffer.from(converted.csv, "utf-8"),
        "text/csv"
      );
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
  } catch (error) {
    return NextResponse.json(
      { error: `Upload failed: ${String(error)}` },
      { status: 500 }
    );
  }
}

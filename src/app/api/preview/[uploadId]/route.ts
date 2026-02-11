import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { readStoredBinary } from "@/lib/storage";

export const runtime = "nodejs";

export async function GET(
  request: Request,
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

  if (!upload || !upload.previewPath) {
    return NextResponse.json({ error: "Preview not found." }, { status: 404 });
  }

  if (session.role !== "ADMIN" && upload.userId !== session.userId) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const fileBuffer = await readStoredBinary(upload.previewPath);
  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Type": upload.previewMime ?? "image/png",
    },
  });
}

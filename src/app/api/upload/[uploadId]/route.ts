import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { removeStoredBinary } from "@/lib/storage";

export const runtime = "nodejs";

export async function DELETE(
  request: Request,
  context: { params: Promise<{ uploadId: string }> }
) {
  try {
    const { uploadId } = await context.params;
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const upload = await prisma.upload.findUnique({ where: { id: uploadId } });
    if (!upload) {
      return NextResponse.json({ error: "File not found." }, { status: 404 });
    }

    if (session.role !== "ADMIN" && upload.userId !== session.userId) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    await Promise.all([
      removeStoredBinary(upload.storedPath),
      removeStoredBinary(upload.convertedPath),
      removeStoredBinary(upload.previewPath),
    ]);

    await prisma.upload.delete({ where: { id: uploadId } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: `Delete failed: ${String(error)}` },
      { status: 500 }
    );
  }
}

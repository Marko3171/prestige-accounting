import { NextResponse } from "next/server";
import { getEditorConfig, saveEditorConfig } from "@/lib/editor";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const config = await getEditorConfig();
  return NextResponse.json({ config });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json();
  if (!body?.config) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  await saveEditorConfig(body.config);
  return NextResponse.json({ ok: true });
}

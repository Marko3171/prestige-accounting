import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { createSessionToken, hashPassword } from "@/lib/auth";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  businessName: z.string().min(2),
  taxNumber: z.string().min(3),
  vatNumber: z.string().optional(),
  registrationNumber: z.string().optional(),
  contactName: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
});

function isAdminEmail(email: string) {
  const list = process.env.ADMIN_EMAILS?.split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return list?.includes(email.toLowerCase()) ?? false;
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue?.path?.[0] ? String(issue.path[0]) : "details";
    return NextResponse.json(
      { error: `Invalid ${field}. Please check the form and try again.` },
      { status: 400 }
    );
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email already in use." }, { status: 409 });
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const role = isAdminEmail(email) ? "ADMIN" : "CLIENT";

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role,
      profile: {
        create: {
          businessName: parsed.data.businessName,
          taxNumber: parsed.data.taxNumber,
          vatNumber: parsed.data.vatNumber,
          registrationNumber: parsed.data.registrationNumber,
          contactName: parsed.data.contactName,
          phone: parsed.data.phone,
          address: parsed.data.address,
        },
      },
    },
  });

  const token = await createSessionToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  const response = NextResponse.json({ role: user.role });
  response.cookies.set("pa_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}

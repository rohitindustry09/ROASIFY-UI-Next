import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/session";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  const { name, value, options } = clearSessionCookie();
  response.cookies.set(name, value, options);
  return response;
}

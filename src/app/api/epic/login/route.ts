import { NextResponse } from "next/server";
import { z } from "zod";
import { EpicAuthError, loginWithAuthorizationCode, logoutEpic } from "@/lib/epic/auth";

const bodySchema = z.object({ code: z.string().min(1) });

export async function POST(req: Request) {
  const body = bodySchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "请粘贴授权码" }, { status: 400 });
  }
  try {
    const account = await loginWithAuthorizationCode(body.data.code);
    return NextResponse.json({ account });
  } catch (err) {
    const status = err instanceof EpicAuthError ? 400 : 502;
    const message = err instanceof Error ? err.message : "登录失败";
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE() {
  logoutEpic();
  return NextResponse.json({ ok: true });
}

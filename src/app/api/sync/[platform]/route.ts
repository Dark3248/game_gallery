import { NextResponse } from "next/server";
import { isPlatform, startSync } from "@/lib/sync/runner";

export async function POST(_req: Request, { params }: { params: Promise<{ platform: string }> }) {
  const { platform } = await params;
  if (!isPlatform(platform)) {
    return NextResponse.json({ error: "未知平台" }, { status: 404 });
  }
  return NextResponse.json({ run: startSync(platform) });
}

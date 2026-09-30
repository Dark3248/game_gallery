import { NextResponse } from "next/server";
import { deleteCategory } from "@/lib/categories";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id) || !deleteCategory(Number(id))) {
    return NextResponse.json({ error: "分类不存在" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

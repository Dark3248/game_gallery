import { NextResponse } from "next/server";
import { z } from "zod";
import { CategoryError, setGameCategories } from "@/lib/categories";

const bodySchema = z.object({ categoryIds: z.array(z.number().int().positive()).max(100) });

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ error: "游戏不存在" }, { status: 404 });
  }
  const body = bodySchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "参数错误" }, { status: 400 });
  }
  try {
    return NextResponse.json({ categoryIds: setGameCategories(Number(id), body.data.categoryIds) });
  } catch (err) {
    if (err instanceof CategoryError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    throw err;
  }
}

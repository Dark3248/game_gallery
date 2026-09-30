import { NextResponse } from "next/server";
import { z } from "zod";
import { CategoryError, createCategory } from "@/lib/categories";

const bodySchema = z.object({ name: z.string() });

export async function POST(req: Request) {
  const body = bodySchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "请输入分类名称" }, { status: 400 });
  }
  try {
    return NextResponse.json({ category: createCategory(body.data.name) });
  } catch (err) {
    if (err instanceof CategoryError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}

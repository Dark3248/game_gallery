import { NextResponse } from "next/server";
import { latestRun } from "@/lib/sync/runner";

export async function GET() {
  return NextResponse.json({
    steam: latestRun("steam"),
    epic: latestRun("epic"),
  });
}

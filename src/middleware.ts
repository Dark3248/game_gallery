import { NextResponse, type NextRequest } from "next/server";

const LOCAL_HOSTNAMES = new Set(["127.0.0.1", "localhost", "[::1]"]);

function isLocal(hostOrUrl: string | null, isUrl: boolean) {
  if (!hostOrUrl) return false;
  try {
    const hostname = new URL(isUrl ? hostOrUrl : `http://${hostOrUrl}`).hostname;
    return LOCAL_HOSTNAMES.has(hostname);
  } catch {
    return false;
  }
}

/**
 * The API is only meant for the local UI. Rejecting foreign Host headers blocks DNS
 * rebinding, and requiring a local Origin on writes blocks cross-site requests from
 * other pages open in the same browser.
 */
export function middleware(req: NextRequest) {
  if (!isLocal(req.headers.get("host"), false)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (req.method !== "GET" && req.method !== "HEAD" && !isLocal(req.headers.get("origin"), true)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};

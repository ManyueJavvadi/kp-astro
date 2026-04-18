import { NextRequest, NextResponse } from "next/server";

/**
 * Same-origin proxy to the Railway backend.
 *
 * Why: the browser in some networks / with certain extensions silently
 * blocks direct XHR to the Railway domain ("net::ERR_FAILED" with no
 * details visible to the app). A same-origin proxy sidesteps that —
 * the browser only sees calls to /api/proxy/* on its own domain.
 *
 * All methods forwarded. Authorization header + body pass through.
 */

const BACKEND =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8000";

async function forward(req: NextRequest, path: string[]) {
  const url = `${BACKEND.replace(/\/+$/, "")}/${path.join("/")}${req.nextUrl.search}`;

  const headers: Record<string, string> = {};
  req.headers.forEach((v, k) => {
    // Drop host/connection/etc. — fetch rebuilds them
    if (
      [
        "host",
        "connection",
        "content-length",
        "accept-encoding",
        "cookie",
      ].includes(k.toLowerCase())
    )
      return;
    headers[k] = v;
  });

  const body =
    req.method === "GET" || req.method === "HEAD" ? undefined : await req.arrayBuffer();

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method: req.method,
      headers,
      body,
      redirect: "manual",
    });
  } catch (e) {
    return NextResponse.json(
      { detail: "Proxy failed to reach backend", error: String(e) },
      { status: 502 }
    );
  }

  const buf = await upstream.arrayBuffer();
  const res = new NextResponse(buf, { status: upstream.status });
  upstream.headers.forEach((v, k) => {
    // Don't leak upstream CORS headers — this response is same-origin
    if (k.toLowerCase().startsWith("access-control-")) return;
    if (k.toLowerCase() === "content-encoding") return;
    res.headers.set(k, v);
  });
  return res;
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return forward(req, path);
}
export async function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return forward(req, path);
}
export async function PUT(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return forward(req, path);
}
export async function PATCH(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return forward(req, path);
}
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  return forward(req, path);
}

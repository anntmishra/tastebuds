import { NextResponse } from "next/server";
import { renderCoverJpeg } from "@/lib/cover-raster";

export const runtime = "nodejs";

/**
 * Rasterise a designed blend cover to a square JPEG. Isolated in a route
 * handler because it uses react-dom/server, which Next forbids in the
 * Server Component / "use server" import graph. No auth: it only turns the
 * given parameters into an image, no secrets involved.
 */
export async function POST(req: Request) {
  let body: {
    style?: string | null;
    pack?: string | null;
    name?: string;
    score?: number;
    covers?: string[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  const jpeg = await renderCoverJpeg({
    style: body.style ?? null,
    pack: body.pack ?? null,
    name: (body.name ?? "Taste Buds Blend").slice(0, 80),
    score: Number(body.score) || 0,
    covers: Array.isArray(body.covers) ? body.covers.slice(0, 4) : [],
  });

  if (!jpeg) return NextResponse.json({ error: "render failed" }, { status: 500 });

  return new NextResponse(new Uint8Array(jpeg), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "no-store",
    },
  });
}

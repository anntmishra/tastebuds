import { lookupPreview } from "@/lib/preview-source";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name")?.trim() ?? "";
  const artist = searchParams.get("artist")?.trim() ?? "";

  const url = name ? await lookupPreview(name, artist) : null;

  return new Response(JSON.stringify({ url }), {
    headers: {
      "content-type": "application/json",
      // previews never change — let the browser + CDN keep them
      "cache-control": "public, max-age=604800, s-maxage=604800",
    },
  });
}

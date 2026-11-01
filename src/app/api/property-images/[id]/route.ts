import { NextResponse, type NextRequest } from "next/server";
import { ensureSchema, getSql } from "@/lib/server/db";
import { serverErrorResponse } from "@/lib/server/session";

export const runtime = "nodejs";

/**
 * Serves listing photos stored in Neon. Image ids are random and an image
 * never changes once uploaded, so responses can be cached indefinitely.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^img_[\w-]{8,40}$/.test(id)) {
    return NextResponse.json({ message: "Image not found" }, { status: 404 });
  }

  try {
    await ensureSchema();
    const rows = (await getSql()`
      SELECT content_type, encode(data, 'base64') AS data
      FROM property_images
      WHERE id = ${id}
      LIMIT 1
    `) as { content_type: string; data: string }[];

    if (!rows[0]) {
      return NextResponse.json({ message: "Image not found" }, { status: 404 });
    }

    return new NextResponse(Buffer.from(rows[0].data, "base64"), {
      headers: {
        "Content-Type": rows[0].content_type,
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return serverErrorResponse("property-images", error);
  }
}

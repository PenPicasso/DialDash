import data from "@/data/nodes.json";

export const dynamic = "force-static";

export function GET() {
  return Response.json(data, {
    headers: {
      "Cache-Control": "public, max-age=0, s-maxage=300, stale-while-revalidate=86400",
    },
  });
}

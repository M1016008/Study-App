import { listRuns } from "@/lib/scout/store";

export const runtime = "nodejs";

export async function GET() {
  const runs = await listRuns();
  return Response.json({ runs });
}

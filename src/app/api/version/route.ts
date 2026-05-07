// src/app/api/version/route.ts
export const dynamic = 'force-dynamic';

export async function GET() {
  return new Response(JSON.stringify({ version: "v2-fixed-maxduration-stripped" }), {
    headers: { 'Content-Type': 'application/json' }
  });
}

import tools from '@/data/tools.json';
export async function GET() {
  return new Response(JSON.stringify({ tools }), { headers: { 'content-type': 'application/json' } });
}

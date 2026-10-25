// This is a browser key, not a server credential. Restrict it to the portfolio
// and Android WebView origin, the Maps/Places/Routes APIs, and explicit quotas.
export const dynamic = 'force-dynamic';
export async function GET() {
  const key = process.env.BOOTHY_GOOGLE_MAPS_BROWSER_KEY || '';
  return Response.json({ provider: key ? 'google' : 'osm', browserKey: key, region: 'NG' }, {
    headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': 'https://appassets.androidplatform.net' }
  });
}

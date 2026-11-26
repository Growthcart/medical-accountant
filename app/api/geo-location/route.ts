import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';

// Visitor location from Cloudflare's request.cf (country code, city, region code). Unknown outside Cloudflare (local `next dev` without the dev proxy).
export async function GET(request: Request) {
  const cf = getCloudflareContext().cf;
  const country = (cf?.country as string | undefined) || request.headers.get('cf-ipcountry') || 'US';
  const city = (cf?.city as string | undefined) || '';
  const region = (cf?.regionCode as string | undefined) || '';
  return NextResponse.json({ country, city, region });
}

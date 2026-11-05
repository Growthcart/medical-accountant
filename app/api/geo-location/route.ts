import { NextRequest, NextResponse } from 'next/server';


export async function GET(request: NextRequest) {
  const country = request.headers.get('x-vercel-ip-country') || 'US';
  const city = decodeURIComponent(request.headers.get('x-vercel-ip-city') || '');
  const region = request.headers.get('x-vercel-ip-country-region') || '';
  return NextResponse.json({ country, city, region });
}

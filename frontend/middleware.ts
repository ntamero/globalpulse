import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Simple language detection - store in cookie for future use
  const response = NextResponse.next();

  if (!request.cookies.get('locale')) {
    const acceptLang = request.headers.get('accept-language') || 'en';
    const primaryLang = acceptLang.split(',')[0].split('-')[0].toLowerCase();
    const supported = ['en', 'tr', 'ar', 'fr', 'de', 'es', 'zh', 'ru'];
    const locale = supported.includes(primaryLang) ? primaryLang : 'en';
    response.cookies.set('locale', locale, { maxAge: 86400 * 365 });
  }

  return response;
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)',],
};

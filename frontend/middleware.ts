import { NextResponse } from '@vercel/edge';
import type { NextRequest } from '@vercel/edge';

const BOT_AGENTS = [
  'twitterbot',
  'facebookexternalhit',
  'discordbot',
  'telegrambot',
  'whatsapp',
  'slackbot',
  'googlebot',
  'linkedinbot',
  'embedly',
  'quora link preview',
  'showyoubot',
  'outbrain',
  'pinterest/0.',
  'developers.google.com/+/web/snippet',
  'slack-imgproxy',
  'vkShare',
  'W3C_Validator',
  'redditbot',
  'Applebot',
];

export function middleware(request: NextRequest) {
  const userAgent = request.headers.get('user-agent')?.toLowerCase() || '';
  const isBot = BOT_AGENTS.some((bot) => userAgent.includes(bot));
  
  const { pathname } = request.nextUrl;

  // Only intercept public note routes for bots
  if (isBot && pathname.startsWith('/public/note/')) {
    const shareToken = pathname.split('/').pop();
    if (shareToken) {
      // Rewrite to the API proxy
      const url = request.nextUrl.clone();
      url.pathname = '/api/og-proxy';
      url.searchParams.set('token', shareToken);
      return NextResponse.rewrite(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/public/note/:path*'],
};

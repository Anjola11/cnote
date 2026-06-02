class NextResponse {
  static next() {
    return new Response(null, {
      headers: {
        'x-middleware-next': '1',
      },
    });
  }
}

export default async function middleware(request: Request) {
  const url = new URL(request.url);

  // 1. Double check pathname matches only /public/note/
  if (!url.pathname.startsWith('/public/note/')) {
    return NextResponse.next();
  }

  // 2. Detect crawlers (case-insensitive checks)
  const userAgent = request.headers.get('user-agent') || '';
  const crawlerKeywords = [
    'whatsapp',
    'facebookexternalhit',
    'twitterbot',
    'telegrambot',
    'linkedinbot',
    'slackbot',
    'discordbot',
  ];

  const isCrawler = crawlerKeywords.some((keyword) =>
    userAgent.toLowerCase().includes(keyword)
  );

  // 3. Non-crawler request -> pass through to React App
  if (!isCrawler) {
    return NextResponse.next();
  }

  // 4. Crawler request -> Extract shareToken
  const pathParts = url.pathname.split('/');
  const shareToken = pathParts[3]; // format: /public/note/:shareToken
  if (!shareToken) {
    return NextResponse.next();
  }

  // 5. Fetch public note metadata from backend API
  let backendUrl = process.env.VITE_API_URL || 'https://cnote-backend.herokuapp.com/api/v1';
  if (backendUrl.endsWith('/')) {
    backendUrl = backendUrl.slice(0, -1);
  }

  const metaUrl = `${backendUrl}/public/notes/${shareToken}/meta`;

  let metadata: { title: string; excerpt: string; coverImageUrl: string | null } | null = null;
  try {
    const metaResponse = await fetch(metaUrl);
    if (metaResponse.ok) {
      const json = await metaResponse.json();
      metadata = json.data || json;
    }
  } catch (error) {
    // Fail silently and fall through to the React App
  }

  // If fetch failed or metadata is invalid -> fall through
  if (!metadata || !metadata.title) {
    return NextResponse.next();
  }

  // 6. Read the static index.html and inject OG/Twitter tags
  try {
    const htmlResponse = await fetch(`${url.origin}/index.html`);
    if (!htmlResponse.ok) {
      return NextResponse.next();
    }
    const html = await htmlResponse.text();

    const title = metadata.title;
    const excerpt = metadata.excerpt || 'A public note on Cnote.';
    const coverImageUrl = metadata.coverImageUrl || 'https://www.usecnote.xyz/og-image.png';

    // Strip any existing title, og:* and twitter:* tags to prevent duplication
    let modifiedHtml = html
      .replace(/<title>.*?<\/title>/gi, '')
      .replace(/<meta\s+property="og:[^>]+>/gi, '')
      .replace(/<meta\s+name="twitter:[^>]+>/gi, '');

    const escapeHtml = (str: string) => {
      return str
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    };

    const newTags = `
    <title>${escapeHtml(title)} | Cnote</title>
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta property="og:description" content="${escapeHtml(excerpt)}" />
    <meta property="og:image" content="${escapeHtml(coverImageUrl)}" />
    <meta property="og:url" content="https://www.usecnote.xyz/public/note/${shareToken}" />
    <meta property="og:type" content="article" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(excerpt)}" />
    <meta name="twitter:image" content="${escapeHtml(coverImageUrl)}" />`;

    modifiedHtml = modifiedHtml.replace('</head>', `${newTags}\n  </head>`);

    return new Response(modifiedHtml, {
      headers: {
        'content-type': 'text/html; charset=utf-8',
      },
    });
  } catch (error) {
    // Fall through if reading index.html fails
    return NextResponse.next();
  }
}

export const config = {
  matcher: ['/public/note/:shareToken*'],
};

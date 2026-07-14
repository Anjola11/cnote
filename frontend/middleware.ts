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

  const isNote = url.pathname.startsWith('/public/note/');
  const isForm = url.pathname.startsWith('/public/forms/');

  if (!isNote && !isForm) {
    return NextResponse.next();
  }

  // Detect crawlers (case-insensitive checks)
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

  // Non-crawler request -> pass through to React App
  if (!isCrawler) {
    return NextResponse.next();
  }

  // Crawler request -> Extract token / ID
  const pathParts = url.pathname.split('/');
  const tokenOrId = pathParts[3]; // format: /public/note/:shareToken or /public/forms/:id
  if (!tokenOrId) {
    return NextResponse.next();
  }

  // Fetch metadata from backend API
  let backendUrl = process.env.VITE_API_URL || 'https://cnote-backend.herokuapp.com/api/v1';
  if (backendUrl.endsWith('/')) {
    backendUrl = backendUrl.slice(0, -1);
  }

  let title = '';
  let excerpt = '';
  let coverImageUrl = '';

  if (isNote) {
    const metaUrl = `${backendUrl}/public/notes/${tokenOrId}/meta`;
    try {
      const metaResponse = await fetch(metaUrl);
      if (metaResponse.ok) {
        const json = await metaResponse.json();
        const metadata = json.data || json;
        title = metadata.title;
        excerpt = metadata.excerpt || 'A public note on Cnote.';
        coverImageUrl = metadata.coverImageUrl || 'https://www.usecnote.xyz/og-image.png';
      }
    } catch (error) {
      // Fail silently and fall through
    }
  } else {
    // Form path
    const metaUrl = `${backendUrl}/public/forms/${tokenOrId}`;
    try {
      const metaResponse = await fetch(metaUrl);
      if (metaResponse.ok) {
        const json = await metaResponse.json();
        const formObj = json.data || json;
        title = formObj.title;
        excerpt = formObj.description || 'Fill out this form on Cnote.';
        coverImageUrl = formObj.logo_url || 'https://www.usecnote.xyz/og-image.png';
      }
    } catch (error) {
      // Fail silently and fall through
    }
  }

  // If fetch failed or metadata is invalid -> fall through
  if (!title) {
    return NextResponse.next();
  }

  // Read the static index.html and inject OG/Twitter tags
  try {
    const htmlResponse = await fetch(`${url.origin}/index.html`);
    if (!htmlResponse.ok) {
      return NextResponse.next();
    }
    const html = await htmlResponse.text();

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
    <meta property="og:url" content="https://www.usecnote.xyz${url.pathname}" />
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
  matcher: ['/public/note/:shareToken*', '/public/forms/:id*'],
};

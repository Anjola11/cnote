import type { IncomingMessage, ServerResponse } from 'http';

const SITE_URL = process.env.VITE_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://www.usecnote.xyz';
const API_URL = process.env.VITE_API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://www.usecnote.xyz/api/v1';

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeJsonLd(jsonObj: any): string {
  return JSON.stringify(jsonObj).replace(/</g, '\\u003c');
}

export default async function handler(req: any, res: any) {
  const query = req.query || {};
  const type = query.type;
  const shareToken = query.shareToken;
  const formId = query.id;

  const itemType = Array.isArray(type) ? type[0] : type;
  const token = Array.isArray(shareToken) ? shareToken[0] : shareToken;
  const id = Array.isArray(formId) ? formId[0] : formId;

  let statusCode = 200;
  let title = 'Cnote - Write freely. Think clearly.';
  let description = 'A private, beautiful space for the code you write, the verses that move you, and the thoughts you want to keep.';
  let canonicalUrl = `${SITE_URL}/`;
  let ogImage = `${SITE_URL}/og-image.png`;
  let ogType = 'website';
  let jsonLdData: any = null;
  let isNoIndex = false;

  if (itemType === 'note' && token) {
    canonicalUrl = `${SITE_URL}/public/note/${token}`;
    ogImage = `${SITE_URL}/og-image.png`;
    ogType = 'article';

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const apiRes = await fetch(`${API_URL}/public/seo/note/${token}`, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
      });
      clearTimeout(timeoutId);

      if (apiRes.status === 404) {
        statusCode = 404;
        isNoIndex = true;
        title = `Note Not Found | Cnote`;
        description = `The requested note was not found or is no longer shared publicly on Cnote.`;
      } else if (apiRes.ok) {
        const body = await apiRes.json();
        const data = body.data;
        if (data) {
          const rawTitle = data.title || 'Untitled Note';
          title = `${rawTitle} | Cnote`;
          description = data.description || description;

          jsonLdData = {
            '@context': 'https://schema.org',
            '@type': 'Article',
            'headline': rawTitle,
            'description': description,
            'mainEntityOfPage': canonicalUrl,
            'datePublished': data.created_at,
            'dateModified': data.updated_at || data.created_at,
            'publisher': {
              '@type': 'Organization',
              'name': 'Cnote',
              'url': SITE_URL,
            },
          };
        }
      }
    } catch (err) {
      title = `Shared Note | Cnote`;
    }
  } else if (itemType === 'form' && id) {
    canonicalUrl = `${SITE_URL}/public/forms/${id}`;
    ogImage = `${SITE_URL}/og-image.png`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const apiRes = await fetch(`${API_URL}/public/seo/form/${id}`, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
      });
      clearTimeout(timeoutId);

      if (apiRes.status === 404) {
        statusCode = 404;
        isNoIndex = true;
        title = `Form Not Found | Cnote`;
        description = `The requested form was not found or is no longer accepting responses.`;
      } else if (apiRes.ok) {
        const body = await apiRes.json();
        const data = body.data;
        if (data) {
          const rawTitle = data.title || 'Untitled Form';
          title = `${rawTitle} | Cnote`;
          description = data.description || 'Fill out this form on Cnote.';

          if (data.logo_url) {
            ogImage = data.logo_url;
          }

          jsonLdData = {
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            'name': rawTitle,
            'description': description,
            'url': canonicalUrl,
            'publisher': {
              '@type': 'Organization',
              'name': 'Cnote',
              'url': SITE_URL,
            },
          };
        }
      }
    } catch (err) {
      title = `Shared Form | Cnote`;
    }
  }

  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);
  const safeCanonical = escapeHtml(canonicalUrl);
  const safeOgImage = escapeHtml(ogImage);

  let metaTagsHtml = `
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDescription}" />
  <link rel="canonical" href="${safeCanonical}" />
  <meta property="og:title" content="${safeTitle}" />
  <meta property="og:description" content="${safeDescription}" />
  <meta property="og:url" content="${safeCanonical}" />
  <meta property="og:site_name" content="Cnote" />
  <meta property="og:type" content="${ogType}" />
  <meta property="og:image" content="${safeOgImage}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${safeTitle}" />
  <meta name="twitter:description" content="${safeDescription}" />
  <meta name="twitter:image" content="${safeOgImage}" />
`;

  if (isNoIndex) {
    metaTagsHtml += `\n  <meta name="robots" content="noindex, nofollow" />`;
  }

  if (jsonLdData) {
    metaTagsHtml += `\n  <script type="application/ld+json">${escapeJsonLd(jsonLdData)}</script>`;
  }

  const finalHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  ${metaTagsHtml.trim()}
</head>
<body>
  <div id="root"></div>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400');
  if (isNoIndex) {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  }

  if (res.status && typeof res.status === 'function') {
    res.status(statusCode);
  } else {
    res.statusCode = statusCode;
  }

  if (res.send && typeof res.send === 'function') {
    return res.send(finalHtml);
  }
  return res.end(finalHtml);
}

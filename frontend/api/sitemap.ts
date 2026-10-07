const SITE_URL = process.env.VITE_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://www.usecnote.xyz';
const API_URL = process.env.VITE_API_URL || process.env.NEXT_PUBLIC_API_URL || 'https://www.usecnote.xyz/api/v1';

export default async function handler(req: any, res: any) {
  const currentDate = new Date().toISOString();

  let dynamicEntries: any[] = [];

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const apiRes = await fetch(`${API_URL}/public/seo/sitemap-entries`, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
    });
    clearTimeout(timeoutId);

    if (apiRes.ok) {
      const json = await apiRes.json();
      dynamicEntries = json.data || [];
    }
  } catch (err) {
    console.error('Failed to fetch sitemap entries from backend:', err);
  }

  const staticUrls = [
    { url: `${SITE_URL}`, priority: '1.0', changefreq: 'daily', lastmod: currentDate },
  ];

  const dynamicUrls = dynamicEntries.map((item) => {
    const path = item.type === 'note' ? `/public/note/${item.identifier}` : `/public/forms/${item.identifier}`;
    return {
      url: `${SITE_URL}${path}`,
      priority: '0.7',
      changefreq: 'weekly',
      lastmod: item.updated_at ? new Date(item.updated_at).toISOString() : currentDate,
    };
  });

  const allUrls = [...staticUrls, ...dynamicUrls];

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allUrls
  .map(
    (entry) => `  <url>
    <loc>${entry.url}</loc>
    <lastmod>${entry.lastmod}</lastmod>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`;

  res.setHeader('Content-Type', 'text/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');

  if (res.status && typeof res.status === 'function') {
    res.status(200);
  } else {
    res.statusCode = 200;
  }

  if (res.send && typeof res.send === 'function') {
    return res.send(sitemapXml);
  }
  return res.end(sitemapXml);
}

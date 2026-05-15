import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

const API_URL = process.env.VITE_API_URL || 'https://cnote-backend.herokuapp.com/api/v1';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { token } = req.query;

  if (!token || typeof token !== 'string') {
    return res.status(400).send('Missing token');
  }

  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['host'];
  const origin = `${protocol}://${host}`;
  const fullUrl = `${origin}/public/note/${token}`;

  try {
    // 1. Fetch metadata and index.html in parallel for speed
    const [metaResponse, htmlResponse] = await Promise.all([
      axios.get(`${API_URL}/public/notes/${token}/meta`).catch(() => null),
      axios.get(`${origin}/index.html`)
    ]);

    let html = htmlResponse.data;
    const meta = metaResponse?.data?.data;

    // 2. Inject Tags
    if (meta) {
      const fullTitle = `${meta.title} | Cnote`;
      const excerpt = meta.excerpt;

      html = html.replace(/<title>.*?<\/title>/g, `<title>${fullTitle}</title>`);
      html = html.replace(/<meta name="description" content=".*?" \/>/g, `<meta name="description" content="${excerpt}" />`);
      
      // OG Tags
      html = html.replace(/<meta property="og:title" content=".*?" \/>/g, `<meta property="og:title" content="${fullTitle}" />`);
      html = html.replace(/<meta property="og:description" content=".*?" \/>/g, `<meta property="og:description" content="${excerpt}" />`);
      html = html.replace(/<meta property="og:url" content=".*?" \/>/g, `<meta property="og:url" content="${fullUrl}" />`);

      // Twitter Tags
      html = html.replace(/<meta name="twitter:title" content=".*?" \/>/g, `<meta name="twitter:title" content="${fullTitle}" />`);
      html = html.replace(/<meta name="twitter:description" content=".*?" \/>/g, `<meta name="twitter:description" content="${excerpt}" />`);
      html = html.replace(/<meta name="twitter:url" content=".*?" \/>/g, `<meta name="twitter:url" content="${fullUrl}" />`);
    }

    // 3. CRITICAL: Inject Robots Noindex for all public note routes
    html = html.replace(/<meta name="robots" content=".*?" \/>/g, '<meta name="robots" content="noindex, nofollow" />');

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    return res.status(200).send(html);

  } catch (error) {
    console.error('OG Proxy Error:', error);
    
    // Final fallback: return the original index.html but ALWAYS inject noindex
    try {
      const htmlResponse = await axios.get(`${origin}/index.html`);
      let html = htmlResponse.data;
      html = html.replace(/<meta name="robots" content=".*?" \/>/g, '<meta name="robots" content="noindex, nofollow" />');
      res.setHeader('Content-Type', 'text/html');
      return res.status(200).send(html);
    } catch (fallbackError) {
      return res.status(500).send('Internal Server Error');
    }
  }
}

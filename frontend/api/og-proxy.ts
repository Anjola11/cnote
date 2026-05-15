import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

const API_URL = process.env.VITE_API_URL || 'https://cnote-backend.herokuapp.com/api/v1';
const BASE_URL = 'https://cnote.vercel.app';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { token } = req.query;

  if (!token || typeof token !== 'string') {
    return res.status(400).send('Missing token');
  }

  try {
    // 1. Fetch metadata from backend
    const metaResponse = await axios.get(`${API_URL}/public/notes/${token}/meta`);
    const { title, excerpt } = metaResponse.data.data;

    // 2. Fetch the base index.html
    // We fetch it from the deployment itself to get the latest built version
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['host'];
    const origin = `${protocol}://${host}`;
    
    const htmlResponse = await axios.get(`${origin}/index.html`);
    let html = htmlResponse.data;

    // 3. Inject tags via string replacement
    const fullTitle = `${title} | Cnote`;
    const fullUrl = `${origin}/public/note/${token}`;

    // Replace Title
    html = html.replace(/<title>.*?<\/title>/g, `<title>${fullTitle}</title>`);
    
    // Replace Meta Description
    html = html.replace(/<meta name="description" content=".*?" \/>/g, `<meta name="description" content="${excerpt}" />`);

    // Replace OG Tags
    html = html.replace(/<meta property="og:title" content=".*?" \/>/g, `<meta property="og:title" content="${fullTitle}" />`);
    html = html.replace(/<meta property="og:description" content=".*?" \/>/g, `<meta property="og:description" content="${excerpt}" />`);
    html = html.replace(/<meta property="og:url" content=".*?" \/>/g, `<meta property="og:url" content="${fullUrl}" />`);

    // Replace Twitter Tags
    html = html.replace(/<meta name="twitter:title" content=".*?" \/>/g, `<meta name="twitter:title" content="${fullTitle}" />`);
    html = html.replace(/<meta name="twitter:description" content=".*?" \/>/g, `<meta name="twitter:description" content="${excerpt}" />`);
    html = html.replace(/<meta name="twitter:url" content=".*?" \/>/g, `<meta name="twitter:url" content="${fullUrl}" />`);

    // 4. Return the modified HTML
    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(html);

  } catch (error) {
    console.error('OG Proxy Error:', error);
    
    // Graceful fallback: return the original index.html
    try {
      const protocol = req.headers['x-forwarded-proto'] || 'https';
      const host = req.headers['host'];
      const htmlResponse = await axios.get(`${protocol}://${host}/index.html`);
      res.setHeader('Content-Type', 'text/html');
      return res.status(200).send(htmlResponse.data);
    } catch (fallbackError) {
      return res.status(500).send('Internal Server Error');
    }
  }
}

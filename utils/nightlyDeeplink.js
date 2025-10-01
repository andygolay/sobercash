import { Buffer } from 'buffer';

export const buildDataParam = (obj) => {
  const base64 = Buffer.from(JSON.stringify(obj), 'utf8').toString('base64');
  return encodeURIComponent(base64);
};

export const APP_INFO = {
  name: 'SoberCash',
  url: 'https://sobercash.app',
  // Use a guaranteed PNG while your icon URL is pending
  icon: 'https://placehold.co/180x180.png',
};

export const buildAppInfo = () => APP_INFO;

export const parseUrl = (input) => {
  const href = input;
  const qIndex = input.indexOf('?');
  const query = qIndex >= 0 ? input.slice(qIndex + 1) : '';
  const params = {};
  if (query.length > 0) {
    for (const part of query.split('&')) {
      if (!part) continue;
      const [k, v = ''] = part.split('=');
      try {
        const key = decodeURIComponent(k);
        const val = decodeURIComponent(v);
        params[key] = val;
      } catch {
        // ignore malformed encodings
      }
    }
  }
  return { href, params };
};

export const extractAddress = (data) => {
  if (data && typeof data === 'object') {
    const o = data;
    const cands = [o.address, o.walletAddress, o.addr];
    const found = cands.find(v => typeof v === 'string' && v.length > 0);
    return typeof found === 'string' ? found : undefined;
  }
  return undefined;
};

// Route kind helpers for dapp deep links
export function getRouteKind(href) {
  if (href.includes('/--/sobercash/connect')) return 'connect';
  if (href.includes('/--/sobercash/response')) return 'response';
  if (href.includes('/connect')) return 'connect';
  if (href.includes('/response')) return 'response';
  return 'unknown';
}

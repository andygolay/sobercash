import bs58 from 'bs58';

export type AppInfoMeta = {
  name: string;
  icon?: string;
  url?: string;
};

export function buildAppInfo(): AppInfoMeta {
  return {
    name: 'SoberCash',
    icon: '/vercel.svg',
    url: 'https://example.local',
  };
}

export function toBase64Json(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj), 'utf8').toString('base64');
}

export function randomNonceBase58(): string {
  const buf = new Uint8Array(24);
  crypto.getRandomValues(buf);
  return bs58.encode(buf);
}

export function nightlyDirectUrl(route: 'connect' | 'signMessage' | 'signTransactions', data: string): string {
  return `nightly://v1/direct/${route}?data=${encodeURIComponent(data)}`;
}



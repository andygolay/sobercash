import { NextRequest } from 'next/server';

type StoredResult = {
  success: boolean;
  payload?: unknown;
  error?: string;
  receivedAt: number;
};

// Access the shared session store and add a result store
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let sessions: Map<string, { createdAt: number }> = (globalThis as any).__nightlySessionStore || new Map();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let results: Map<string, StoredResult> = (globalThis as any).__nightlyResultStore || new Map();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).__nightlyResultStore = results;

// Ensure we have the same session store reference
function getSessionStore() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sessions = (globalThis as any).__nightlySessionStore || new Map();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).__nightlySessionStore = sessions;
  return sessions;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  console.log(`[NIGHTLY API] POST result request:`, body ? 'HAS BODY' : 'NO BODY');

  if (!body || typeof body !== 'object') {
    console.log(`[NIGHTLY API] Invalid JSON body`);
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 });
  }

  const { sessionId, success, payload, error } = body as {
    sessionId?: string;
    success?: boolean;
    payload?: unknown;
    error?: string;
  };

  console.log(`[NIGHTLY API] Processing result for sessionId: ${sessionId}, success: ${success}`);

  const sessionStore = getSessionStore();
  console.log(`[NIGHTLY API] Available sessions: ${Array.from(sessionStore.keys()).join(', ')}`);
  
  if (!sessionId || !sessionStore.has(sessionId)) {
    console.log(`[NIGHTLY API] Unknown sessionId: ${sessionId}`);
    return new Response(JSON.stringify({ error: 'Unknown sessionId' }), { status: 400 });
  }

  results.set(sessionId, {
    success: Boolean(success),
    payload,
    error,
    receivedAt: Date.now(),
  });

  console.log(`[NIGHTLY API] Result stored for ${sessionId}`);
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('sessionId');
  console.log(`[NIGHTLY API] GET result request for sessionId: ${sessionId}`);

  const sessionStore = getSessionStore();
  console.log(`[NIGHTLY API] Available sessions: ${Array.from(sessionStore.keys()).join(', ')}`);

  if (!sessionId || !sessionStore.has(sessionId)) {
    console.log(`[NIGHTLY API] Unknown sessionId: ${sessionId}`);
    return new Response(JSON.stringify({ error: 'Unknown sessionId' }), { status: 400 });
  }
  const value = results.get(sessionId);
  console.log(`[NIGHTLY API] Result for ${sessionId}:`, value ? 'FOUND' : 'NOT FOUND');
  return new Response(JSON.stringify({ result: value || null }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}



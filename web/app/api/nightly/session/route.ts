import { NextRequest } from 'next/server';

// Simple in-memory store for sessions
// Note: This resets on server restart. For production, replace with durable storage.
let sessions: Map<string, { createdAt: number }>;

// Initialize or get existing session store
function getSessionStore() {
  if (!sessions) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sessions = (globalThis as any).__nightlySessionStore || new Map();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).__nightlySessionStore = sessions;
  }
  return sessions;
}

function generateSessionId(): string {
  // 32-char url-safe id
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function POST(_req: NextRequest) {
  const sessionStore = getSessionStore();
  const sessionId = generateSessionId();
  sessionStore.set(sessionId, { createdAt: Date.now() });
  console.log(`[SOBERCASH API] Created new session: ${sessionId}`);
  console.log(`[SOBERCASH API] Total sessions in store: ${sessionStore.size}`);
  return new Response(JSON.stringify({ sessionId }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}



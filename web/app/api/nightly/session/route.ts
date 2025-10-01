import { NextRequest } from 'next/server';

// Simple in-memory store for sessions
// Note: This resets on server restart. For production, replace with durable storage.
const sessions = new Map<string, { createdAt: number }>();

function generateSessionId(): string {
  // 32-char url-safe id
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function POST(_req: NextRequest) {
  const sessionId = generateSessionId();
  sessions.set(sessionId, { createdAt: Date.now() });
  console.log(`[SOBERCASH API] Created new session: ${sessionId}`);
  return new Response(JSON.stringify({ sessionId }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Expose the store to sibling route handlers (node module cache shared)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).__nightlySessionStore = sessions;



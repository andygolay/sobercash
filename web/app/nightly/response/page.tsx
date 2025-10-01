'use client';

import { useEffect, useMemo, useState } from 'react';

// This page runs on client to decode the wallet's redirect and post it to the API
export default function NightlyResponsePage() {
  const [status, setStatus] = useState<'idle' | 'posting' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');

  const params = useMemo(() => {
    if (typeof window === 'undefined') return new URLSearchParams();
    // Handle the case where Nightly uses ? instead of & to separate params
    const search = window.location.search;
    const fixedSearch = search.replace(/\?data=/, '&data=');
    return new URLSearchParams(fixedSearch);
  }, []);
  const dataParam = params.get('data');
  const sessionId = params.get('sessionId') || '';

  useEffect(() => {
    async function postResult() {
      // Debug: log all URL parameters
      console.log('URL:', window.location.href);
      console.log('Search params:', window.location.search);
      console.log('All params:', Object.fromEntries(params.entries()));
      console.log('dataParam:', dataParam);
      console.log('sessionId:', sessionId);

      if (!dataParam || !sessionId) {
        setStatus('error');
        setMessage(`Missing data or sessionId in query. dataParam: ${dataParam}, sessionId: ${sessionId}`);
        return;
      }
      setStatus('posting');
      try {
        // Pass raw envelope up; app server or the Mini App can decrypt with shared secret
        const envelopeBase64 = dataParam;
        const res = await fetch('/api/nightly/result', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, success: true, payload: { envelopeBase64 } }),
        });
        if (!res.ok) throw new Error('Failed to store result');
        setStatus('done');
        setMessage('Result received. Redirecting back to app...');
        // Redirect back to the main app after a short delay
        setTimeout(() => {
          window.location.href = '/home';
        }, 1500);
      } catch (e) {
        setStatus('error');
        setMessage(e instanceof Error ? e.message : 'Unknown error');
      }
    }
    postResult();
  }, [dataParam, sessionId]);

  return (
    <div style={{ padding: 16 }}>
      <h2>Nightly Response</h2>
      <p>Status: {status}</p>
      <p>{message}</p>
    </div>
  );
}



"use client";
// Cache bust: 2024-01-15-aptos-account-transfer

import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { VIEW_FUNCTIONS } from "../../lib/constants";
import { callView } from "../../lib/contract";
import { formatDurationHours, formatUsd } from "../../lib/format";
import { buildMovementTransferRaw } from "../../lib/movement/rawTransaction";
import { useNightly } from "../../lib/nightly/NightlyProvider";
import { decryptWithSharedKey, deriveSharedSecret, encryptWithSharedKey, generateKeypair } from "../../lib/nightly/encryption";

export default function HomePage() {
  const nightly = useNightly();
  const [address, setAddress] = useState("");
  const [moneySaved, setMoneySaved] = useState<number | null>(null);
  const [timeSaved, setTimeSaved] = useState<number | null>(null);
  const [status, setStatus] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [dappPub58, setDappPub58] = useState<string | null>(null);
  const dappSecretRef = useRef<Uint8Array | null>(null);
  const pollingRef = useRef<boolean>(false);
  const [isPolling, setIsPolling] = useState(false);
  const [debugLogs, setDebugLogs] = useState<string[]>([]);
  const [sharedSecret, setSharedSecret] = useState<Uint8Array | null>(null);

  const addDebugLog = (message: string) => {
    const logMessage = `[SOBERCASH DEBUG] ${new Date().toLocaleTimeString()}: ${message}`;
    console.log(logMessage);
    setDebugLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);

    // Send to server for terminal logging
    fetch('/api/debug', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: logMessage })
    }).catch(() => { }); // Ignore errors
  };

  // Initialize Aptos client for Movement
  const aptosConfig = new AptosConfig({
    network: Network.CUSTOM,
    fullnode: 'https://full.mainnet.movementinfra.xyz/v1',
    chainId: 126, // Movement Mainnet chain ID
  });
  const aptos = new Aptos(aptosConfig);

  const signTransactionViaDeeplink = async (payload: any) => {
    try {
      addDebugLog('=== STARTING TRANSACTION SIGNING ===');
      addDebugLog(`Payload: ${JSON.stringify(payload, null, 2)}`);
      addDebugLog(`Shared secret state: ${sharedSecret ? 'present' : 'null'}`);
      addDebugLog(`Shared secret length: ${sharedSecret ? sharedSecret.length : 'N/A'}`);

      let secretToUse = sharedSecret;

      // If no shared secret in state, try to get it from localStorage
      if (!secretToUse) {
        addDebugLog('No shared secret in state, checking localStorage...');
        const storedSecret = localStorage.getItem('nightly_shared_secret');
        if (storedSecret) {
          try {
            secretToUse = new Uint8Array(JSON.parse(storedSecret));
            setSharedSecret(secretToUse);
            addDebugLog('✅ Restored shared secret from localStorage');
          } catch (e) {
            addDebugLog(`Failed to parse stored secret: ${(e as Error).message}`);
          }
        }
      }

      if (!secretToUse) {
        addDebugLog('❌ No shared secret available - need to reconnect');
        setStatus('Please reconnect to Nightly first');
        return { hash: "error" };
      }
      addDebugLog('✅ Shared secret available');

      // Create a server session for this transaction
      addDebugLog('Creating server session...');
      const res = await fetch('/api/nightly/session', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to create session');
      const { sessionId } = await res.json();
      addDebugLog(`✅ Transaction session created: ${sessionId}`);

      // Build raw hex ONLY via serializer-based transfer builder
      addDebugLog('Building rawHex via transfer builder...');
      const receiver = String((payload.arguments || [])[0] || '');
      const amountStr = String((payload.arguments || [])[1] || '0');
      const amountNum = Number(amountStr);
      addDebugLog(`Build inputs -> fn: ${payload.function}, type_args: ${JSON.stringify(payload.type_arguments || [])}`);
      addDebugLog(`Build inputs -> receiver: ${receiver}, amountOctas(num): ${amountNum}`);
      const rawHex = await buildMovementTransferRaw(address, receiver, amountNum);
      addDebugLog(`✅ Raw hex built (len=${rawHex.length})`);
      addDebugLog(`rawHex preview: ${rawHex.slice(0, 20)}...${rawHex.slice(-20)}`);

      // Match mobile payload format exactly - simplified
      const transactions = [JSON.stringify({ rawTransaction: rawHex })];
      const transactionPayload = {
        transactions,
        options: { submit: true }
      };
      addDebugLog(`Transaction payload: ${JSON.stringify(transactionPayload, null, 2)}`);

      // Encrypt the transaction payload using the shared secret
      addDebugLog('Encrypting transaction payload...');
      const { nonceBase58, payloadBase64 } = encryptWithSharedKey(
        secretToUse,
        JSON.stringify(transactionPayload)
      );
      addDebugLog(`✅ Encrypted - nonce: ${nonceBase58.substring(0, 20)}..., payload: ${payloadBase64.substring(0, 50)}...`);

      // Build signTransactions payload
      const dataObj = {
        network: 'movement',
        cluster: 'mainnet',
        rpcUrl: 'https://full.mainnet.movementinfra.xyz/v1',
        chainId: '126',
        responseRoute: `${window.location.origin}/home?txSessionId=${sessionId}`,
        payload: payloadBase64,
        nonce: nonceBase58,
        dappEncryptionPublicKey: dappPub58,
        address: address,
        appInfo: { name: 'SoberCash', icon: `${window.location.origin}/vercel.svg`, url: window.location.origin },
      };
      addDebugLog(`Data object: ${JSON.stringify(dataObj, null, 2)}`);
      addDebugLog(`Deep link target: nightly://v1/direct/signTransactions`);

      const data = btoa(JSON.stringify(dataObj));
      const url = `nightly://v1/direct/signTransactions?data=${encodeURIComponent(data)}`;

      addDebugLog(`🔗 Nightly URL: ${url}`);
      addDebugLog('Opening Nightly for transaction signing...');
      window.location.href = url;

      return { hash: "deeplink-tx-pending" };
    } catch (e) {
      addDebugLog(`❌ Transaction signing error: ${(e as Error).message}`);
      addDebugLog(`Error stack: ${(e as Error).stack}`);
      throw e;
    }
  };

  useEffect(() => {
    if (nightly.address) setAddress(nightly.address);
  }, [nightly.address]);

  // Check for existing shared secret on page load
  useEffect(() => {
    const storedSharedSecret = localStorage.getItem('nightly_shared_secret');
    if (storedSharedSecret) {
      try {
        const sharedSecretArray = new Uint8Array(JSON.parse(storedSharedSecret));
        setSharedSecret(sharedSecretArray);
        addDebugLog('Restored shared secret from localStorage');
      } catch (e) {
        addDebugLog(`Failed to restore shared secret: ${(e as Error).message}`);
      }
    } else {
      addDebugLog('No shared secret found in localStorage');
    }
  }, []);

  // Handle connection when returning from Nightly
  useEffect(() => {
    addDebugLog('HomePage useEffect - checking for Nightly response');

    // Fix Nightly's malformed URL parameters (? instead of &)
    const search = window.location.search;
    const fixedSearch = search.replace(/\?data=/, '&data=');
    const urlParams = new URLSearchParams(fixedSearch);

    const connectSessionId = urlParams.get('connectSessionId');
    const txSessionId = urlParams.get('txSessionId');
    const dataParam = urlParams.get('data');

    addDebugLog(`Original URL: ${window.location.href}`);
    addDebugLog(`Fixed search: ${fixedSearch}`);
    addDebugLog(`URL params: connectSessionId=${connectSessionId}, txSessionId=${txSessionId}, dataParam=${dataParam ? 'present' : 'missing'}`);

    // If this is a redirect from Nightly, process it and close the window
    if (connectSessionId || txSessionId) {
      addDebugLog('Nightly redirect detected - processing and closing window');

      if (connectSessionId && dataParam) {
        addDebugLog('Found Nightly connect response, handling...');
        handleNightlyResponse(connectSessionId, dataParam);
      } else if (txSessionId && dataParam) {
        addDebugLog('Found Nightly transaction response, handling...');
        handleTransactionResponse(txSessionId, dataParam);
      }

      // Close this window after processing
      setTimeout(() => {
        window.close();
      }, 2000);
    } else {
      addDebugLog('No Nightly response parameters found');
    }
  }, []);

  const handleNightlyResponse = async (sessionId: string, dataParam: string) => {
    console.log('handleNightlyResponse called with:', { sessionId, dataParam: dataParam.substring(0, 50) + '...' });
    try {
      // Store the result in our API
      console.log('Storing result in API...');
      const res = await fetch('/api/nightly/result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, success: true, payload: { envelopeBase64: dataParam } }),
      });

      console.log('API response:', res.ok);

      if (res.ok) {
        // Now process the connection
        console.log('Decoding envelope...');
        const jsonStr = atob(dataParam);
        const envelope = JSON.parse(jsonStr) as { success: boolean; walletPub: string; nonce: string; payload: string };

        console.log('Envelope:', { success: envelope.success, walletPub: envelope.walletPub?.substring(0, 20) + '...' });

        if (envelope?.success && envelope.walletPub && envelope.nonce && envelope.payload) {
          // Get the secret key from localStorage
          console.log('Getting secret key from localStorage...');
          const storedSecret = localStorage.getItem('nightly_secret_key');
          console.log('Stored secret exists:', !!storedSecret);

          if (!storedSecret) {
            console.error('No stored secret key found');
            setStatus('Connection failed - missing secret key');
            return;
          }

          const secretKey = new Uint8Array(JSON.parse(storedSecret));
          dappSecretRef.current = secretKey;

          console.log('Deriving shared secret and decrypting...');
          // Derive shared and decrypt connect payload
          const shared = deriveSharedSecret(envelope.walletPub, secretKey);
          const plain = decryptWithSharedKey(shared, envelope.nonce, envelope.payload);

          console.log('Decrypted payload:', plain);
          const obj = JSON.parse(plain) as { activeAccount?: { address?: string } };
          const addr = obj?.activeAccount?.address;

          console.log('Extracted address:', addr);

          if (addr) {
            console.log('Setting address and updating context...');
            setAddress(addr);
            // Store the shared secret for transaction signing
            setSharedSecret(shared);
            // Also store in localStorage for persistence
            localStorage.setItem('nightly_shared_secret', JSON.stringify(Array.from(shared)));
            nightly.setAddress(addr);
            setStatus('Connected via Nightly');
            // Clean up URL and localStorage
            window.history.replaceState({}, '', '/home');
            localStorage.removeItem('nightly_secret_key');
            addDebugLog('Connection complete with shared secret stored!');
          } else {
            console.error('No address found in decrypted payload');
          }
        } else {
          console.error('Invalid envelope structure');
        }
      } else {
        console.error('API call failed:', res.status);
      }
    } catch (e) {
      console.error('Error handling Nightly response:', e);
      setStatus('Connection failed: ' + (e as Error).message);
    }
  };

  const handleTransactionResponse = async (txSessionId: string, dataParam: string) => {
    addDebugLog('handleTransactionResponse called');
    try {
      // Store the result in our API
      const res = await fetch('/api/nightly/result', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: txSessionId, success: true, payload: { envelopeBase64: dataParam } }),
      });

      if (res.ok) {
        // Process the transaction response
        const jsonStr = atob(dataParam);
        const envelope = JSON.parse(jsonStr) as { success: boolean; walletPub: string; nonce: string; payload: string };

        if (envelope?.success && envelope.walletPub && envelope.nonce && envelope.payload) {
          // Use the stored shared secret from the connection
          if (!sharedSecret) {
            addDebugLog('No shared secret available for transaction response');
            setStatus('Transaction failed - no shared secret');
            return;
          }

          // Use the stored shared secret to decrypt transaction response
          const plain = decryptWithSharedKey(sharedSecret, envelope.nonce, envelope.payload);

          addDebugLog('Transaction response decrypted');
          const obj = JSON.parse(plain) as { hashes?: string[] };

          if (obj?.hashes && obj.hashes.length > 0) {
            addDebugLog(`Transaction submitted! Hash: ${obj.hashes[0]}`);
            setStatus(`Transaction successful! Hash: ${obj.hashes[0].substring(0, 10)}...`);
            // Clean up URL
            window.history.replaceState({}, '', '/home');
          } else {
            addDebugLog('No transaction hash in response');
            setStatus('Transaction completed but no hash received');
          }
        }
      }
    } catch (e) {
      addDebugLog(`Transaction response error: ${(e as Error).message}`);
      setStatus('Transaction failed: ' + (e as Error).message);
    }
  };

  async function loadSavings() {
    try {
      setStatus("Loading savings...");
      const m = await callView(VIEW_FUNCTIONS.CALCULATE_MONEY_SAVED_DOLLARS, [address]);
      const t = await callView(VIEW_FUNCTIONS.CALCULATE_TIME_SAVED_HOURS, [address]);
      setMoneySaved(Number(m));
      setTimeSaved(Number(t));
      setStatus("");
    } catch (e: any) {
      setStatus(e?.message || "Failed to fetch");
    }
  }

  return (
    <div className="container">
      <div className="header">
        <div>
          <div className="title">SoberCash</div>
          <div className="subtitle">Movement testnet</div>
          <div className="row" style={{ marginTop: 8 }}>
            <Link href="/home" className="btn secondary">Home</Link>
            <Link href="/settings" className="btn secondary">Settings</Link>
          </div>
        </div>
        <div>
          {!nightly.connected ? (
            <button className="btn" onClick={async () => {
              try {
                addDebugLog('Connect Nightly button clicked');
                if (pollingRef.current) return;
                // Create a server session
                console.log('Creating server session...');
                const res = await fetch('/api/nightly/session', { method: 'POST' });
                if (!res.ok) throw new Error('Failed to create session');
                const { sessionId } = await res.json();
                console.log('Session created:', sessionId);
                setSessionId(sessionId);
                // Generate ephemeral keys for this handshake
                console.log('Generating keypair...');
                const kp = generateKeypair();
                dappSecretRef.current = kp.secretKey;
                setDappPub58(kp.publicKey58);
                // Store secret key for when we return from Nightly
                localStorage.setItem('nightly_secret_key', JSON.stringify(Array.from(kp.secretKey)));
                console.log('Secret key stored in localStorage');
                // Build connect payload - redirect directly back to /home
                const dataObj = {
                  network: 'movement',
                  cluster: 'mainnet',
                  responseRoute: `${window.location.origin}/home?connectSessionId=${sessionId}`,
                  appInfo: { name: 'SoberCash', icon: `${window.location.origin}/vercel.svg`, url: window.location.origin },
                  dappEncryptionPublicKey: kp.publicKey58,
                };
                const data = btoa(JSON.stringify(dataObj));
                const url = `nightly://v1/direct/connect?data=${encodeURIComponent(data)}`;
                console.log('Opening Nightly with URL:', url);
                // Open Nightly
                window.location.href = url;
                // Begin polling for the result envelope
                pollingRef.current = true;
                setIsPolling(true);
                const poll = async () => {
                  try {
                    while (pollingRef.current && sessionId) {
                      const r = await fetch(`/api/nightly/result?sessionId=${sessionId}`, { cache: 'no-store' });
                      if (r.ok) {
                        const j = await r.json();
                        const result = j?.result;
                        const envelopeBase64 = result?.payload?.envelopeBase64 as string | undefined;
                        if (envelopeBase64) {
                          // Decode envelope JSON
                          const jsonStr = atob(envelopeBase64);
                          const envelope = JSON.parse(jsonStr) as { success: boolean; walletPub: string; nonce: string; payload: string };
                          if (envelope?.success && envelope.walletPub && envelope.nonce && envelope.payload) {
                            const secret = dappSecretRef.current;
                            if (secret) {
                              // Derive shared and decrypt connect payload
                              const shared = deriveSharedSecret(envelope.walletPub, secret);
                              const plain = decryptWithSharedKey(shared, envelope.nonce, envelope.payload);
                              try {
                                const obj = JSON.parse(plain) as { activeAccount?: { address?: string } };
                                const addr = obj?.activeAccount?.address;
                                if (addr) {
                                  setAddress(addr);
                                  // Update the Nightly context to show connected state
                                  nightly.setAddress(addr);
                                  setStatus('Connected via Nightly (deeplink)');
                                  pollingRef.current = false;
                                  setIsPolling(false);
                                  break;
                                }
                              } catch { }
                            }
                          }
                        }
                      }
                      await new Promise(res => setTimeout(res, 1200));
                    }
                  } catch (e) {
                    // Stop polling on error
                    pollingRef.current = false;
                    setIsPolling(false);
                  }
                };
                poll();
              } catch (e) {
                alert((e as Error).message);
              }
            }}>{isPolling ? 'Waiting for Nightly...' : 'Connect Nightly'}</button>
          ) : (
            <div className="row" style={{ alignItems: 'center' }}>
              <span className="small">{nightly.address}</span>
              <button className="btn secondary" onClick={nightly.disconnect}>Disconnect</button>
            </div>
          )}
        </div>
      </div>


      <div className="card">
        <div className="label">Wallet address</div>
        <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="0x..." />
        <div className="row" style={{ marginTop: 10 }}>
          <button className="btn secondary" onClick={loadSavings}>Refresh savings</button>
        </div>
      </div>

      {(moneySaved !== null || timeSaved !== null) && (
        <div className="card">
          <div className="section-title">Your savings</div>
          <div style={{ display: 'flex', gap: 16 }}>
            <div>Money: {formatUsd(moneySaved)}</div>
            <div>Time: {formatDurationHours(timeSaved)}</div>
          </div>
        </div>
      )}

      <div className="card" style={{ backgroundColor: '#f0f8ff', border: '2px solid #007bff' }}>
        <div className="section-title">🔍 Debug Status</div>
        <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px' }}>
          {status || 'Ready to connect'}
        </div>
        <div style={{ fontSize: '14px', color: '#666' }}>
          Nightly Connected: {nightly.connected ? '✅ YES' : '❌ NO'}<br />
          Address: {nightly.address || 'None'}<br />
          Current URL: {typeof window !== 'undefined' ? window.location.href : 'Loading...'}
        </div>
        <button
          className="btn secondary"
          onClick={() => {
            const params = new URLSearchParams(window.location.search);
            const sessionId = params.get('sessionId');
            const dataParam = params.get('data');
            setStatus(`URL Check: sessionId=${sessionId ? 'YES' : 'NO'}, data=${dataParam ? 'YES' : 'NO'}`);
          }}
          style={{ marginTop: '10px' }}
        >Check URL Parameters</button>
        <button
          className="btn secondary"
          onClick={() => {
            const url = new URL(window.location.href);
            url.searchParams.set('cb', String(Date.now()));
            window.location.href = url.toString();
          }}
          style={{ marginTop: '10px', marginLeft: '10px' }}
        >Force Reload</button>
      </div>

      {nightly.connected && nightly.address && (
        <div className="card">
          <div className="section-title">Test Transaction</div>
          <button
            className="btn"
            onClick={async () => {
              console.log('BUTTON CLICKED - TESTING SERVER LOG');
              fetch('/api/debug', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: 'BUTTON CLICKED - TESTING SERVER LOG' })
              }).then(() => console.log('Sent to server')).catch(e => console.log('Server error:', e));

              try {
                addDebugLog('=== TEST TRANSFER BUTTON CLICKED - V2 ===');
                // Test with aptos_account::transfer_coins and AptosCoin type
                const testTx = {
                  arguments: [
                    '0x0000000000000000000000000000000000000000000000000000000000000001', // recipient
                    '1000', // 1000 octas for visibility
                  ],
                  function: '0x1::aptos_account::transfer_coins',
                  type_arguments: ['0x1::aptos_coin::AptosCoin'],
                };

                addDebugLog(`Using function: ${testTx.function}`);
                addDebugLog(`Arguments: ${JSON.stringify(testTx.arguments)}`);
                addDebugLog(`Type arguments: ${JSON.stringify(testTx.type_arguments)}`);
                addDebugLog('Sending transaction via deeplink...');
                await signTransactionViaDeeplink(testTx);
              } catch (e) {
                addDebugLog(`Test transfer error: ${(e as Error).message}`);
                alert('Transaction failed: ' + (e as Error).message);
              }
            }}
          >Test Transfer</button>
        </div>
      )}

      <div className="card">
        <div className="section-title">Debug Logs</div>
        <div style={{ maxHeight: '200px', overflow: 'auto', fontSize: '12px', fontFamily: 'monospace' }}>
          {debugLogs.length === 0 ? 'No logs yet...' : debugLogs.map((log, i) => (
            <div key={i} style={{ marginBottom: '4px' }}>{log}</div>
          ))}
        </div>
        <button
          className="btn secondary"
          onClick={() => setDebugLogs([])}
          style={{ marginTop: '8px' }}
        >Clear Logs</button>
      </div>
    </div>
  );
}



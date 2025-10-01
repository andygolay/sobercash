"use client";

import { ClientAptos, NightlyConnectModal } from "@nightlylabs/connect-aptos";
import { createContext, ReactNode, useContext, useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { CHAIN_ID } from "../constants";

type NightlyCtx = {
  client: any | null;
  connected: boolean;
  address?: string;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  signAndSubmit: (payload: any) => Promise<any>;
  setAddress: (address: string) => void;
};

const Ctx = createContext<NightlyCtx | undefined>(undefined);

export function NightlyConnectAptosProvider({ children }: { children: ReactNode }) {
  const [client, setClient] = useState<any | null>(null);
  const [address, setAddress] = useState<string | undefined>(undefined);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState<any | null>(null);
  const [extAptos, setExtAptos] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const connect = async () => {
    const w = typeof window !== 'undefined' ? (window as any) : undefined;
    // Strictly prefer Nightly injected provider. Do NOT fall back to Petra.
    const nightlyInjected = w?.nightly?.aptos || (w?.aptos && typeof w.aptos?.name === 'string' && w.aptos.name.toLowerCase().includes('nightly') ? w.aptos : null);
    if (nightlyInjected) {
      try {
        const conn = await nightlyInjected.connect?.();
        const acc = conn?.address ? conn : await nightlyInjected.account?.();
        if (acc?.address) setAddress(acc.address);
        setExtAptos(nightlyInjected);
        setClient({ kind: 'extension' });
        // Listen for account/network changes when supported
        try {
          nightlyInjected.on?.('accountChange', async () => {
            const a = await nightlyInjected.account?.();
            if (a?.address) setAddress(a.address);
          });
          nightlyInjected.on?.('accountChanged', async () => {
            const a = await nightlyInjected.account?.();
            if (a?.address) setAddress(a.address);
          });
          nightlyInjected.on?.('networkChange', async () => {
            const a = await nightlyInjected.account?.();
            if (a?.address) setAddress(a.address);
          });
        } catch { }
        setError(null);
        return;
      } catch { }
    }
    setError('Nightly extension not detected. Using QR session.');
    if (client) return;
    const sessionId = uuidv4();
    const { client: c, data } = await ClientAptos.build({ sessionId });
    setClient(c);
    setModalData(data);
    setModalOpen(true);
  };

  const disconnect = async () => {
    try { await client?.endSession?.(); } catch { }
    setClient(null);
    setAddress(undefined);
    setModalOpen(false);
    setModalData(null);
    setExtAptos(null);
    setError(null);
  };

  const setAddressFromDeeplink = (address: string) => {
    setAddress(address);
    setClient({ kind: 'deeplink' }); // Mark as connected via deeplink
  };

  const signTransactionViaDeeplink = async (payload: any) => {
    // This will be implemented in the Home page where we have access to the deeplink utilities
    throw new Error("Deeplink transaction signing should be handled in the Home page component");
  };

  const signAndSubmit = async (payload: any) => {
    if (extAptos) {
      // Normalize payload to AIP-63 SimpleTransaction and include gas options & chainId
      const toAip63 = (p: any) => {
        const now = Math.floor(Date.now() / 1000);
        const raw = p?.data ? p.data : p;
        const data = raw?.type
          ? raw
          : {
            type: 'entry_function_payload',
            function: raw.function,
            arguments: raw.arguments ?? [],
            type_arguments: raw.type_arguments ?? [],
          };
        return { sender: address, data, options: { maxGasAmount: '200000', gasUnitPrice: '100', expireTimestampSecs: String(now + 600) } } as any;
      };
      // Fetch chainId once per attempt
      try {
        const chainId = CHAIN_ID;
        const req = toAip63(payload);
        if (chainId) (req as any).options.chainId = String(chainId);
        return await extAptos.signAndSubmitTransaction?.(req);
      } catch (e) {
        // Fallback to raw payload shapes
        try { return await extAptos.signAndSubmitTransaction?.(payload); } catch { }
        return await extAptos.signAndSubmitTransaction?.({ data: payload });
      }
    }

    // Handle deeplink signing flow
    if (client && client.kind === 'deeplink') {
      return await signTransactionViaDeeplink(payload);
    }

    if (!client) throw new Error("Not connected");
    throw new Error("Nightly session signing flow not yet implemented");
  };

  const value = useMemo<NightlyCtx>(
    () => ({ client, connected: Boolean(client), address, connect, disconnect, signAndSubmit, setAddress: setAddressFromDeeplink }),
    [client, address]
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      {error && (
        <div style={{ position: 'fixed', bottom: 12, left: 12, right: 12, textAlign: 'center' }}>
          <span style={{ background: '#111214', border: '1px solid #232428', color: '#f1f5f9', padding: 8, borderRadius: 8 }}>{error}</span>
        </div>
      )}
      {modalOpen && modalData && (
        <NightlyConnectModal data={modalData} onClose={() => setModalOpen(false)} />
      )}
    </Ctx.Provider>
  );
}

export function useNightly() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useNightly must be used within NightlyConnectAptosProvider");
  return v;
}



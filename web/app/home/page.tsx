"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { VIEW_FUNCTIONS } from "../../lib/constants";
import { callView } from "../../lib/contract";
import { formatDurationHours, formatUsd } from "../../lib/format";
import { useNightly } from "../../lib/nightly/NightlyProvider";

export default function HomePage() {
  const nightly = useNightly();
  const [address, setAddress] = useState("");
  const [moneySaved, setMoneySaved] = useState<number | null>(null);
  const [timeSaved, setTimeSaved] = useState<number | null>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (nightly.address) setAddress(nightly.address);
  }, [nightly.address]);

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
            <button className="btn" onClick={nightly.connect}>Connect Nightly</button>
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

      {status && <p className="small" style={{ color: '#ef4444', marginTop: 8 }}>{status}</p>}
    </div>
  );
}



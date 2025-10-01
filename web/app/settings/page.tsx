"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { VIEW_FUNCTIONS } from "../../lib/constants";
import { callView, payloadAddSubstance, payloadInitialize, payloadRemoveSubstance } from "../../lib/contract";
import { useNightly } from "../../lib/nightly/NightlyProvider";

type Substance = { name: string; costPerDayCents: number; hoursPerDay: number; quitDate: string };

export default function SettingsPage() {
  const nightly = useNightly();
  const [address, setAddress] = useState("");
  const [isInitialized, setIsInitialized] = useState<boolean | null>(null);
  const [substances, setSubstances] = useState<Substance[]>([]);
  const [form, setForm] = useState<Substance>({ name: "", costPerDayCents: 1000, hoursPerDay: 1, quitDate: "" });
  const [status, setStatus] = useState("");
  const dateInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => { if (nightly.address) setAddress(nightly.address); }, [nightly.address]);

  async function checkInitialized() {
    if (!address) return;
    try {
      const val = await callView(VIEW_FUNCTIONS.IS_INITIALIZED, [address]);
      setIsInitialized(Boolean(val));
      setStatus("");
    } catch (e: any) { setStatus(e?.message || "View failed"); }
  }

  async function initializeUserTx() {
    if (!address) return setStatus("Enter address first");
    try {
      setStatus("Initializing user...");
      await nightly.signAndSubmit(payloadInitialize(address));
      setStatus("Initialized");
      setIsInitialized(true);
    } catch (e: any) { setStatus(e?.message || "Initialize failed"); }
  }

  async function sendTestTx() {
    if (!nightly.connected) return setStatus('Connect wallet first');
    try {
      setStatus('Sending test tx...');
      const testTx = {
        type: 'entry_function_payload',
        function: '0x1::coin::transfer',
        type_arguments: ['0x1::aptos_coin::AptosCoin'],
        arguments: [address, 10],
      } as const;
      await nightly.signAndSubmit(testTx);
      setStatus('Test tx submitted');
    } catch (e: any) {
      setStatus(e?.message || 'Test tx failed');
    }
  }

  function alreadyExists(name: string) {
    return substances.some(s => s.name.trim().toLowerCase() === name.trim().toLowerCase());
  }

  async function addSubstance() {
    const { name, costPerDayCents, hoursPerDay, quitDate } = form;
    if (!name || !quitDate) return setStatus("Fill all fields");
    if (alreadyExists(name)) return setStatus("Please add a substance with a unique name");
    try {
      const ts = Math.floor(new Date(quitDate).getTime() / 1000);
      setStatus(`Adding ${name}...`);
      await nightly.signAndSubmit(payloadAddSubstance(address, name, Number(costPerDayCents), Number(hoursPerDay), ts));
      setSubstances([{ name, costPerDayCents: Number(costPerDayCents), hoursPerDay: Number(hoursPerDay), quitDate }, ...substances]);
      setStatus(`Success - Substance ${name} added!`);
    } catch (e: any) { setStatus(e?.message || "Add failed"); }
  }

  async function removeSubstance(name: string) {
    try {
      setStatus(`Removing ${name}...`);
      await nightly.signAndSubmit(payloadRemoveSubstance(address, name));
      setSubstances(substances.filter(s => s.name !== name));
      setStatus(`Removed ${name}`);
    } catch (e: any) { setStatus(e?.message || "Remove failed"); }
  }

  return (
    <div className="container">
      <div className="header">
        <div>
          <div className="title">Settings</div>
          <div className="subtitle">Manage your substances</div>
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
        <div className="row" style={{ marginTop: 10, gap: 8 }}>
          <button className="btn secondary" onClick={checkInitialized}>Check initialized</button>
          <button className="btn" onClick={initializeUserTx} disabled={!nightly.connected}>Initialize user</button>
          <button className="btn secondary" onClick={sendTestTx} disabled={!nightly.connected}>Test tx</button>
        </div>
        {isInitialized !== null && <div className="small" style={{ marginTop: 8 }}>Initialized: {isInitialized ? 'Yes' : 'No'}</div>}
      </div>

      <div className="card">
        <div className="section-title">Add substance</div>
        <div className="row" style={{ display: 'grid', gap: 8 }}>
          <input className="input" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className="input" type="number" placeholder="Cost per day (cents)" value={form.costPerDayCents} onChange={(e) => setForm({ ...form, costPerDayCents: Number(e.target.value) })} />
          <input className="input" type="number" placeholder="Hours per day" value={form.hoursPerDay} onChange={(e) => setForm({ ...form, hoursPerDay: Number(e.target.value) })} />
          <div className="row" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              ref={dateInputRef}
              className="input"
              type="date"
              value={form.quitDate}
              onChange={(e) => setForm({ ...form, quitDate: e.target.value })}
              max={new Date().toISOString().slice(0, 10)}
            />
            <button
              type="button"
              className="btn secondary"
              onClick={() => {
                const el: any = dateInputRef.current;
                if (el && typeof el.showPicker === 'function') {
                  el.showPicker();
                } else {
                  // Focus as fallback for browsers without showPicker
                  el?.focus();
                }
              }}
            >
              Pick date
            </button>
          </div>
        </div>
        <div className="row" style={{ marginTop: 8 }}>
          <button className="btn" onClick={addSubstance} disabled={!nightly.connected}>Add</button>
        </div>
      </div>

      {substances.length > 0 && (
        <div className="card">
          <div className="section-title">Your substances</div>
          {substances.map((s) => (
            <div key={s.name} className="row" style={{ justifyContent: 'space-between', marginTop: 8 }}>
              <div>
                <div>{s.name}</div>
                <div className="small">${'{'}(s.costPerDayCents/100).toFixed(2){'}'} / {s.hoursPerDay}h per day</div>
              </div>
              <button className="btn danger" onClick={() => removeSubstance(s.name)}>Remove</button>
            </div>
          ))}
        </div>
      )}

      {status && <p className="small" style={{ color: '#ef4444', marginTop: 8 }}>{status}</p>}
    </div>
  );
}



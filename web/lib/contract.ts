import { CONTRACT_MODULE, FULLNODE_URL } from './constants';

function normalizeAddress(address: string): string {
  if (!address) return address as any;
  const hex = address.toLowerCase();
  return hex.startsWith('0x') ? hex : `0x${hex}`;
}

export async function callView(functionName: string, args: any[]) {
  const endpoint = `${FULLNODE_URL}/view`;
  const normalizedArgs = (args || []).map((a) => {
    if (typeof a === 'string' && /^[0-9a-fA-Fx]+$/.test(a)) return normalizeAddress(a);
    return a;
  });
  const payload = { function: `${CONTRACT_MODULE}::${functionName}`, arguments: normalizedArgs, type_arguments: [] } as const;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    let detail = '';
    try { detail = await res.text(); } catch { }
    throw new Error(`View failed: ${res.status}${detail ? ` - ${detail}` : ''}`);
  }
  const data = await res.json();
  return data?.[0];
}

// AIP-63 styled payload helpers for browser wallets
function buildLegacyEntry(fn: string, args: any[]) {
  return { type: 'entry_function_payload', function: fn, arguments: args, type_arguments: [] } as const;
}

export function payloadInitialize(_sender: string) {
  return buildLegacyEntry(`${CONTRACT_MODULE}::initialize_user`, []);
}

export function payloadAddSubstance(_sender: string, name: string, costPerDayCents: number, hoursPerDay: number, quitTimestampSecs: number) {
  return buildLegacyEntry(`${CONTRACT_MODULE}::add_substance`, [name, String(costPerDayCents), String(hoursPerDay), String(quitTimestampSecs)]);
}

export function payloadRemoveSubstance(_sender: string, name: string) {
  return buildLegacyEntry(`${CONTRACT_MODULE}::remove_substance`, [name]);
}



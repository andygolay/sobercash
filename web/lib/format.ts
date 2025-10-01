export function formatUsd(amount: number | null | undefined): string {
  if (amount == null || isNaN(Number(amount))) return "-";
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(Number(amount));
  } catch {
    return `$${Number(amount).toFixed(2)}`;
  }
}

export function formatDurationHours(hours: number | null | undefined): string {
  if (hours == null || isNaN(Number(hours))) return "-";
  const h = Math.floor(Number(hours));
  const days = Math.floor(h / 24);
  const rem = h % 24;
  if (days > 0 && rem > 0) return `${days}d ${rem}h`;
  if (days > 0) return `${days}d`;
  return `${rem}h`;
}


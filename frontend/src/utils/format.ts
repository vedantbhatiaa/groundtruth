/** Formats emissions given in millions of tonnes into a readable string. */
export function fmtMt(mt: number | null | undefined): string {
  if (mt === null || mt === undefined || !isFinite(mt)) return "—";
  if (mt >= 1000) return (mt / 1000).toFixed(2) + " Gt";
  if (mt >= 100) return mt.toFixed(0) + " Mt";
  if (mt >= 10) return mt.toFixed(1) + " Mt";
  return mt.toFixed(2) + " Mt";
}

export function fmtPct(p: number | null | undefined): string {
  if (p === null || p === undefined || !isFinite(p)) return "—";
  return `${p >= 0 ? "+" : ""}${p.toFixed(1)}%`;
}

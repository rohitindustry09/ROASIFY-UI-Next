export function fmtINR(n, { compact = false, symbol = "₹" } = {}) {
  if (n === null || n === undefined || Number.isNaN(n)) return `${symbol}0`;
  if (!Number.isFinite(n)) return `${symbol}∞`;
  if (compact) {
    const abs = Math.abs(n);
    if (abs >= 1e7) return (n < 0 ? "-" : "") + symbol + (abs / 1e7).toFixed(1) + "Cr";
    if (abs >= 1e5) return (n < 0 ? "-" : "") + symbol + (abs / 1e5).toFixed(1) + "L";
  }
  const neg = n < 0;
  const rounded = Math.round(Math.abs(n));
  const s = rounded.toString();
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);
  const grouped = rest ? rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + "," + last3 : last3;
  return (neg ? "-" : "") + symbol + grouped;
}

export const CURRENCIES = [
  { code: "INR", symbol: "₹", label: "Indian Rupee" },
  { code: "USD", symbol: "$", label: "US Dollar" },
  { code: "CAD", symbol: "CA$", label: "Canadian Dollar" },
  { code: "EUR", symbol: "€", label: "Euro" },
  { code: "GBP", symbol: "£", label: "British Pound" },
  { code: "AUD", symbol: "A$", label: "Australian Dollar" },
];

export function fmtNum(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return "0";
  return Math.round(n).toLocaleString("en-IN");
}

export function fmtROI(v) {
  if (v === Infinity) return "∞";
  if (v === null || v === undefined || Number.isNaN(v)) return "0.0x";
  return v.toFixed(1) + "x";
}

export function fmtPct(v) {
  if (v === null || v === undefined || Number.isNaN(v)) return "0.0%";
  return v.toFixed(1) + "%";
}

export function fmtBytes(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

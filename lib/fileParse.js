import Papa from "papaparse";
import * as XLSX from "xlsx";

export function normalizeHeader(s) {
  return String(s ?? "")
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Read a File (csv/xlsx/xls) into a raw grid: array of arrays of strings. */
export async function readFileAsGrid(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "" });
  }
  // default: treat as CSV/TSV text
  const text = await file.text();
  const result = Papa.parse(text, { skipEmptyLines: true });
  if (result.errors && result.errors.length) {
    // Papa is tolerant; only bail on fatal-looking issues
    const fatal = result.errors.find((e) => e.type === "Delimiter");
    if (fatal) throw new Error("Could not detect a delimiter in this file.");
  }
  return result.data;
}

/**
 * Find the header row by scanning the first N rows for one that contains
 * all of the given normalized-name fragments (handles report exports that
 * prepend title/date-range lines before the real header, e.g. Google Ads).
 */
export function findHeaderRow(grid, requiredFragments, maxScan = 10) {
  const scan = Math.min(grid.length, maxScan);
  for (let i = 0; i < scan; i++) {
    const row = grid[i] || [];
    const normCells = row.map(normalizeHeader);
    const hasAll = requiredFragments.every((frag) =>
      normCells.some((c) => c.includes(frag))
    );
    if (hasAll) return i;
  }
  return -1;
}

/** Convert a grid + header row index into an array of row objects keyed by header text. */
export function gridToObjects(grid, headerRowIdx) {
  const headers = (grid[headerRowIdx] || []).map((h) =>
    String(h ?? "").replace(/^\uFEFF/, "").trim()
  );
  const rows = [];
  for (let i = headerRowIdx + 1; i < grid.length; i++) {
    const r = grid[i];
    if (!r || r.every((c) => c === "" || c === null || c === undefined)) continue;
    const obj = {};
    headers.forEach((h, j) => {
      obj[h] = r[j] !== undefined ? r[j] : "";
    });
    rows.push(obj);
  }
  return rows;
}

/** Build a lookup from logical column name -> actual header text present in this file. */
export function buildColumnMap(objRowSampleKeys, candidatesMap) {
  const normReal = objRowSampleKeys.map((k) => [k, normalizeHeader(k)]);
  const map = {};
  for (const [logical, fragments] of Object.entries(candidatesMap)) {
    let found = null;
    for (const frag of fragments) {
      const hit = normReal.find(([, norm]) => norm.includes(frag));
      if (hit) {
        found = hit[0];
        break;
      }
    }
    map[logical] = found;
  }
  return map;
}

export async function parseSourceFile(file, requiredFragments) {
  const grid = await readFileAsGrid(file);
  const headerIdx = findHeaderRow(grid, requiredFragments);
  if (headerIdx === -1) {
    throw new Error(
      "Couldn't find the expected columns in this file. Check you uploaded the right export."
    );
  }
  const rows = gridToObjects(grid, headerIdx);
  return rows;
}

"use client";

import { useRef, useState } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { findHeaderRow, gridToObjects, normalizeHeader } from "@/lib/fileParse";
import { requiredFragmentsFor } from "@/lib/merge";
import { fmtBytes } from "@/lib/format";

const BANNER = {
  meta: "linear-gradient(120deg,#E1EBF5 0%,#ECDBEB 60%,#FFFFFF 100%)",
  shopify: "linear-gradient(120deg,#F7F8E1 0%,#E0EFC5 60%,#FFFFFF 100%)",
  google: "linear-gradient(100deg,#DAEFEA 0%,#DAEEDA 25%,#DEECCE 45%,#EED8CE 68%,#FFFFFF 100%)",
};

async function readFileAsGrid(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: "" });
  }
  const text = await file.text();
  const result = Papa.parse(text, { skipEmptyLines: true });
  return result.data;
}

export default function UploadCard({ source, label, required, fields, icon, file, onFile, onClear }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState(null);

  async function processFile(f) {
    setError(null);
    setBusy(true);
    try {
      const grid = await readFileAsGrid(f);
      const headerIdx = findHeaderRow(grid, requiredFragmentsFor(source));
      if (headerIdx === -1) {
        throw new Error("Couldn't find the expected columns. Check you uploaded the right export.");
      }
      const rows = gridToObjects(grid, headerIdx);
      onFile({ name: f.name, size: f.size, rows });
    } catch (err) {
      setError(err.message || "Couldn't read this file.");
    } finally {
      setBusy(false);
    }
  }

  function handleInputChange(e) {
    const f = e.target.files?.[0];
    if (f) processFile(f);
    e.target.value = "";
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) processFile(f);
  }

  return (
    <div
      className={`relative overflow-hidden rounded-[20px] border bg-card shadow-[0_1px_2px_rgba(20,30,80,.03)] ${
        file ? "border-[#CDEAB9]" : "border-line"
      }`}
    >
      <div
        className="flex h-[118px] items-center justify-end overflow-hidden p-5"
        style={{ background: BANNER[source] }}
      >
        {icon}
      </div>

      <div className="px-4 pb-1 pt-3.5">
        <div className="flex items-center gap-2 font-display text-[16px] font-bold text-navy">
          {label}
          <span
            className={`rounded-full px-2 py-0.5 text-[9.5px] font-bold tracking-[.03em] ${
              required ? "bg-lime text-navy" : "bg-accent text-white"
            }`}
          >
            {required ? "Required" : "Optional"}
          </span>
        </div>
        <div className="mt-1 text-[11px] leading-relaxed text-text-dim">{fields}</div>
      </div>

      {!file ? (
        <div
          onClick={() => !busy && inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className="cursor-pointer px-4 pb-[18px] pt-3.5 text-center"
        >
          <span
            className={`inline-flex items-center gap-2 rounded-full px-[18px] py-2.5 text-[12.5px] font-bold ${
              required ? "bg-lime text-navy" : "bg-accent text-white"
            } ${dragOver ? "animate-pulseGlow" : ""}`}
          >
            {busy ? "Reading..." : dragOver ? "Drop it here" : "Choose file or drop here"}
          </span>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.tsv,.xlsx,.xls"
            className="hidden"
            onChange={handleInputChange}
          />
        </div>
      ) : (
        <div className="mx-4 mb-4 flex animate-fadeSlideUp items-center justify-between rounded-[14px] border border-[#CDEAB9] bg-[#F7FDF3] px-3.5 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex shrink-0 animate-popIn text-green">
              <CheckIcon />
            </span>
            <div className="min-w-0">
              <div className="truncate text-[12.5px] font-semibold text-navy">{file.name}</div>
              <div className="text-[10.5px] text-text-dim">
                {fmtBytes(file.size)} · {file.rowCount.toLocaleString("en-IN")} rows — stored, no re-upload needed
              </div>
            </div>
          </div>
          <button
            onClick={onClear}
            className="shrink-0 rounded-full p-1 text-text-dim hover:bg-[#F3F4F6] hover:text-navy"
            aria-label={`Remove ${label} file`}
          >
            <XIcon />
          </button>
        </div>
      )}

      {error && (
        <p className="mx-4 mb-3.5 animate-fadeSlideUp rounded-lg bg-red-bg px-2.5 py-1.5 text-[11.5px] text-red">
          {error}
        </p>
      )}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

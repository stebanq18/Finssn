import { maskValue, type DataType } from "./mask";

export interface ParsedEvidence {
  filePath: string | null;
  maskedValue: string;
  dataType: DataType;
  confidence: number;
}

// Card candidates: 13–19 digits, optionally separated by single space or
// hyphen between groups. Surrounding-char check below rejects noise.
const CARD_RE = /(?:\d[ -]?){12,18}\d/g;
const FILE_LINE_RE = /(?:file\s*[:=]\s*)([^\]\r\n]+)/i;

// File-extension signal. EVERY file is analyzed; extension only modulates
// confidence, never excludes a candidate outright.
const DATA_EXTS = new Set([
  "txt", "csv", "tsv", "log", "xlsx", "xls", "xlsm", "docx", "doc",
  "pdf", "rtf", "html", "htm", "xml", "json", "md", "eml", "msg",
  "pptx", "ppt", "odt", "ods", "sql", "bak",
]);
const BINARY_EXTS = new Set([
  "exe", "dll", "bin", "dat", "so", "dylib", "iso", "img", "msi",
  "cab", "sys", "ocx", "pdb", "obj", "o", "class", "jar",
  "png", "jpg", "jpeg", "gif", "bmp", "ico", "tif", "tiff", "webp",
  "mp3", "mp4", "wav", "avi", "mov", "mkv", "zip", "rar", "7z", "gz", "tar",
]);

// Context keywords near the candidate strongly suggest a real card.
const CONTEXT_RE = /\b(card|tarjeta|tarjet|visa|master|mastercard|amex|american\s*express|discover|diners|jcb|credit|cr[eé]dito|debit|d[eé]bito|pan|cardholder|titular|cvv|cvc|cvn|exp(?:ir)?|venc|holder|account|cuenta|n[uú]mero)\b/i;

function extOf(path: string | null): string | null {
  if (!path) return null;
  const m = path.toLowerCase().match(/\.([a-z0-9]{1,8})$/);
  return m ? m[1] : null;
}

function extScore(path: string | null): number {
  const e = extOf(path);
  if (!e) return 0;
  if (DATA_EXTS.has(e)) return 2;
  if (BINARY_EXTS.has(e)) return -2;
  return -1;
}

function luhn(num: string): boolean {
  let sum = 0;
  let alt = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let n = parseInt(num[i], 10);
    if (alt) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

function validBin(d: string): boolean {
  const len = d.length;
  if (d[0] === "4") return len === 13 || len === 16 || len === 19;
  if (len === 16) {
    const p2 = parseInt(d.slice(0, 2), 10);
    if (p2 >= 51 && p2 <= 55) return true;
    const p4 = parseInt(d.slice(0, 4), 10);
    if (p4 >= 2221 && p4 <= 2720) return true;
  }
  if (len === 15) {
    const p2 = parseInt(d.slice(0, 2), 10);
    if (p2 === 34 || p2 === 37) return true;
  }
  if (len === 16 || len === 19) {
    if (d.startsWith("6011")) return true;
    if (d.startsWith("65")) return true;
    const p3 = parseInt(d.slice(0, 3), 10);
    if (p3 >= 644 && p3 <= 649) return true;
  }
  if (len === 14) {
    if (d.startsWith("36") || d.startsWith("38")) return true;
    const p3 = parseInt(d.slice(0, 3), 10);
    if (p3 >= 300 && p3 <= 305) return true;
  }
  if (len >= 16 && len <= 19) {
    const p4 = parseInt(d.slice(0, 4), 10);
    if (p4 >= 3528 && p4 <= 3589) return true;
  }
  return false;
}

function isTrivial(d: string): boolean {
  if (/^(\d)\1+$/.test(d)) return true;
  const asc = "0123456789";
  if (asc.includes(d) || asc.repeat(3).includes(d)) return true;
  const desc = "9876543210";
  if (desc.includes(d) || desc.repeat(3).includes(d)) return true;
  const counts: Record<string, number> = {};
  for (const c of d) counts[c] = (counts[c] ?? 0) + 1;
  const max = Math.max(...Object.values(counts));
  if (max / d.length > 0.7) return true;
  return false;
}

// Heuristic: lines pulled from binaries often have many non-printable chars.
function looksBinary(line: string): boolean {
  if (line.length < 8) return false;
  let bad = 0;
  for (const c of line) {
    const code = c.charCodeAt(0);
    if (code < 9 || (code > 13 && code < 32) || code === 127) bad++;
  }
  return bad / line.length > 0.15;
}

// Minimum total score to keep a candidate. BIN(+2)+Luhn(+2)=4 baseline; we
// require at least one strong additional signal (grouped format, context, or
// data-friendly extension) to consider it "very likely a real card".
const MIN_CONFIDENCE = 6;

export function parseFindSsnsTxt(txt: string): ParsedEvidence[] {
  const lines = txt.split(/\r?\n/);
  // dedupe per (file, masked) keeping the highest confidence seen.
  const byKey = new Map<string, ParsedEvidence>();
  let currentFile: string | null = null;

  for (const line of lines) {
    if (!line.trim()) continue;

    const fileMatch = line.match(FILE_LINE_RE);
    if (fileMatch) {
      currentFile = fileMatch[1].trim().replace(/[\]"]+$/, "");
      continue;
    }

    const fileSignal = extScore(currentFile);
    const lineHasContext = CONTEXT_RE.test(line);
    const lineLooksBinary = looksBinary(line);

    let m: RegExpExecArray | null;
    CARD_RE.lastIndex = 0;
    while ((m = CARD_RE.exec(line))) {
      const raw = m[0];
      const start = m.index;
      const end = start + raw.length;
      const before = start > 0 ? line[start - 1] : "";
      const after = end < line.length ? line[end] : "";
      // Reject when adjacent chars indicate masked/concatenated tokens or
      // numeric noise (thousand separators, decimals).
      if (/[\d*xX,.]/.test(before) || /[\d*xX,.]/.test(after)) continue;
      if (/[*xX,.]/.test(raw)) continue;

      const digits = raw.replace(/[ -]/g, "");
      if (digits.length < 13 || digits.length > 19) continue;
      if (isTrivial(digits)) continue;
      if (!validBin(digits)) continue;
      if (!luhn(digits)) continue;

      // Confidence score.
      let score = 4; // BIN + Luhn baseline
      const grouped =
        /^\d{4}[ -]\d{4}[ -]\d{4}[ -]\d{1,4}$/.test(raw) ||
        /^\d{4}[ -]\d{6}[ -]\d{5}$/.test(raw);
      if (grouped) score += 3;
      if (lineHasContext) score += 2;
      score += fileSignal;
      if (lineLooksBinary) score -= 2;

      if (score < MIN_CONFIDENCE) continue;

      const masked = maskValue(digits, "card");
      const key = `card:${currentFile}:${masked}`;
      const existing = byKey.get(key);
      if (existing && existing.confidence >= score) continue;
      byKey.set(key, {
        filePath: currentFile,
        maskedValue: masked,
        dataType: "card",
        confidence: score,
      });
    }
  }

  // Most likely first.
  return Array.from(byKey.values()).sort((a, b) => b.confidence - a.confidence);
}
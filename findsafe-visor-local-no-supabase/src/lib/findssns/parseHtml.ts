import { classifyRisk, type RiskLevel } from "./risk";

export interface ParsedFile {
  filePath: string;
  fileExtension: string | null;
  matchCount: number;
  riskLevel: RiskLevel;
}

// Parses Find_SSNs HTML report. The real format uses:
// - First <tr> as header row using <td> (not <th>) with column labels
//   "Suspect Number Count", "File Extension", "File Path".
// - Path cell contains an <a href="file:///C:\..."> with placeholder text "@".
// - Count cell may show a number or a sentinel "*" linking to the .txt report.
//   When non-numeric, we fall back to the count of evidences for that path.
export function parseFindSsnsHtml(
  html: string,
  evidenceCountByPath?: Map<string, number>,
): ParsedFile[] {
  if (typeof window === "undefined") {
    throw new Error("parseFindSsnsHtml must be called in the browser");
  }
  const doc = new DOMParser().parseFromString(html, "text/html");
  const tables = Array.from(doc.querySelectorAll("table"));
  const out: ParsedFile[] = [];

  for (const table of tables) {
    const rows = Array.from(table.querySelectorAll("tr"));
    if (rows.length < 2) continue;

    // Header row: accept <th> OR <td> in the first row.
    const headerRow = rows[0];
    const headerCells = Array.from(headerRow.querySelectorAll("th, td")).map(
      (c) => (c.textContent || "").trim().toLowerCase(),
    );
    if (headerCells.length === 0) continue;

    const countIdx = headerCells.findIndex((h) =>
      /suspect.*count|matches|coincidencias/.test(h),
    );
    const extIdx = headerCells.findIndex((h) => /extension|extensión/.test(h));
    const pathIdx = headerCells.findIndex((h) =>
      /file\s*path|path|ruta/.test(h),
    );

    if (countIdx === -1 || pathIdx === -1) continue;

    for (const row of rows.slice(1)) {
      const tds = Array.from(row.querySelectorAll("td"));
      if (tds.length === 0) continue;

      const pathCell = tds[pathIdx];
      const countCell = tds[countIdx];
      const extCell = extIdx >= 0 ? tds[extIdx] : undefined;
      if (!pathCell || !countCell) continue;

      // Path: prefer <a href>, normalize file:/// URLs to Windows paths.
      const pathHref = pathCell.querySelector("a")?.getAttribute("href") ?? "";
      let path = "";
      if (pathHref) {
        try {
          path = decodeURIComponent(pathHref.replace(/^file:\/\/\/?/i, ""));
        } catch {
          path = pathHref.replace(/^file:\/\/\/?/i, "");
        }
      }
      if (!path) path = (pathCell.textContent || "").trim();
      if (!path || path === "@") continue;

      // Count: parse digits from cell or inner <a>; fallback to evidence count.
      const countText =
        (countCell.querySelector("a")?.textContent || countCell.textContent || "").trim();
      const digits = countText.match(/\d+/);
      let count: number;
      if (digits) {
        count = parseInt(digits[0], 10);
      } else {
        count = evidenceCountByPath?.get(path) ?? 1;
      }
      if (!Number.isFinite(count) || count <= 0) continue;

      // Extension: use cell text unless empty/placeholder.
      let ext: string | null = null;
      const extText = (extCell?.textContent || "").trim().toLowerCase();
      if (extText && extText !== "x") {
        ext = extText.replace(/^\./, "");
      } else {
        ext = path.split(/[.\\/]/).pop()?.toLowerCase() ?? null;
        if (ext && ext.includes(":")) ext = null;
      }
      // Sanitize: only keep short, alphanumeric extensions.
      if (ext && (ext.length > 16 || !/^[a-z0-9]+$/.test(ext))) ext = null;

      out.push({
        filePath: path,
        fileExtension: ext,
        matchCount: count,
        riskLevel: classifyRisk(count),
      });
    }
  }

  // dedupe by filePath, keep max count
  const byPath = new Map<string, ParsedFile>();
  for (const f of out) {
    const existing = byPath.get(f.filePath);
    if (!existing || existing.matchCount < f.matchCount) byPath.set(f.filePath, f);
  }
  return Array.from(byPath.values()).filter((f) => f.matchCount > 0);
}
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Upload, FileText, FileCode2, Loader2, CheckCircle2 } from "lucide-react";
import { parseFindSsnsHtml } from "@/lib/findssns/parseHtml";
import { parseFindSsnsTxt } from "@/lib/findssns/parseTxt";
import { classifyRisk } from "@/lib/findssns/risk";
import { processScan } from "@/lib/scans.functions";

export const Route = createFileRoute("/upload")({
  head: () => ({
    meta: [
      { title: "Cargar reporte — Find_SSNs Console" },
      { name: "description", content: "Sube HTML y TXT generados por Find_SSNs para procesarlos." },
    ],
  }),
  component: UploadPage,
});

function UploadPage() {
  const router = useRouter();
  const processFn = useServerFn(processScan);
  const [html, setHtml] = useState<File | null>(null);
  const [txt, setTxt] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "processing" | "done">("idle");
  const [summary, setSummary] = useState<{ files: number; evidences: number } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!html || !txt) {
      toast.error("Debes seleccionar ambos archivos (HTML y TXT).");
      return;
    }
    setStatus("processing");
    try {
      const [htmlText, txtText] = await Promise.all([html.text(), txt.text()]);
      const evidences = parseFindSsnsTxt(txtText);

      // Build path -> evidence count for the HTML parser fallback.
      const evidenceCountByPath = new Map<string, number>();
      for (const ev of evidences) {
        if (!ev.filePath) continue;
        evidenceCountByPath.set(
          ev.filePath,
          (evidenceCountByPath.get(ev.filePath) ?? 0) + 1,
        );
      }

      const parsedFiles = parseFindSsnsHtml(htmlText, evidenceCountByPath);
      if (parsedFiles.length === 0) {
        throw new Error("El HTML no contiene filas válidas (Suspect Number Count / File Path).");
      }

      // Asocia evidencias a archivos por path; sino, al primer archivo.
      const evidencesByPath = new Map<string, typeof evidences>();
      for (const ev of evidences) {
        const key = ev.filePath ?? "__unassigned__";
        const arr = evidencesByPath.get(key) ?? [];
        arr.push(ev);
        evidencesByPath.set(key, arr);
      }
      const unassigned = evidencesByPath.get("__unassigned__") ?? [];
      const filesPayload = parsedFiles.map((f, i) => {
        const direct = evidencesByPath.get(f.filePath) ?? [];
        const extra = i === 0 ? unassigned : [];
        return {
          filePath: f.filePath,
          fileExtension: f.fileExtension,
          matchCount: f.matchCount,
          riskLevel: f.riskLevel,
          evidences: [...direct, ...extra].slice(0, 200).map((ev) => ({
            maskedValue: ev.maskedValue,
            dataType: ev.dataType,
          })),
        };
      });

      const totalMatches = parsedFiles.reduce((s, f) => s + f.matchCount, 0);
      const scanRisk = classifyRisk(totalMatches);
      const sourceKey = html.name.replace(/\.html?$/i, "").trim() || `scan-${Date.now()}`;

      const result = await processFn({
        data: {
          sourceKey,
          htmlFilename: html.name,
          txtFilename: txt.name,
          files: filesPayload,
          totalMatches,
          scanRisk,
        },
      });

      setSummary({ files: result.files, evidences: result.evidences });
      setStatus("done");
      toast.success(`Reporte procesado: ${result.files} archivos, ${result.evidences} evidencias.`);
      router.invalidate();
    } catch (err) {
      setStatus("idle");
      toast.error(err instanceof Error ? err.message : "Error al procesar.");
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Cargar reporte Find_SSNs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Selecciona el HTML del reporte y el TXT asociado. Los datos sensibles se
          anonimizan antes de almacenarse (primeros 4 + últimos 4).
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border border-border bg-card p-6"
      >
        <FilePicker
          label="Archivo HTML"
          icon={<FileCode2 className="h-4 w-4" />}
          accept=".html,.htm,text/html"
          file={html}
          onChange={setHtml}
        />
        <FilePicker
          label="Archivo TXT"
          icon={<FileText className="h-4 w-4" />}
          accept=".txt,text/plain"
          file={txt}
          onChange={setTxt}
        />

        <button
          type="submit"
          disabled={status === "processing"}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          {status === "processing" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Procesando…
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" /> Procesar
            </>
          )}
        </button>

        {summary ? (
          <div className="flex items-start gap-3 rounded-md border border-risk-low/40 bg-risk-low/10 p-3 text-sm">
            <CheckCircle2 className="mt-0.5 h-4 w-4 text-risk-low" />
            <div>
              <p className="font-medium text-foreground">Reporte guardado.</p>
              <p className="text-muted-foreground">
                {summary.files} archivos · {summary.evidences} evidencias anonimizadas.
              </p>
            </div>
          </div>
        ) : null}
      </form>

      <div className="rounded-xl border border-border bg-card/40 p-4 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">Política de carga</p>
        <ul className="mt-2 list-disc space-y-1 pl-4">
          <li>El sistema reemplaza cualquier carga previa con el mismo nombre de HTML.</li>
          <li>Las evidencias se guardan enmascaradas; el valor original no se persiste.</li>
          <li>Se analizan <strong>todas las extensiones</strong>; solo se muestran las evidencias con mayor probabilidad de ser tarjeta.</li>
          <li>Cada candidato se puntúa: Luhn + BIN real (Visa/MC/Amex/Discover/Diners/JCB), formato agrupado 4-4-4-4, palabras clave cercanas (visa, cvv, tarjeta…) y tipo de archivo.</li>
          <li>Se descartan candidatos con comas, asteriscos, "x", puntos o dígitos adyacentes (típicos falsos positivos).</li>
        </ul>
      </div>
    </div>
  );
}

function FilePicker({
  label,
  icon,
  accept,
  file,
  onChange,
}: {
  label: string;
  icon: React.ReactNode;
  accept: string;
  file: File | null;
  onChange: (f: File | null) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-2 text-sm font-medium text-foreground">
        {icon}
        {label}
      </span>
      <div className="flex items-center gap-3 rounded-md border border-dashed border-border bg-background/40 p-3">
        <input
          type="file"
          accept={accept}
          onChange={(e) => onChange(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-foreground hover:file:bg-secondary/80"
        />
      </div>
      {file ? (
        <p className="mt-1 text-xs text-muted-foreground">
          {file.name} · {(file.size / 1024).toFixed(1)} KB
        </p>
      ) : null}
    </label>
  );
}
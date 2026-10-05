import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { getEvidences } from "@/lib/scans.functions";
import { downloadCsv } from "@/lib/export-csv";

export const Route = createFileRoute("/evidences")({
  head: () => ({
    meta: [
      { title: "Evidencias — Find_SSNs Console" },
      { name: "description", content: "Fragmentos anonimizados detectados por Find_SSNs." },
    ],
  }),
  component: EvidencesPage,
});

type EvidenceRow = {
  id: string;
  masked_value: string;
  data_type: string;
  scan_files: { file_path: string; scans: { source_key: string } | null } | null;
};

function EvidencesPage() {
  const fetchFn = useServerFn(getEvidences);
  const { data } = useQuery({ queryKey: ["evidences"], queryFn: () => fetchFn() });
  const evidences = (data?.evidences ?? []) as unknown as EvidenceRow[];
  const [filter, setFilter] = useState<"all" | "card">("all");

  const filtered = evidences.filter((e) => filter === "all" || e.data_type === filter);

  if (evidences.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Evidencias" />
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Evidencias anonimizadas"
        description="Fragmentos sensibles detectados (siempre enmascarados)."
        onExport={() =>
          downloadCsv(
            "evidencias.csv",
            filtered.map((e) => ({
              tipo: e.data_type,
              valor: e.masked_value,
              archivo: e.scan_files?.file_path ?? "",
              equipo: e.scan_files?.scans?.source_key ?? "",
            })),
          )
        }
      />

      <div className="flex gap-2">
        {(["all", "card"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`rounded-md border px-3 py-1.5 text-xs font-medium uppercase tracking-wide transition-colors ${
              filter === k
                ? "border-primary bg-primary/15 text-primary"
                : "border-border bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {k === "all" ? "Todos" : "Tarjetas"}
          </button>
        ))}
        <span className="ml-auto self-center text-xs text-muted-foreground">
          {filtered.length.toLocaleString("es-CO")} evidencias
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Tipo</th>
              <th className="px-4 py-3 text-left">Valor anonimizado</th>
              <th className="px-4 py-3 text-left">Archivo</th>
              <th className="px-4 py-3 text-left">Equipo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.slice(0, 500).map((e) => (
              <tr key={e.id} className="hover:bg-secondary/30">
                <td className="px-4 py-3 uppercase text-muted-foreground">{e.data_type}</td>
                <td className="px-4 py-3 font-mono text-xs">{e.masked_value}</td>
                <td className="max-w-md truncate px-4 py-3 font-mono text-xs text-muted-foreground" title={e.scan_files?.file_path}>
                  {e.scan_files?.file_path ?? "—"}
                </td>
                <td className="px-4 py-3 text-xs">{e.scan_files?.scans?.source_key ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length > 500 ? (
          <div className="border-t border-border bg-secondary/30 px-4 py-2 text-xs text-muted-foreground">
            Mostrando 500 de {filtered.length}. Exporta a CSV para el conjunto completo.
          </div>
        ) : null}
      </div>
    </div>
  );
}
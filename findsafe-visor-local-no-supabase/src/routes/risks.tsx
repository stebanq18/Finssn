import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { RiskBadge } from "@/components/RiskBadge";
import { useDashboard } from "@/hooks/use-dashboard";
import { downloadCsv } from "@/lib/export-csv";
import type { RiskLevel } from "@/lib/findssns/risk";

export const Route = createFileRoute("/risks")({
  head: () => ({
    meta: [
      { title: "Top Riesgos — Find_SSNs Console" },
      { name: "description", content: "Archivos con mayor número de coincidencias." },
    ],
  }),
  component: RisksPage,
});

function RisksPage() {
  const { data } = useDashboard();
  const files = data?.files ?? [];
  const top = [...files].sort((a, b) => b.match_count - a.match_count).slice(0, 50);

  if (top.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Top Riesgos" description="Archivos ordenados por coincidencias." />
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Top Riesgos"
        description="Los archivos con mayor número de coincidencias detectadas."
        onExport={() =>
          downloadCsv(
            "top-riesgos.csv",
            top.map((f) => ({
              archivo: f.file_path,
              extension: f.file_extension ?? "",
              coincidencias: f.match_count,
              riesgo: f.risk_level,
            })),
          )
        }
      />
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">#</th>
              <th className="px-4 py-3 text-left">Archivo</th>
              <th className="px-4 py-3 text-left">Ext.</th>
              <th className="px-4 py-3 text-right">Coincidencias</th>
              <th className="px-4 py-3 text-left">Riesgo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {top.map((f, i) => (
              <tr key={f.id} className="hover:bg-secondary/30">
                <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                <td className="max-w-md truncate px-4 py-3 font-mono text-xs" title={f.file_path}>
                  {f.file_path}
                </td>
                <td className="px-4 py-3 uppercase text-muted-foreground">{f.file_extension ?? "—"}</td>
                <td className="px-4 py-3 text-right font-medium tabular-nums">{f.match_count.toLocaleString("es-CO")}</td>
                <td className="px-4 py-3">
                  <RiskBadge level={f.risk_level as RiskLevel} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2, Trash } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { RiskBadge } from "@/components/RiskBadge";
import { useDashboard } from "@/hooks/use-dashboard";
import { deleteScan, deleteAllScans } from "@/lib/scans.functions";
import { downloadCsv } from "@/lib/export-csv";
import type { RiskLevel } from "@/lib/findssns/risk";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Historial — Find_SSNs Console" },
      { name: "description", content: "Cargas realizadas en el portal." },
    ],
  }),
  component: HistoryPage,
});

function HistoryPage() {
  const { data } = useDashboard();
  const qc = useQueryClient();
  const delFn = useServerFn(deleteScan);
  const delAllFn = useServerFn(deleteAllScans);
  const scans = data?.scans ?? [];

  if (scans.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Historial" />
        <EmptyState />
      </div>
    );
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este escaneo y sus evidencias?")) return;
    await delFn({ data: { id } });
    toast.success("Escaneo eliminado.");
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    qc.invalidateQueries({ queryKey: ["evidences"] });
  }

  async function handleDeleteAll() {
    if (!confirm("¿Borrar TODO el historial? Esta acción no se puede deshacer.")) return;
    await delAllFn({});
    toast.success("Historial borrado.");
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    qc.invalidateQueries({ queryKey: ["evidences"] });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Historial de cargas"
        description="Cada carga reemplaza la anterior del mismo equipo (origen)."
        onExport={() =>
          downloadCsv(
            "historial.csv",
            scans.map((s) => ({
              fecha: s.uploaded_at,
              equipo: s.source_key,
              html: s.html_filename,
              txt: s.txt_filename,
              coincidencias: s.total_matches,
              riesgo: s.risk_level,
            })),
          )
        }
      />
      <div className="flex justify-end">
        <button
          onClick={handleDeleteAll}
          className="inline-flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/20"
        >
          <Trash className="h-3.5 w-3.5" />
          Borrar historial
        </button>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Fecha</th>
              <th className="px-4 py-3 text-left">Equipo / origen</th>
              <th className="px-4 py-3 text-left">HTML</th>
              <th className="px-4 py-3 text-left">TXT</th>
              <th className="px-4 py-3 text-right">Coincidencias</th>
              <th className="px-4 py-3 text-left">Riesgo</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {scans.map((s) => (
              <tr key={s.id} className="hover:bg-secondary/30">
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {new Date(s.uploaded_at).toLocaleString("es-CO")}
                </td>
                <td className="px-4 py-3 font-medium">{s.source_key}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{s.html_filename}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{s.txt_filename}</td>
                <td className="px-4 py-3 text-right tabular-nums">{s.total_matches.toLocaleString("es-CO")}</td>
                <td className="px-4 py-3"><RiskBadge level={s.risk_level as RiskLevel} /></td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="inline-flex items-center gap-1 rounded-md border border-border bg-secondary px-2 py-1 text-xs text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
import { createFileRoute } from "@tanstack/react-router";
import { ResponsiveContainer, Tooltip, Treemap } from "recharts";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { useDashboard } from "@/hooks/use-dashboard";
import { downloadCsv } from "@/lib/export-csv";

export const Route = createFileRoute("/locations")({
  head: () => ({
    meta: [
      { title: "Ubicaciones — Find_SSNs Console" },
      { name: "description", content: "Top de rutas donde se concentran los hallazgos." },
    ],
  }),
  component: LocationsPage,
});

function topFolder(p: string): string {
  const parts = p.split(/[\\/]/).filter(Boolean);
  return parts.slice(0, 2).join("/") || p;
}

function LocationsPage() {
  const { data } = useDashboard();
  const files = data?.files ?? [];

  if (files.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Ubicaciones" />
        <EmptyState />
      </div>
    );
  }

  const totals = new Map<string, number>();
  for (const f of files) {
    const k = topFolder(f.file_path);
    totals.set(k, (totals.get(k) ?? 0) + f.match_count);
  }
  const rows = Array.from(totals, ([name, size]) => ({ name, size })).sort((a, b) => b.size - a.size).slice(0, 25);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ubicaciones"
        description="Carpetas raíz donde se concentran los hallazgos (treemap)."
        onExport={() => downloadCsv("ubicaciones.csv", rows.map((r) => ({ ruta: r.name, coincidencias: r.size })))}
      />
      <div className="rounded-xl border border-border bg-card p-2">
        <ResponsiveContainer width="100%" height={420}>
          <Treemap
            data={rows}
            dataKey="size"
            stroke="var(--color-background)"
            fill="oklch(0.55 0.12 220)"
          >
            <Tooltip
              contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }}
              formatter={(v: number) => [v.toLocaleString("es-CO"), "coincidencias"]}
            />
          </Treemap>
        </ResponsiveContainer>
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Ruta</th>
              <th className="px-4 py-3 text-right">Coincidencias</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.name}>
                <td className="px-4 py-3 font-mono text-xs">{r.name}</td>
                <td className="px-4 py-3 text-right tabular-nums">{r.size.toLocaleString("es-CO")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
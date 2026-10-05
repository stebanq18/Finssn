import { createFileRoute } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { useDashboard } from "@/hooks/use-dashboard";
import { downloadCsv } from "@/lib/export-csv";

export const Route = createFileRoute("/extensions")({
  head: () => ({
    meta: [
      { title: "Extensiones — Find_SSNs Console" },
      { name: "description", content: "Distribución de hallazgos por tipo de archivo." },
    ],
  }),
  component: ExtensionsPage,
});

function ExtensionsPage() {
  const { data } = useDashboard();
  const files = data?.files ?? [];

  if (files.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Extensiones" />
        <EmptyState />
      </div>
    );
  }

  const totals = new Map<string, { files: number; matches: number }>();
  for (const f of files) {
    const k = (f.file_extension || "(sin)").toUpperCase();
    const cur = totals.get(k) ?? { files: 0, matches: 0 };
    cur.files += 1;
    cur.matches += f.match_count;
    totals.set(k, cur);
  }
  const rows = Array.from(totals, ([ext, v]) => ({ ext, ...v })).sort((a, b) => b.matches - a.matches);
  const totalFiles = files.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Distribución por extensión"
        description="Tipos de archivo donde se concentran los hallazgos."
        onExport={() =>
          downloadCsv(
            "extensiones.csv",
            rows.map((r) => ({ extension: r.ext, archivos: r.files, coincidencias: r.matches })),
          )
        }
      />
      <div className="rounded-xl border border-border bg-card p-5">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={rows} layout="vertical" margin={{ left: 30 }}>
            <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" stroke="var(--color-muted-foreground)" fontSize={12} />
            <YAxis type="category" dataKey="ext" stroke="var(--color-muted-foreground)" fontSize={12} width={80} />
            <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 8 }} cursor={{ fill: "var(--color-secondary)" }} />
            <Bar dataKey="matches" radius={[0, 6, 6, 0]} name="Coincidencias">
              {rows.map((_, i) => (
                <Cell key={i} fill={`oklch(0.7 0.15 ${(i * 38) % 360})`} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-secondary/50 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Extensión</th>
              <th className="px-4 py-3 text-right">Archivos</th>
              <th className="px-4 py-3 text-right">% archivos</th>
              <th className="px-4 py-3 text-right">Coincidencias</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r) => (
              <tr key={r.ext}>
                <td className="px-4 py-3 font-medium">{r.ext}</td>
                <td className="px-4 py-3 text-right tabular-nums">{r.files}</td>
                <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                  {((r.files / totalFiles) * 100).toFixed(1)}%
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{r.matches.toLocaleString("es-CO")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
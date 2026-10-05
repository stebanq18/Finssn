import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingUp, TrendingDown, Minus, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { RiskBadge } from "@/components/RiskBadge";
import { useDashboard } from "@/hooks/use-dashboard";
import { RISK_LABEL, RISK_ORDER, maxRisk, type RiskLevel } from "@/lib/findssns/risk";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Find_SSNs Console" },
      { name: "description", content: "Resumen ejecutivo de hallazgos sensibles detectados." },
    ],
  }),
  component: DashboardPage,
});

const RISK_COLORS: Record<RiskLevel, string> = {
  bajo: "oklch(0.7 0.17 145)",
  medio: "oklch(0.78 0.16 85)",
  alto: "oklch(0.72 0.2 45)",
  critico: "oklch(0.62 0.24 27)",
};

const TOOLTIP_STYLE = {
  background: "var(--color-card)",
  border: "1px solid var(--color-border)",
  borderRadius: 8,
  color: "var(--color-foreground)",
};
const TOOLTIP_ITEM = { color: "var(--color-foreground)" };

function DashboardPage() {
  const { data } = useDashboard();
  const scans = data?.scans ?? [];
  const files = data?.files ?? [];
  const evidences = data?.evidences ?? [];
  const [team, setTeam] = useState<string>("__all__");

  if (files.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader title="Dashboard" description="Resumen ejecutivo de hallazgos." />
        <EmptyState />
      </div>
    );
  }

  // Equipos disponibles para filtrar.
  const allTeams = useMemo(
    () => Array.from(new Set(scans.map((s) => s.source_key))).sort(),
    [scans],
  );

  // Filtrado por equipo.
  const fScans = team === "__all__" ? scans : scans.filter((s) => s.source_key === team);
  const scanIds = new Set(fScans.map((s) => s.id));
  const scanIdToTeam = new Map(scans.map((s) => [s.id, s.source_key]));
  const fFiles = files.filter((f) => scanIds.has(f.scan_id));
  const fileIds = new Set(fFiles.map((f) => f.id));
  const fEvidences = evidences.filter((e) => fileIds.has(e.scan_file_id));

  const totalMatches = fScans.reduce((s, x) => s + x.total_matches, 0);
  const peak = fScans.length
    ? maxRisk(fScans.map((s) => s.risk_level as RiskLevel))
    : ("bajo" as RiskLevel);
  const critical = fFiles.filter((f) => f.risk_level === "critico").length;

  // KPIs nuevos.
  const uniqueCards = new Set(
    fEvidences.filter((e) => e.data_type === "card").map((e) => e.masked_value),
  ).size;

  // Delta vs. carga inmediatamente anterior (mismo equipo si está filtrado).
  const sortedByDate = [...fScans].sort(
    (a, b) => new Date(a.uploaded_at).getTime() - new Date(b.uploaded_at).getTime(),
  );
  const last = sortedByDate[sortedByDate.length - 1];
  const prev = sortedByDate[sortedByDate.length - 2];
  const matchesDelta = last && prev ? last.total_matches - prev.total_matches : null;

  // Distribuciones.
  const riskData = RISK_ORDER.map((r) => ({
    name: RISK_LABEL[r],
    value: fFiles.filter((f) => f.risk_level === r).length,
    color: RISK_COLORS[r],
  }));

  const extensionData = (() => {
    const m = new Map<string, number>();
    for (const f of fFiles) {
      const k = (f.file_extension || "(sin)").toUpperCase();
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return Array.from(m, ([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  })();

  // Evolución temporal (escaneos ordenados por fecha).
  const timeline = sortedByDate.map((s) => ({
    name: `${s.source_key} · ${new Date(s.uploaded_at).toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "2-digit",
    })}`,
    coincidencias: s.total_matches,
    criticos: files.filter((f) => f.scan_id === s.id && f.risk_level === "critico").length,
  }));

  // Ranking por equipo (barras apiladas por nivel de riesgo).
  const teamRanking = (() => {
    const m = new Map<string, Record<RiskLevel, number>>();
    for (const f of fFiles) {
      const t = scanIdToTeam.get(f.scan_id) ?? "—";
      const cur = m.get(t) ?? { bajo: 0, medio: 0, alto: 0, critico: 0 };
      cur[f.risk_level as RiskLevel] += 1;
      m.set(t, cur);
    }
    return Array.from(m, ([equipo, v]) => ({
      equipo,
      ...v,
      total: v.bajo + v.medio + v.alto + v.critico,
    }))
      .sort((a, b) => b.critico - a.critico || b.alto - a.alto || b.total - a.total)
      .slice(0, 10);
  })();

  // Top 10 archivos críticos accionables.
  const topCritical = [...fFiles]
    .sort((a, b) => b.match_count - a.match_count)
    .slice(0, 10)
    .map((f) => ({ ...f, team: scanIdToTeam.get(f.scan_id) ?? "—" }));

  return (
    <div className="space-y-8">
      <PageHeader title="Dashboard" description="Visión global y accionable de los hallazgos." />

      {/* Filtros globales */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card/40 p-3">
        <span className="text-xs uppercase tracking-wider text-muted-foreground">Equipo</span>
        <select
          value={team}
          onChange={(e) => setTeam(e.target.value)}
          className="rounded-md border border-border bg-background px-2.5 py-1 text-sm text-foreground"
        >
          <option value="__all__">Todos ({allTeams.length})</option>
          {allTeams.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <span className="ml-auto text-xs text-muted-foreground">
          {fScans.length} escaneos · {fFiles.length} archivos
        </span>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Kpi label="Equipos" value={team === "__all__" ? allTeams.length : 1} />
        <Kpi label="Archivos" value={fFiles.length} />
        <Kpi
          label="Coincidencias"
          value={totalMatches.toLocaleString("es-CO")}
          delta={matchesDelta}
          deltaHint="vs. carga anterior"
        />
        <Kpi
          label="Tarjetas únicas"
          value={uniqueCards.toLocaleString("es-CO")}
          hint="PAN enmascarados distintos"
        />
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Riesgo máximo</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight">{critical}</p>
          <p className="mt-1 text-xs text-muted-foreground">archivos críticos</p>
          <div className="mt-2">
            <RiskBadge level={peak} />
          </div>
        </div>
      </section>

      {/* Evolución temporal */}
      {timeline.length >= 2 ? (
        <Card title="Evolución de hallazgos por escaneo">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={timeline}>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
              <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={11} />
              <YAxis
                yAxisId="left"
                stroke="var(--color-muted-foreground)"
                fontSize={12}
                allowDecimals={false}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="var(--color-muted-foreground)"
                fontSize={12}
                allowDecimals={false}
              />
              <Tooltip contentStyle={TOOLTIP_STYLE} itemStyle={TOOLTIP_ITEM} labelStyle={TOOLTIP_ITEM} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="coincidencias"
                stroke={RISK_COLORS.alto}
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="criticos"
                stroke={RISK_COLORS.critico}
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      ) : null}

      {/* Ranking equipos + Top críticos */}
      <section className="grid gap-6 lg:grid-cols-2">
        <Card title="Ranking de equipos por nivel de riesgo">
          {teamRanking.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin datos para el filtro actual.</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(220, teamRanking.length * 32)}>
              <BarChart data={teamRanking} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" stroke="var(--color-muted-foreground)" fontSize={12} allowDecimals={false} />
                <YAxis type="category" dataKey="equipo" stroke="var(--color-muted-foreground)" fontSize={12} width={100} />
                <Tooltip contentStyle={TOOLTIP_STYLE} itemStyle={TOOLTIP_ITEM} labelStyle={TOOLTIP_ITEM} cursor={{ fill: "var(--color-secondary)" }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="bajo" stackId="r" fill={RISK_COLORS.bajo} name="Bajo" />
                <Bar dataKey="medio" stackId="r" fill={RISK_COLORS.medio} name="Medio" />
                <Bar dataKey="alto" stackId="r" fill={RISK_COLORS.alto} name="Alto" />
                <Bar dataKey="critico" stackId="r" fill={RISK_COLORS.critico} name="Crítico" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="Top 10 archivos críticos">
          {topCritical.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin archivos para el filtro actual.</p>
          ) : (
            <div className="space-y-1.5">
              {topCritical.map((f, i) => (
                <div
                  key={f.id}
                  className="flex items-center gap-3 rounded-md border border-border/60 bg-background/40 px-3 py-2 text-xs"
                >
                  <span className="w-4 shrink-0 text-muted-foreground">{i + 1}</span>
                  <span className="flex-1 truncate font-mono" title={f.file_path}>
                    {f.file_path}
                  </span>
                  <span className="hidden shrink-0 text-muted-foreground sm:inline">{f.team}</span>
                  <span className="shrink-0 tabular-nums font-medium">
                    {f.match_count.toLocaleString("es-CO")}
                  </span>
                  <RiskBadge level={f.risk_level as RiskLevel} />
                </div>
              ))}
              <Link
                to="/risks"
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                Ver ranking completo <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          )}
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card title="Archivos por nivel de riesgo">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={riskData}>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" stroke="var(--color-muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--color-muted-foreground)" fontSize={12} allowDecimals={false} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                itemStyle={TOOLTIP_ITEM}
                labelStyle={TOOLTIP_ITEM}
                cursor={{ fill: "var(--color-secondary)" }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {riskData.map((d) => <Cell key={d.name} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Distribución por extensión">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={extensionData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={2}>
                {extensionData.map((_, i) => (
                  <Cell key={i} fill={`oklch(0.7 0.15 ${(i * 38) % 360})`} />
                ))}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} itemStyle={TOOLTIP_ITEM} labelStyle={TOOLTIP_ITEM} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </section>
    </div>
  );
}

function Kpi({
  label,
  value,
  delta,
  deltaHint,
  hint,
}: {
  label: string;
  value: number | string;
  delta?: number | null;
  deltaHint?: string;
  hint?: string;
}) {
  const showDelta = delta !== undefined && delta !== null;
  const Icon = !showDelta ? null : delta! > 0 ? TrendingUp : delta! < 0 ? TrendingDown : Minus;
  const deltaColor =
    !showDelta || delta === 0
      ? "text-muted-foreground"
      : delta! > 0
      ? "text-risk-critical"
      : "text-risk-low";
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
      {showDelta && Icon ? (
        <p className={`mt-1 flex items-center gap-1 text-xs ${deltaColor}`}>
          <Icon className="h-3.5 w-3.5" />
          {delta! > 0 ? "+" : ""}
          {delta!.toLocaleString("es-CO")} {deltaHint ?? ""}
        </p>
      ) : hint ? (
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="mb-4 text-sm font-medium text-foreground">{title}</p>
      {children}
    </div>
  );
}
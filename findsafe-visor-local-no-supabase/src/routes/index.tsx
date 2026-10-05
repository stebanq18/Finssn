import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDashboardData } from "@/lib/scans.functions";
import { maxRisk, type RiskLevel } from "@/lib/findssns/risk";
import { RiskBadge } from "@/components/RiskBadge";
import { Upload, BarChart3, AlertTriangle, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const fetchData = useServerFn(getDashboardData);
  const { data } = useQuery({ queryKey: ["dashboard"], queryFn: () => fetchData() });

  const scans = data?.scans ?? [];
  const files = data?.files ?? [];
  const totalMatches = scans.reduce((s, x) => s + x.total_matches, 0);
  const critical = files.filter((f) => f.risk_level === "critico").length;
  const peakRisk = scans.length
    ? maxRisk(scans.map((s) => s.risk_level as RiskLevel))
    : ("bajo" as RiskLevel);

  return (
    <div className="space-y-10">
      <section className="rounded-2xl border border-border bg-gradient-to-br from-card via-card to-accent/40 p-10">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs uppercase tracking-widest text-primary">
            <ShieldAlert className="h-3.5 w-3.5" /> Seguridad TI
          </span>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight">
            Visualización y priorización de hallazgos Find_SSNs.
          </h1>
          <p className="mt-3 text-muted-foreground">
            Importa los reportes HTML+TXT generados por la herramienta,
            anonimiza automáticamente los fragmentos sensibles y prioriza por
            nivel de riesgo desde una sola consola.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/upload"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Upload className="h-4 w-4" /> Cargar reporte
            </Link>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-secondary px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary/70"
            >
              <BarChart3 className="h-4 w-4" /> Ver dashboard
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Equipos analizados" value={scans.length} />
        <Kpi label="Archivos con hallazgos" value={files.length} />
        <Kpi label="Coincidencias totales" value={totalMatches.toLocaleString("es-CO")} />
        <Kpi
          label="Archivos críticos"
          value={critical}
          accent={<RiskBadge level={peakRisk} />}
          icon={<AlertTriangle className="h-5 w-5 text-risk-critical" />}
        />
      </section>
    </div>
  );
}

function Kpi({
  label,
  value,
  accent,
  icon,
}: {
  label: string;
  value: number | string;
  accent?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
        {icon}
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
      {accent ? <div className="mt-2">{accent}</div> : null}
    </div>
  );
}

export type RiskLevel = "bajo" | "medio" | "alto" | "critico";

export function classifyRisk(matches: number): RiskLevel {
  if (matches <= 50) return "bajo";
  if (matches <= 200) return "medio";
  if (matches <= 500) return "alto";
  return "critico";
}

export const RISK_LABEL: Record<RiskLevel, string> = {
  bajo: "Bajo",
  medio: "Medio",
  alto: "Alto",
  critico: "Crítico",
};

export const RISK_ORDER: RiskLevel[] = ["bajo", "medio", "alto", "critico"];

export function riskRank(r: RiskLevel): number {
  return RISK_ORDER.indexOf(r);
}

export function maxRisk(levels: RiskLevel[]): RiskLevel {
  return levels.reduce<RiskLevel>(
    (acc, r) => (riskRank(r) > riskRank(acc) ? r : acc),
    "bajo",
  );
}

export const RISK_TOKEN: Record<RiskLevel, string> = {
  bajo: "bg-risk-low/20 text-risk-low border-risk-low/40",
  medio: "bg-risk-medium/20 text-risk-medium border-risk-medium/40",
  alto: "bg-risk-high/20 text-risk-high border-risk-high/40",
  critico: "bg-risk-critical/25 text-risk-critical border-risk-critical/50",
};
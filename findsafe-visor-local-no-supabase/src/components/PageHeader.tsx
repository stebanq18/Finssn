import { Download } from "lucide-react";

export function PageHeader({
  title,
  description,
  onExport,
}: {
  title: string;
  description?: string;
  onExport?: () => void;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border pb-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {onExport ? (
        <button
          onClick={onExport}
          className="inline-flex items-center gap-2 rounded-md border border-border bg-secondary px-3 py-1.5 text-sm text-foreground hover:bg-secondary/70"
        >
          <Download className="h-4 w-4" /> Exportar CSV
        </button>
      ) : null}
    </div>
  );
}
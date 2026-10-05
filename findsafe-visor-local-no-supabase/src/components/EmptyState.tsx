import { Link } from "@tanstack/react-router";
import { Inbox } from "lucide-react";

export function EmptyState({ title = "Sin datos todavía", hint = "Carga un reporte para comenzar." }: { title?: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card/40 py-16 text-center">
      <Inbox className="h-8 w-8 text-muted-foreground" />
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground">{hint}</p>
      <Link to="/upload" className="mt-2 inline-flex rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
        Cargar reporte
      </Link>
    </div>
  );
}
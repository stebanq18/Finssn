import { Link } from "@tanstack/react-router";
import { Shield, Upload, BarChart3, AlertTriangle, FileType2, MapPin, Eye, History } from "lucide-react";

const navItems = [
  { to: "/", label: "Inicio", icon: Shield },
  { to: "/upload", label: "Cargar", icon: Upload },
  { to: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { to: "/risks", label: "Top Riesgos", icon: AlertTriangle },
  { to: "/extensions", label: "Extensiones", icon: FileType2 },
  { to: "/locations", label: "Ubicaciones", icon: MapPin },
  { to: "/evidences", label: "Evidencias", icon: Eye },
  { to: "/history", label: "Historial", icon: History },
] as const;

export function AppHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-6 py-3">
        <Link to="/" className="flex items-center gap-2 text-foreground">
          <Shield className="h-5 w-5 text-primary" />
          <span className="text-sm font-semibold tracking-tight">Find_SSNs · Console</span>
        </Link>
        <nav className="flex flex-1 flex-wrap items-center gap-1 text-sm">
          {navItems.slice(1).map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeProps={{ className: "bg-secondary text-foreground" }}
              inactiveProps={{ className: "text-muted-foreground hover:text-foreground hover:bg-secondary/60" }}
              className="flex items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors"
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </Link>
          ))}
        </nav>
        <span className="hidden text-xs text-muted-foreground md:inline">Portal interno · Seguridad TI</span>
      </div>
    </header>
  );
}
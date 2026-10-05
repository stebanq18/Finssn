import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDashboardData } from "@/lib/scans.functions";

export function useDashboard() {
  const fetchData = useServerFn(getDashboardData);
  return useQuery({ queryKey: ["dashboard"], queryFn: () => fetchData() });
}
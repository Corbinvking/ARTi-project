import { Card, CardContent } from "./ui/card";
import { TrendingUp, Users } from "lucide-react";
import { useVendors } from "../hooks/useVendors";

export function ActiveVendorsCard() {
  const { data: vendors, isLoading } = useVendors();
  
  const activeVendors = vendors?.filter(v => v.is_active) || [];
  const inactiveVendors = vendors?.filter(v => !v.is_active) || [];

  return (
    <div className="metric-card p-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm text-muted-foreground">Active Vendors</h3>
        <Users className="w-4 h-4 text-primary" />
      </div>
      <div className="space-y-1">
        <p className="text-2xl font-bold text-foreground">
          {isLoading ? "..." : activeVendors.length}
        </p>
        <div className="flex items-center space-x-1 text-xs">
          <TrendingUp className="w-3 h-3 text-accent" />
          <span className="text-accent">{inactiveVendors.length} inactive</span>
          <span className="text-muted-foreground">of {vendors?.length || 0} total</span>
        </div>
      </div>
    </div>
  );
}








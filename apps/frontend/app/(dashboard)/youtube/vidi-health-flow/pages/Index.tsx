import Dashboard from "./Dashboard";
import SalespersonDashboard from "./SalespersonDashboard";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { supabase } from "../integrations/supabase/client";

const Index = () => {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Route based on actual user role
  switch (profile?.role) {
    case 'salesperson':
      return <SalespersonDashboard />;
    case 'admin':
    case 'manager':
      return <Dashboard />;
      default:
        return (
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-destructive">No Role Assigned</h1>
              <p className="text-muted-foreground">Your account doesn't have a role assigned.</p>
              <p className="text-muted-foreground">Please contact your administrator to assign a role.</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => supabase.auth.signOut()}
              >
                Sign Out
              </Button>
            </div>
          </div>
        );
  }
};

export default Index;

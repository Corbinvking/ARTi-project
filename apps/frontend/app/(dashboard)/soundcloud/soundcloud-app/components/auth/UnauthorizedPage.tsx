
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, LogOut, Home } from "lucide-react";

export const UnauthorizedPage = () => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-card/95 backdrop-blur-sm border-border shadow-intense">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <CardTitle className="text-2xl font-bold text-destructive">Access Denied</CardTitle>
          <CardDescription>
            Your account ({user?.email}) is not authorized to access this system.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <p className="text-sm text-destructive">
              This email address is not registered as a member or administrator. 
              Please contact support if you believe this is an error.
            </p>
          </div>
          
          <div className="flex flex-col gap-2">
            <Button 
              onClick={handleSignOut}
              className="w-full"
              variant="outline"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
            
            <Button 
              onClick={() => navigate("/")}
              className="w-full"
              variant="secondary"
            >
              <Home className="h-4 w-4 mr-2" />
              Go Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center max-w-md mx-auto p-6">
        <div className="mb-8">
          <h1 className="text-6xl font-bebas tracking-wider text-foreground mb-4">404</h1>
          <h2 className="text-2xl font-medium text-foreground mb-2">Page Not Found</h2>
          <p className="text-muted-foreground mb-6">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild>
            <Link to="/dashboard" className="flex items-center gap-2">
              <Home className="h-4 w-4" />
              Go to Dashboard
            </Link>
          </Button>
          <Button variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
        
        <div className="mt-8 text-xs text-muted-foreground">
          If you think this is an error, please contact support.
        </div>
      </div>
    </div>
  );
};

export default NotFound;

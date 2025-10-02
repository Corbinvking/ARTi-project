import { Card, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Calendar, Filter, X } from "lucide-react";

export const FilterPanel = () => {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filters:</span>
          </div>
          
          <Badge variant="secondary" className="cursor-pointer">
            <Calendar className="h-3 w-3 mr-1" />
            Last 30 days
            <X className="h-3 w-3 ml-1" />
          </Badge>
          
          <Badge variant="secondary" className="cursor-pointer">
            Status: Active
            <X className="h-3 w-3 ml-1" />
          </Badge>
          
          <Button variant="outline" size="sm">
            Add Filter
          </Button>
          
          <Button variant="ghost" size="sm">
            Clear All
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};








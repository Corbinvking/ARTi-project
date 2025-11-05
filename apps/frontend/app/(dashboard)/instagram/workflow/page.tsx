"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Play, Pause } from "lucide-react";

export default function InstagramWorkflowPage() {
  // Placeholder workflows
  const workflows = [
    {
      id: 1,
      name: "Auto-schedule when paid",
      description: "Automatically schedule posts when payment is confirmed",
      enabled: true,
      executions: 156
    },
    {
      id: 2,
      name: "Auto-pending approval when posted",
      description: "Move to pending approval when creator posts content",
      enabled: true,
      executions: 243
    },
    {
      id: 3,
      name: "Escalate overdue items",
      description: "Automatically escalate items past their deadline",
      enabled: false,
      executions: 42
    }
  ];

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">Workflow Automation</h1>
          <p className="text-muted-foreground">
            Manage automated workflows and business rules
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Workflow
        </Button>
      </div>

      <div className="grid gap-6">
        {workflows.map((workflow) => (
          <Card key={workflow.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>{workflow.name}</CardTitle>
                  <CardDescription>{workflow.description}</CardDescription>
                </div>
                <Badge variant={workflow.enabled ? "default" : "secondary"}>
                  {workflow.enabled ? "Enabled" : "Disabled"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground">
                  Executions: <span className="font-medium text-foreground">{workflow.executions}</span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    Edit
                  </Button>
                  <Button variant="outline" size="sm">
                    {workflow.enabled ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}


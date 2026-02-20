"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Lock, CheckCircle, AlertTriangle, Link2, FileCheck } from "lucide-react";

interface BusinessRule {
  name: string;
  description: string;
  type: "system" | "active";
  icon: typeof Shield;
  affects: string[];
}

const stateGatingRules: BusinessRule[] = [
  {
    name: "Payment requires Approval",
    description: "Cannot mark a placement as Paid unless Approval Status is set to Approved. Prevents premature payouts.",
    type: "system",
    icon: Lock,
    affects: ["Campaigns", "QA"],
  },
  {
    name: "Posting requires Approval",
    description: "Cannot mark Post Status as Posted unless Approval Status is set to Approved. Ensures content is reviewed before going live.",
    type: "system",
    icon: Lock,
    affects: ["Campaigns", "QA"],
  },
  {
    name: "Campaign completion gating",
    description: "Cannot mark a campaign as Complete unless all placements are Posted and the Final Report has been sent.",
    type: "system",
    icon: CheckCircle,
    affects: ["Campaigns"],
  },
  {
    name: "Auto-post status on URL add",
    description: "When a Post URL is added to Campaign Posts and linked to a creator, that placement's Post Status automatically moves to Posted.",
    type: "system",
    icon: Link2,
    affects: ["Campaigns"],
  },
];

const escalationRules: BusinessRule[] = [
  {
    name: "Escalate overdue items",
    description: "When a campaign's completion date passes and not all posts from approved creators are in the tracking link, flag the campaign as At Risk and surface it in QA alerts.",
    type: "active",
    icon: AlertTriangle,
    affects: ["QA", "Dashboard"],
  },
];

function RuleCard({ rule }: { rule: BusinessRule }) {
  const Icon = rule.icon;
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="mt-0.5 flex-shrink-0">
            <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
              <Icon className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-sm">{rule.name}</span>
              <Badge variant={rule.type === "system" ? "secondary" : "default"} className="text-[10px]">
                {rule.type === "system" ? "System" : "Active"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-2">{rule.description}</p>
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">Affects:</span>
              {rule.affects.map((tab) => (
                <Badge key={tab} variant="outline" className="text-[10px]">{tab}</Badge>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function InstagramWorkflowPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-4xl font-bold">Business Rules</h1>
        </div>
        <p className="text-muted-foreground">
          State lifecycle rules enforced across all campaigns. These rules prevent operational errors and maintain data integrity.
        </p>
      </div>

      <div className="space-y-8">
        {/* State Gating Rules */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <FileCheck className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">State Gating Rules</h2>
            <Badge variant="secondary" className="text-xs">{stateGatingRules.length} rules</Badge>
          </div>
          <div className="grid gap-3">
            {stateGatingRules.map((rule) => (
              <RuleCard key={rule.name} rule={rule} />
            ))}
          </div>
        </div>

        {/* Escalation Rules */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Escalation Rules</h2>
            <Badge variant="secondary" className="text-xs">{escalationRules.length} rule</Badge>
          </div>
          <div className="grid gap-3">
            {escalationRules.map((rule) => (
              <RuleCard key={rule.name} rule={rule} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

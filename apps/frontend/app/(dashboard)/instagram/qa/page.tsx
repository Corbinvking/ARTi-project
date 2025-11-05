"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, AlertTriangle } from "lucide-react";

export default function InstagramQAPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Quality Assurance</h1>
        <p className="text-muted-foreground">
          Monitor and ensure data quality across campaigns and creators
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Data Quality Metrics
            </CardTitle>
            <CardDescription>
              Overall health of your Instagram data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span>Creator Profiles Complete</span>
                <span className="font-bold text-green-500">98%</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Campaign Data Integrity</span>
                <span className="font-bold text-green-500">95%</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Analytics Coverage</span>
                <span className="font-bold text-yellow-500">87%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Pending Reviews
            </CardTitle>
            <CardDescription>
              Items requiring attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span>Incomplete Creator Profiles</span>
                <span className="font-bold">12</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Missing Analytics Data</span>
                <span className="font-bold">5</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Campaign Anomalies</span>
                <span className="font-bold">3</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


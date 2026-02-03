"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { DollarSign, TrendingUp, Calendar, AlertCircle, CheckCircle, Settings } from "lucide-react"
import { UnifiedCampaignIntake } from "@/components/campaign-intake/UnifiedCampaignIntake"

export function FinancialIntegration() {
  // Mock data - will be replaced with real QuickBooks API data
  const financialData = {
    isConnected: false,
    lastSync: null,
    monthlyRevenue: 0,
    expenses: 0,
    profit: 0,
    invoicesPending: 0,
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <DollarSign className="h-5 w-5 text-primary" />
          <span>Financial Integration</span>
        </CardTitle>
        <CardDescription>QuickBooks API integration for financial data and reporting</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Connection Status */}
        <div className="flex items-center justify-between p-4 border border-border rounded-lg">
          <div className="flex items-center space-x-3">
            {financialData.isConnected ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-yellow-500" />
            )}
            <div>
              <p className="font-medium">
                {financialData.isConnected ? "Connected to QuickBooks" : "QuickBooks Not Connected"}
              </p>
              <p className="text-sm text-muted-foreground">
                {financialData.isConnected
                  ? `Last synced: ${financialData.lastSync || "Never"}`
                  : "Connect to view financial data"}
              </p>
            </div>
          </div>
          <Button variant={financialData.isConnected ? "outline" : "default"} size="sm">
            <Settings className="h-4 w-4 mr-2" />
            {financialData.isConnected ? "Manage" : "Connect"}
          </Button>
        </div>

        {/* Financial Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 border border-border rounded-lg">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Monthly Revenue</span>
            </div>
            <p className="text-2xl font-bold mt-2">${financialData.monthlyRevenue.toLocaleString()}</p>
            <Badge variant="secondary" className="mt-1">
              {financialData.isConnected ? "Current Month" : "No Data"}
            </Badge>
          </div>

          <div className="p-4 border border-border rounded-lg">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium">Expenses</span>
            </div>
            <p className="text-2xl font-bold mt-2">${financialData.expenses.toLocaleString()}</p>
            <Badge variant="secondary" className="mt-1">
              {financialData.isConnected ? "Current Month" : "No Data"}
            </Badge>
          </div>

          <div className="p-4 border border-border rounded-lg">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Net Profit</span>
            </div>
            <p className="text-2xl font-bold mt-2">${financialData.profit.toLocaleString()}</p>
            <Badge variant="secondary" className="mt-1">
              {financialData.isConnected ? "Current Month" : "No Data"}
            </Badge>
          </div>

          <div className="p-4 border border-border rounded-lg">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-medium">Pending Invoices</span>
            </div>
            <p className="text-2xl font-bold mt-2">{financialData.invoicesPending}</p>
            <Badge variant="secondary" className="mt-1">
              {financialData.isConnected ? "Outstanding" : "No Data"}
            </Badge>
          </div>
        </div>

        {/* Invoice Intake */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase text-muted-foreground">Invoice Intake</h3>
          <p className="text-sm text-muted-foreground">
            Create an internal invoice and instantly generate campaigns for selected services.
          </p>
          <UnifiedCampaignIntake mode="invoice" />
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" disabled={!financialData.isConnected}>
            View Reports
          </Button>
          <Button variant="outline" size="sm" disabled={!financialData.isConnected}>
            Export Data
          </Button>
          <Button variant="outline" size="sm" disabled={!financialData.isConnected}>
            Sync Now
          </Button>
          <Button variant="outline" size="sm">
            API Settings
          </Button>
        </div>

        {!financialData.isConnected && (
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              Connect your QuickBooks account to view financial metrics, generate reports, and sync financial data with
              your marketing operations dashboard.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, Calendar } from "lucide-react";
import { formatCurrency, type VendorPaymentResult } from "../../lib/vendorPaymentCalculator";
import { SERVICE_TYPES } from "../../lib/constants";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import type { Database } from "../../integrations/supabase/types";

type Campaign = Database['public']['Tables']['campaigns']['Row'] & {
  clients?: { id: string; name: string; email: string | null; company: string | null } | null;
  salespersons?: { id: string; name: string; email: string | null } | null;
};

interface PaymentAnalyticsDashboardProps {
  campaigns: Campaign[];
  vendorPayments: Map<string, VendorPaymentResult>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export const PaymentAnalyticsDashboard = ({ campaigns, vendorPayments }: PaymentAnalyticsDashboardProps) => {
  const analytics = useMemo(() => {
    const totalPayments = campaigns.reduce((total, campaign) => {
      const payment = vendorPayments.get(campaign.id);
      return total + (payment?.total_cost || 0);
    }, 0);

    const paidPayments = campaigns
      .filter(c => c.vendor_paid)
      .reduce((total, campaign) => {
        const payment = vendorPayments.get(campaign.id);
        return total + (payment?.total_cost || 0);
      }, 0);

    const unpaidPayments = totalPayments - paidPayments;

    const serviceTypeBreakdown = campaigns.reduce((acc, campaign) => {
      const payment = vendorPayments.get(campaign.id);
      const cost = payment?.total_cost || 0;
      const serviceType = campaign.service_type || 'unknown';
      
      if (!acc[serviceType]) {
        acc[serviceType] = { total: 0, count: 0, paid: 0, unpaid: 0 };
      }
      
      acc[serviceType].total += cost;
      acc[serviceType].count += 1;
      
      if (campaign.vendor_paid) {
        acc[serviceType].paid += cost;
      } else {
        acc[serviceType].unpaid += cost;
      }
      
      return acc;
    }, {} as Record<string, { total: number; count: number; paid: number; unpaid: number }>);

    // Prepare chart data
    const serviceTypeChartData = Object.entries(serviceTypeBreakdown).map(([serviceType, data]) => ({
      name: SERVICE_TYPES.find(type => type.value === serviceType)?.label || serviceType,
      value: data.total,
      paid: data.paid,
      unpaid: data.unpaid,
      count: data.count
    }));

    // Payment status pie chart data
    const paymentStatusData = [
      { name: 'Paid', value: paidPayments, count: campaigns.filter(c => c.vendor_paid).length },
      { name: 'Unpaid', value: unpaidPayments, count: campaigns.filter(c => !c.vendor_paid).length }
    ];

    // Monthly trends (last 6 months)
    const monthlyTrends = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStr = date.toISOString().substr(0, 7); // YYYY-MM format
      
      const monthCampaigns = campaigns.filter(c => 
        c.created_at.startsWith(monthStr)
      );
      
      const monthTotal = monthCampaigns.reduce((total, campaign) => {
        const payment = vendorPayments.get(campaign.id);
        return total + (payment?.total_cost || 0);
      }, 0);

      const monthPaid = monthCampaigns
        .filter(c => c.vendor_paid)
        .reduce((total, campaign) => {
          const payment = vendorPayments.get(campaign.id);
          return total + (payment?.total_cost || 0);
        }, 0);

      monthlyTrends.push({
        month: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        total: monthTotal,
        paid: monthPaid,
        unpaid: monthTotal - monthPaid,
        campaigns: monthCampaigns.length
      });
    }

    const avgPaymentPerCampaign = campaigns.length > 0 ? totalPayments / campaigns.length : 0;
    const paymentRate = campaigns.length > 0 ? (campaigns.filter(c => c.vendor_paid).length / campaigns.length) * 100 : 0;

    return {
      totalPayments,
      paidPayments,
      unpaidPayments,
      serviceTypeBreakdown,
      serviceTypeChartData,
      paymentStatusData,
      monthlyTrends,
      avgPaymentPerCampaign,
      paymentRate,
      totalCampaigns: campaigns.length,
      paidCampaigns: campaigns.filter(c => c.vendor_paid).length,
      unpaidCampaigns: campaigns.filter(c => !c.vendor_paid).length
    };
  }, [campaigns, vendorPayments]);

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{formatCurrency(analytics.totalPayments)}</div>
                <div className="text-sm text-muted-foreground">Total Payments</div>
              </div>
              <DollarSign className="w-8 h-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-red-600">{formatCurrency(analytics.unpaidPayments)}</div>
                <div className="text-sm text-muted-foreground">Unpaid Amount</div>
                <Badge variant="destructive" className="mt-1">
                  {analytics.unpaidCampaigns} campaigns
                </Badge>
              </div>
              <TrendingDown className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{formatCurrency(analytics.avgPaymentPerCampaign)}</div>
                <div className="text-sm text-muted-foreground">Avg per Campaign</div>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold">{analytics.paymentRate.toFixed(1)}%</div>
                <div className="text-sm text-muted-foreground">Payment Rate</div>
                <Badge variant="secondary" className="mt-1">
                  {analytics.paidCampaigns}/{analytics.totalCampaigns}
                </Badge>
              </div>
              <Calendar className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Status Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Payment Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analytics.paymentStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, count }) => `${name}: ${formatCurrency(value)} (${count})`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {analytics.paymentStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#10B981' : '#EF4444'} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Service Type Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Costs by Service Type</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.serviceTypeChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                <Bar dataKey="paid" stackId="a" fill="#10B981" name="Paid" />
                <Bar dataKey="unpaid" stackId="a" fill="#EF4444" name="Unpaid" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Payment Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={analytics.monthlyTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`} />
              <Tooltip formatter={(value) => formatCurrency(value as number)} />
              <Line type="monotone" dataKey="total" stroke="#8884d8" strokeWidth={2} name="Total" />
              <Line type="monotone" dataKey="paid" stroke="#10B981" strokeWidth={2} name="Paid" />
              <Line type="monotone" dataKey="unpaid" stroke="#EF4444" strokeWidth={2} name="Unpaid" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Service Type Breakdown Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Service Type Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.serviceTypeChartData
              .sort((a, b) => b.value - a.value)
              .map((service, index) => (
                <div key={service.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <Badge variant="outline">
                        {service.name}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {service.count} campaigns
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{formatCurrency(service.value)}</div>
                      <div className="text-xs text-muted-foreground">
                        Paid: {formatCurrency(service.paid)} | Unpaid: {formatCurrency(service.unpaid)}
                      </div>
                    </div>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary rounded-full h-2 transition-all duration-500"
                      style={{ 
                        width: `${analytics.totalPayments > 0 ? (service.value / analytics.totalPayments) * 100 : 0}%` 
                      }}
                    />
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
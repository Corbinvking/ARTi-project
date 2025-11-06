import { supabase } from "../integrations/supabase/client";
import type { Database } from "../integrations/supabase/types";

type ServiceType = Database['public']['Enums']['service_type'];

export interface VendorPaymentBreakdown {
  service_type: ServiceType;
  views: number;
  rate_per_1k: number;
  cost: number;
}

export interface VendorPaymentResult {
  total_cost: number;
  breakdown: VendorPaymentBreakdown[];
  campaign_id: string;
  error?: string;
}

export async function calculateVendorPayment(campaignId: string): Promise<VendorPaymentResult> {
  try {
    const { data, error } = await supabase.rpc('calculate_vendor_payment', {
      campaign_uuid: campaignId
    });

    if (error) {
      console.error('Error calculating vendor payment:', error);
      return {
        total_cost: 0,
        breakdown: [],
        campaign_id: campaignId,
        error: `Database error: ${error.message}`
      };
    }

    // Handle null or undefined response
    if (!data) {
      return {
        total_cost: 0,
        breakdown: [],
        campaign_id: campaignId,
        error: 'No payment data returned'
      };
    }

    // Handle scalar responses (common cause of "cannot extract elements" error)
    if (typeof data === 'number' || typeof data === 'string') {
      return {
        total_cost: typeof data === 'number' ? data : 0,
        breakdown: [],
        campaign_id: campaignId,
        error: typeof data === 'string' ? data : undefined
      };
    }

    // Type assertion for the returned JSON data
    const result = data as unknown as {
      total_cost: number;
      breakdown: VendorPaymentBreakdown[];
      campaign_id: string;
      error?: string;
    };

    return {
      total_cost: result.total_cost || 0,
      breakdown: Array.isArray(result.breakdown) ? result.breakdown : [],
      campaign_id: result.campaign_id || campaignId,
      error: result.error
    };
  } catch (error) {
    console.error('Error calculating vendor payment:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return {
      total_cost: 0,
      breakdown: [],
      campaign_id: campaignId,
      error: `Calculation failed: ${errorMessage}`
    };
  }
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

export function exportVendorPayments(campaigns: any[], paymentData: Map<string, VendorPaymentResult>) {
  const csvData = [
    ['Campaign Name', 'Service Type', 'Current Views', 'Rate per 1K', 'Vendor Cost', 'Vendor Paid']
  ];

  campaigns.forEach(campaign => {
    const payment = paymentData.get(campaign.id);
    if (payment && payment.breakdown.length > 0) {
      payment.breakdown.forEach(breakdown => {
        csvData.push([
          campaign.campaign_name,
          breakdown.service_type,
          breakdown.views.toString(),
          `$${breakdown.rate_per_1k.toFixed(4)}`,
          formatCurrency(breakdown.cost),
          campaign.vendor_paid ? 'Yes' : 'No'
        ]);
      });
    } else {
      // Handle campaigns without breakdown data
      csvData.push([
        campaign.campaign_name,
        campaign.service_type || 'N/A',
        campaign.current_views?.toString() || '0',
        'N/A',
        formatCurrency(payment?.total_cost || 0),
        campaign.vendor_paid ? 'Yes' : 'No'
      ]);
    }
  });

  const csvContent = csvData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `vendor-payments-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}
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

// Default pricing rates (used when youtube_pricing_tiers table doesn't exist)
const DEFAULT_PRICING_RATES: Record<string, number> = {
  'ww_display': 1.20,
  'ww_website': 1.20,
  'ww_skip': 1.40,
  'ww_website_ads': 1.20,
  'us_display': 6.50,
  'us_website': 6.50,
  'us_website_ads': 6.50,
  'us_skip': 6.50,
  'us_eur_website': 6.50,
  'latam_display': 2.80,
  'latam_website': 2.80,
  'latam_skip': 2.80,
  'eur_display': 6.50,
  'eur_website': 6.50,
  'eur_skip': 6.50,
  'asia_website': 3.00,
  'mena_display': 3.50,
  'cad_display': 6.50,
  'cad_website': 6.50,
  'cad_skip': 6.50,
  'aus_display': 6.50,
  'aus_website': 6.50,
  'aus_skip': 6.50,
  'youtube_eng_ad': 0.00,
  'engagements_only': 0.00,
  'custom': 0.00
};

// Cache to track if pricing_tiers table exists (avoid repeated 404s)
let pricingTableExists: boolean | null = null;
let pricingTableMissingLogged = false; // Track if we've already logged the missing table warning
const pricingRateCache = new Map<string, number>();

// Helper function to get pricing rate (with caching to avoid repeated 404s)
async function getPricingRate(serviceType: string, views: number): Promise<number> {
  const cacheKey = `${serviceType}_${Math.floor(views / 10000)}`;
  
  // Check cache first
  if (pricingRateCache.has(cacheKey)) {
    return pricingRateCache.get(cacheKey)!;
  }
  
  // If we know table doesn't exist, use default immediately
  if (pricingTableExists === false) {
    const rate = DEFAULT_PRICING_RATES[serviceType] || 0;
    pricingRateCache.set(cacheKey, rate);
    return rate;
  }
  
  // Try to fetch from database
  try {
    const { data: pricingTier, error: pricingError } = await supabase
      .from('youtube_pricing_tiers')
      .select('cost_per_1k_views')
      .eq('service_type', serviceType)
      .lte('tier_min_views', views)
      .or(`tier_max_views.gte.${views},tier_max_views.is.null`)
      .order('tier_min_views', { ascending: false })
      .limit(1)
      .single();

    if (pricingError) {
      // If 404, table doesn't exist - remember this
      if (pricingError.code === 'PGRST116' || pricingError.message?.includes('relation') || pricingError.message?.includes('does not exist')) {
        pricingTableExists = false;
        // Only log once to avoid console spam
        if (!pricingTableMissingLogged) {
          console.log('💡 youtube_pricing_tiers table not found, using default rates for all calculations');
          pricingTableMissingLogged = true;
        }
      }
      const rate = DEFAULT_PRICING_RATES[serviceType] || 0;
      pricingRateCache.set(cacheKey, rate);
      return rate;
    }

    if (pricingTier?.cost_per_1k_views) {
      pricingTableExists = true;
      const rate = parseFloat(pricingTier.cost_per_1k_views.toString());
      pricingRateCache.set(cacheKey, rate);
      return rate;
    }
    
    // No matching tier found, use default
    const rate = DEFAULT_PRICING_RATES[serviceType] || 0;
    pricingRateCache.set(cacheKey, rate);
    return rate;
    
  } catch (e) {
    // Any error, use default
    pricingTableExists = false;
    const rate = DEFAULT_PRICING_RATES[serviceType] || 0;
    pricingRateCache.set(cacheKey, rate);
    return rate;
  }
}

export async function calculateVendorPayment(
  campaignId: string,
  campaignData?: any // Optional: pass campaign data to avoid re-fetching
): Promise<VendorPaymentResult> {
  try {
    // Use provided campaign data or fetch if not provided
    let campaign = campaignData;
    
    if (!campaign) {
      const { data, error: campaignError } = await supabase
        .from('youtube_campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (campaignError || !data) {
        // Silently return error - don't spam console
        return {
          total_cost: 0,
          breakdown: [],
          campaign_id: campaignId,
          error: campaignError?.message || 'Campaign not found'
        };
      }
      campaign = data;
    }

    // Use calculated_vendor_payment if already set
    if (campaign.calculated_vendor_payment) {
      return {
        total_cost: parseFloat(campaign.calculated_vendor_payment.toString()),
        breakdown: [],
        campaign_id: campaignId
      };
    }

    // Simple calculation based on current_views and service_types
    let total_cost = 0;
    const breakdown: VendorPaymentBreakdown[] = [];

    // Parse service_types if it's a JSON string
    let serviceTypes = campaign.service_types;
    if (typeof serviceTypes === 'string') {
      try {
        serviceTypes = JSON.parse(serviceTypes);
      } catch (e) {
        console.error('Failed to parse service_types JSON:', serviceTypes, e);
        serviceTypes = null;
      }
    }

    // Handle multi-service campaigns (service_types is JSONB array)
    if (serviceTypes && Array.isArray(serviceTypes) && serviceTypes.length > 0) {
      for (const service of serviceTypes) {
        if (!service || !service.service_type) continue; // Skip invalid entries
        
        const views = service.current_views || 0;
        const serviceType = service.service_type;
        
        // Use cached/optimized rate lookup
        const rate = await getPricingRate(serviceType, views);
        const cost = (views / 1000) * rate;
        
        total_cost += cost;
        breakdown.push({
          service_type: serviceType as ServiceType,
          views,
          rate_per_1k: rate,
          cost
        });
      }
    } else {
      // Fallback: single service type
      const views = campaign.current_views || 0;
      const serviceType = campaign.service_type;

      if (serviceType) {
        const rate = await getPricingRate(serviceType, views);
        const cost = (views / 1000) * rate;
        
        total_cost = cost;
        breakdown.push({
          service_type: serviceType as ServiceType,
          views,
          rate_per_1k: rate,
          cost
        });
      } else {
        // No service type at all - return error
        return {
          total_cost: 0,
          breakdown: [],
          campaign_id: campaignId,
          error: 'Campaign has no service type defined'
        };
      }
    }

    return {
      total_cost,
      breakdown,
      campaign_id: campaignId
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
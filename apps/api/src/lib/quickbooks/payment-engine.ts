// ============================================================================
// QuickBooks Online — Payment Detection & Automation Engine
//
// Detects when QBO invoices are paid (balance = 0) and cascades:
//   campaign_invoices → campaign_groups → platform campaigns
//   → commission eligibility → vendor payout eligibility
// ============================================================================

import { supabase } from '../supabase.js';
import { logger } from '../logger.js';

type PaymentSource = 'qbo_webhook' | 'qbo_cdc' | 'qbo_full_sync' | 'manual';

const PLATFORM_TABLES = [
  'spotify_campaigns',
  'youtube_campaigns',
  'instagram_campaigns',
  'soundcloud_submissions',
  'campaign_submissions',
  'campaigns',
] as const;

/**
 * Check a single QBO invoice for payment status and trigger downstream automations.
 * Safe to call repeatedly — idempotent via paid_date guard.
 */
export async function processInvoicePayment(
  connectionId: string,
  qboInvoiceId: string,
  source: PaymentSource = 'qbo_webhook'
): Promise<void> {
  const { data: qboInvoice, error: fetchErr } = await supabase
    .from('qbo_invoices')
    .select('id, qbo_id, balance, total_amt, doc_number, customer_qbo_id, campaign_invoice_id')
    .eq('connection_id', connectionId)
    .eq('qbo_id', qboInvoiceId)
    .single();

  if (fetchErr || !qboInvoice) {
    logger.warn({ connectionId, qboInvoiceId, fetchErr }, 'processInvoicePayment: invoice not found');
    return;
  }

  const balance = parseFloat(qboInvoice.balance ?? '0');
  if (balance > 0) return; // Not fully paid yet

  let campaignInvoiceId: string | null = qboInvoice.campaign_invoice_id;

  // Auto-match if not linked
  if (!campaignInvoiceId && qboInvoice.doc_number) {
    campaignInvoiceId = await tryAutoMatchSingle(connectionId, qboInvoice.id, qboInvoice.doc_number);
  }

  if (!campaignInvoiceId) {
    logger.debug({ qboInvoiceId }, 'Paid QBO invoice has no linked campaign_invoice — skipping cascade');
    return;
  }

  // Check if already processed (idempotent guard)
  const { data: campInv } = await supabase
    .from('campaign_invoices')
    .select('id, status, paid_date')
    .eq('id', campaignInvoiceId)
    .single();

  if (!campInv) {
    logger.warn({ campaignInvoiceId }, 'Linked campaign_invoice not found');
    return;
  }

  if (campInv.status === 'paid' && campInv.paid_date) {
    return; // Already processed
  }

  const now = new Date().toISOString();

  // 1. Mark campaign_invoice as paid
  await supabase
    .from('campaign_invoices')
    .update({ status: 'paid', paid_date: now })
    .eq('id', campaignInvoiceId);

  await logAutomation(connectionId, 'invoice_paid', {
    qbo_invoice_id: qboInvoiceId,
    campaign_invoice_id: campaignInvoiceId,
    total_amt: qboInvoice.total_amt,
    source,
  });

  logger.info({ campaignInvoiceId, qboInvoiceId, source }, 'Invoice marked paid via QBO');

  // 2. Find and update campaign_groups referencing this invoice
  const { data: groups } = await supabase
    .from('campaign_groups')
    .select('id, status, invoice_status')
    .eq('source_invoice_id', campaignInvoiceId);

  if (groups && groups.length > 0) {
    for (const group of groups) {
      await supabase
        .from('campaign_groups')
        .update({
          invoice_status: 'Paid',
          status: group.status === 'Draft' ? 'Ready' : group.status,
          commission_eligible: true,
          commission_eligible_at: now,
          vendor_payout_eligible: true,
          vendor_payout_eligible_at: now,
          payment_verified_at: now,
          payment_verified_source: source,
        })
        .eq('id', group.id);

      await logAutomation(connectionId, 'campaign_activated', {
        campaign_group_id: group.id,
        campaign_invoice_id: campaignInvoiceId,
        previous_status: group.status,
        source,
      });

      await logAutomation(connectionId, 'commission_unlocked', {
        campaign_group_id: group.id,
        campaign_invoice_id: campaignInvoiceId,
        source,
      });

      await logAutomation(connectionId, 'payout_unlocked', {
        campaign_group_id: group.id,
        campaign_invoice_id: campaignInvoiceId,
        source,
      });

      // 3. Update child platform campaigns
      await updatePlatformCampaigns(campaignInvoiceId, group.id);

      // 4. Unlock vendor payout eligibility on allocations
      await unlockVendorPayouts(group.id);
    }
  }

  // Also check platform campaigns linked directly via source_invoice_id (no group)
  await updatePlatformCampaigns(campaignInvoiceId, null);
}

/**
 * Scan all QBO invoices for a connection and process any that are newly paid.
 * Called after full sync or CDC sync completes.
 */
export async function processAllPaidInvoices(
  connectionId: string,
  source: PaymentSource = 'qbo_full_sync'
): Promise<number> {
  const { data: paidInvoices } = await supabase
    .from('qbo_invoices')
    .select('qbo_id')
    .eq('connection_id', connectionId)
    .lte('balance', 0);

  if (!paidInvoices || paidInvoices.length === 0) return 0;

  let processed = 0;
  for (const inv of paidInvoices) {
    try {
      await processInvoicePayment(connectionId, inv.qbo_id, source);
      processed++;
    } catch (err) {
      logger.error({ err, qboId: inv.qbo_id }, 'Failed to process paid invoice');
    }
  }

  return processed;
}

// ---- Auto-Matching ----

/**
 * Try to match a single QBO invoice to a campaign_invoice by doc_number.
 * Returns the campaign_invoice_id if matched, null otherwise.
 */
async function tryAutoMatchSingle(
  connectionId: string,
  qboInvoiceLocalId: string,
  docNumber: string
): Promise<string | null> {
  const { data: campInv } = await supabase
    .from('campaign_invoices')
    .select('id')
    .eq('invoice_number', docNumber)
    .is('qbo_invoice_id', null)
    .limit(1)
    .single();

  if (!campInv) return null;

  // Populate both sides of the link
  await supabase
    .from('qbo_invoices')
    .update({ campaign_invoice_id: campInv.id })
    .eq('id', qboInvoiceLocalId);

  const { data: qboRow } = await supabase
    .from('qbo_invoices')
    .select('qbo_id')
    .eq('id', qboInvoiceLocalId)
    .single();

  if (qboRow) {
    await supabase
      .from('campaign_invoices')
      .update({
        qbo_invoice_id: qboRow.qbo_id,
        qbo_sync_status: 'synced',
        qbo_last_synced_at: new Date().toISOString(),
      })
      .eq('id', campInv.id);
  }

  await logAutomation(connectionId, 'invoice_matched', {
    qbo_invoice_local_id: qboInvoiceLocalId,
    campaign_invoice_id: campInv.id,
    match_method: 'doc_number',
    doc_number: docNumber,
  });

  logger.info({ docNumber, campaignInvoiceId: campInv.id }, 'Auto-matched QBO invoice to campaign invoice');
  return campInv.id;
}

/**
 * Batch auto-match all unlinked QBO invoices for a connection.
 * Called after sync operations.
 */
export async function autoMatchInvoices(connectionId: string): Promise<number> {
  const { data: unlinked } = await supabase
    .from('qbo_invoices')
    .select('id, qbo_id, doc_number, customer_qbo_id')
    .eq('connection_id', connectionId)
    .is('campaign_invoice_id', null)
    .not('doc_number', 'is', null);

  if (!unlinked || unlinked.length === 0) return 0;

  let matched = 0;
  for (const inv of unlinked) {
    if (!inv.doc_number) continue;
    const result = await tryAutoMatchSingle(connectionId, inv.id, inv.doc_number);
    if (result) matched++;
  }

  if (matched > 0) {
    logger.info({ connectionId, matched, total: unlinked.length }, 'Auto-match batch completed');
  }

  return matched;
}

/**
 * Manually link a QBO invoice to a campaign invoice.
 */
export async function manualMatchInvoice(
  connectionId: string,
  qboInvoiceLocalId: string,
  campaignInvoiceId: string
): Promise<void> {
  const { data: qboInv } = await supabase
    .from('qbo_invoices')
    .select('qbo_id')
    .eq('id', qboInvoiceLocalId)
    .eq('connection_id', connectionId)
    .single();

  if (!qboInv) throw new Error('QBO invoice not found');

  await supabase
    .from('qbo_invoices')
    .update({ campaign_invoice_id: campaignInvoiceId })
    .eq('id', qboInvoiceLocalId);

  await supabase
    .from('campaign_invoices')
    .update({
      qbo_invoice_id: qboInv.qbo_id,
      qbo_sync_status: 'synced',
      qbo_last_synced_at: new Date().toISOString(),
    })
    .eq('id', campaignInvoiceId);

  await logAutomation(connectionId, 'invoice_matched', {
    qbo_invoice_local_id: qboInvoiceLocalId,
    campaign_invoice_id: campaignInvoiceId,
    match_method: 'manual',
  });

  // Check if this invoice is already paid and trigger cascade
  await processInvoicePayment(connectionId, qboInv.qbo_id, 'manual');
}

// ---- Internal helpers ----

async function updatePlatformCampaigns(
  campaignInvoiceId: string,
  campaignGroupId: string | null
): Promise<void> {
  for (const table of PLATFORM_TABLES) {
    try {
      // Some tables have invoice_status, some don't — update what exists
      const hasInvoiceStatus = ['campaigns', 'campaign_submissions', 'soundcloud_submissions'].includes(table);

      if (hasInvoiceStatus) {
        await supabase
          .from(table)
          .update({ invoice_status: 'paid' })
          .eq('source_invoice_id', campaignInvoiceId);
      }
    } catch {
      // Table might not have the column — safe to ignore
    }
  }
}

async function unlockVendorPayouts(campaignGroupId: string): Promise<void> {
  // Find all spotify_campaigns in this group
  const { data: campaigns } = await supabase
    .from('spotify_campaigns')
    .select('id')
    .eq('campaign_group_id', campaignGroupId);

  if (!campaigns || campaigns.length === 0) return;

  const campaignIds = campaigns.map((c: any) => c.id);

  // Also check stream_strategist_campaigns via campaign_group_id
  const { data: ssCampaigns } = await supabase
    .from('stream_strategist_campaigns')
    .select('id')
    .eq('campaign_group_id', campaignGroupId);

  if (ssCampaigns) {
    campaignIds.push(...ssCampaigns.map((c: any) => c.id));
  }

  if (campaignIds.length === 0) return;

  // Update allocations for these campaigns
  await supabase
    .from('campaign_allocations_performance')
    .update({ payment_status: 'eligible' })
    .in('campaign_id', campaignIds)
    .is('payment_status', null);
}

async function logAutomation(
  connectionId: string,
  eventType: string,
  details: Record<string, any>
): Promise<void> {
  try {
    await supabase.from('qbo_automation_log').insert({
      connection_id: connectionId,
      event_type: eventType,
      qbo_invoice_id: details.qbo_invoice_id || null,
      campaign_invoice_id: details.campaign_invoice_id || null,
      campaign_group_id: details.campaign_group_id || null,
      details,
    });
  } catch (err) {
    logger.warn({ err, eventType }, 'Failed to write automation log (non-fatal)');
  }
}

// ---- Financial Summary Queries ----

/**
 * Aggregate financial data from QBO mirror tables for the dashboard.
 */
export async function getFinancialSummary(connectionId: string) {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // Unpaid invoices (balance > 0)
  const { data: unpaidRows } = await supabase
    .from('qbo_invoices')
    .select('balance, total_amt, due_date')
    .eq('connection_id', connectionId)
    .gt('balance', 0);

  const unpaidInvoices = unpaidRows || [];
  const unpaidCount = unpaidInvoices.length;
  const unpaidTotal = unpaidInvoices.reduce((sum, inv) => sum + parseFloat(inv.balance || '0'), 0);
  const overdueInvoices = unpaidInvoices.filter(
    (inv) => inv.due_date && new Date(inv.due_date) < now
  );
  const overdueCount = overdueInvoices.length;
  const overdueTotal = overdueInvoices.reduce((sum, inv) => sum + parseFloat(inv.balance || '0'), 0);

  // Paid this week (payments in last 7 days)
  const { data: recentPayments } = await supabase
    .from('qbo_payments')
    .select('total_amt, txn_date')
    .eq('connection_id', connectionId)
    .gte('txn_date', sevenDaysAgo.split('T')[0]);

  const paidThisWeek = recentPayments || [];
  const paidThisWeekCount = paidThisWeek.length;
  const paidThisWeekTotal = paidThisWeek.reduce((sum, p) => sum + parseFloat(p.total_amt || '0'), 0);

  // Outstanding receivables = total of all unpaid invoice balances
  const outstandingReceivables = unpaidTotal;

  // Vendor payouts owed — campaign groups where payout is eligible but allocations not yet paid
  const { data: payoutGroups } = await supabase
    .from('campaign_groups')
    .select('id, total_budget')
    .eq('vendor_payout_eligible', true);

  let vendorPayoutsOwed = 0;
  let vendorPayoutsCount = 0;

  if (payoutGroups && payoutGroups.length > 0) {
    const groupIds = payoutGroups.map((g: any) => g.id);

    // Find spotify campaigns in these groups
    const { data: spotifyCampaigns } = await supabase
      .from('spotify_campaigns')
      .select('id')
      .in('campaign_group_id', groupIds);

    if (spotifyCampaigns && spotifyCampaigns.length > 0) {
      const campaignIds = spotifyCampaigns.map((c: any) => c.id);

      const { data: unpaidAllocations } = await supabase
        .from('campaign_allocations_performance')
        .select('allocated_streams, cost_per_stream, paid_amount')
        .in('campaign_id', campaignIds)
        .neq('payment_status', 'paid');

      if (unpaidAllocations) {
        for (const alloc of unpaidAllocations) {
          const owed = (alloc.allocated_streams || 0) * parseFloat(alloc.cost_per_stream || '0')
            - parseFloat(alloc.paid_amount || '0');
          if (owed > 0) {
            vendorPayoutsOwed += owed;
            vendorPayoutsCount++;
          }
        }
      }
    }
  }

  // Commissions owed — campaign groups where commission is eligible
  const { data: commissionGroups } = await supabase
    .from('campaign_groups')
    .select('id, total_budget')
    .eq('commission_eligible', true);

  const commissionsOwedCount = commissionGroups?.length ?? 0;
  const commissionsOwedTotal = (commissionGroups || []).reduce(
    (sum, g) => sum + parseFloat(g.total_budget || '0'),
    0
  );

  return {
    unpaid_invoices: { count: unpaidCount, total: unpaidTotal },
    overdue_invoices: { count: overdueCount, total: overdueTotal },
    paid_this_week: { count: paidThisWeekCount, total: paidThisWeekTotal },
    outstanding_receivables: outstandingReceivables,
    vendor_payouts_owed: { count: vendorPayoutsCount, total: vendorPayoutsOwed },
    commissions_owed: { count: commissionsOwedCount, total: commissionsOwedTotal },
  };
}

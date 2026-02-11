// ============================================================================
// QuickBooks Online — Two-way sync: push campaign invoices to QBO
// ============================================================================

import { supabase } from '../supabase.js';
import { logger } from '../logger.js';
import { qboRequest } from './api-client.js';
import type { QBOConnection } from './types.js';

/**
 * Find or create a QBO Customer matching a campaign invoice's client.
 * Returns the QBO Customer ID.
 */
async function findOrCreateCustomer(
  connectionId: string,
  realmId: string,
  clientName: string,
  clientEmail?: string | null
): Promise<string> {
  // 1. Check if we already have a mirrored customer with this name
  const { data: existing } = await supabase
    .from('qbo_customers')
    .select('qbo_id')
    .eq('connection_id', connectionId)
    .eq('display_name', clientName)
    .limit(1)
    .single();

  if (existing) return existing.qbo_id;

  // 2. Query QBO to find by DisplayName
  const query = `SELECT * FROM Customer WHERE DisplayName = '${clientName.replace(/'/g, "\\'")}'`;
  const searchRes = await qboRequest({
    connectionId,
    realmId,
    method: 'GET',
    path: `/query?query=${encodeURIComponent(query)}`,
  });

  const customers = searchRes.data?.QueryResponse?.Customer;
  if (customers && customers.length > 0) {
    // Found in QBO — mirror it locally and return
    const customer = customers[0];
    await supabase.from('qbo_customers').upsert({
      connection_id: connectionId,
      qbo_id: customer.Id,
      sync_token: customer.SyncToken,
      display_name: customer.DisplayName,
      email: customer.PrimaryEmailAddr?.Address ?? null,
      active: customer.Active ?? true,
      raw_json: customer,
      synced_at: new Date().toISOString(),
    }, { onConflict: 'connection_id,qbo_id' });

    return customer.Id;
  }

  // 3. Create a new Customer in QBO
  const createPayload: any = {
    DisplayName: clientName,
  };
  if (clientEmail) {
    createPayload.PrimaryEmailAddr = { Address: clientEmail };
  }

  const createRes = await qboRequest({
    connectionId,
    realmId,
    method: 'POST',
    path: '/customer',
    body: createPayload,
    isWrite: true,
  });

  if (!createRes.ok) {
    throw new Error(`Failed to create QBO Customer: HTTP ${createRes.status} — ${JSON.stringify(createRes.data)}`);
  }

  const newCustomer = createRes.data?.Customer;
  if (!newCustomer?.Id) {
    throw new Error('QBO Customer creation returned no Id');
  }

  // Mirror locally
  await supabase.from('qbo_customers').upsert({
    connection_id: connectionId,
    qbo_id: newCustomer.Id,
    sync_token: newCustomer.SyncToken,
    display_name: newCustomer.DisplayName,
    email: newCustomer.PrimaryEmailAddr?.Address ?? null,
    active: true,
    raw_json: newCustomer,
    synced_at: new Date().toISOString(),
  }, { onConflict: 'connection_id,qbo_id' });

  logger.info({ customerId: newCustomer.Id, clientName }, 'Created new QBO Customer');
  return newCustomer.Id;
}

/**
 * Find or create a QBO Item for service line items.
 * Returns the QBO Item ID.
 */
async function findOrCreateServiceItem(
  connectionId: string,
  realmId: string,
  serviceName: string,
  unitPrice?: number
): Promise<string> {
  // Check local mirror first
  const { data: existing } = await supabase
    .from('qbo_items')
    .select('qbo_id')
    .eq('connection_id', connectionId)
    .eq('name', serviceName)
    .limit(1)
    .single();

  if (existing) return existing.qbo_id;

  // Query QBO
  const query = `SELECT * FROM Item WHERE Name = '${serviceName.replace(/'/g, "\\'")}'`;
  const searchRes = await qboRequest({
    connectionId,
    realmId,
    method: 'GET',
    path: `/query?query=${encodeURIComponent(query)}`,
  });

  const items = searchRes.data?.QueryResponse?.Item;
  if (items && items.length > 0) {
    const item = items[0];
    await supabase.from('qbo_items').upsert({
      connection_id: connectionId,
      qbo_id: item.Id,
      sync_token: item.SyncToken,
      name: item.Name,
      item_type: item.Type,
      active: item.Active ?? true,
      unit_price: item.UnitPrice ?? null,
      raw_json: item,
      synced_at: new Date().toISOString(),
    }, { onConflict: 'connection_id,qbo_id' });
    return item.Id;
  }

  // Create new Service item
  // QBO requires an IncomeAccountRef for Service items — use a default income account
  const { data: incomeAccount } = await supabase
    .from('qbo_accounts')
    .select('qbo_id')
    .eq('connection_id', connectionId)
    .eq('account_type', 'Income')
    .eq('active', true)
    .limit(1)
    .single();

  const createPayload: any = {
    Name: serviceName,
    Type: 'Service',
  };
  if (unitPrice != null) {
    createPayload.UnitPrice = unitPrice;
  }
  if (incomeAccount) {
    createPayload.IncomeAccountRef = { value: incomeAccount.qbo_id };
  }

  const createRes = await qboRequest({
    connectionId,
    realmId,
    method: 'POST',
    path: '/item',
    body: createPayload,
    isWrite: true,
  });

  if (!createRes.ok) {
    throw new Error(`Failed to create QBO Item: HTTP ${createRes.status}`);
  }

  const newItem = createRes.data?.Item;
  if (!newItem?.Id) {
    throw new Error('QBO Item creation returned no Id');
  }

  await supabase.from('qbo_items').upsert({
    connection_id: connectionId,
    qbo_id: newItem.Id,
    sync_token: newItem.SyncToken,
    name: newItem.Name,
    item_type: newItem.Type,
    active: true,
    unit_price: newItem.UnitPrice ?? null,
    raw_json: newItem,
    synced_at: new Date().toISOString(),
  }, { onConflict: 'connection_id,qbo_id' });

  logger.info({ itemId: newItem.Id, serviceName }, 'Created new QBO Item');
  return newItem.Id;
}

/**
 * Push a single campaign_invoice to QuickBooks as a QBO Invoice.
 * - Finds/creates Customer from client_name/client_email
 * - Finds/creates Item from services_selected or a default service name
 * - Creates the QBO Invoice with line items
 * - Updates campaign_invoices with qbo_invoice_id and qbo_sync_status
 */
export async function pushInvoiceToQBO(
  connection: QBOConnection,
  invoiceId: string
): Promise<{ qboInvoiceId: string }> {
  const { id: connectionId, realm_id: realmId } = connection;

  // 1. Fetch the campaign invoice
  const { data: invoice, error: invErr } = await supabase
    .from('campaign_invoices')
    .select('*')
    .eq('id', invoiceId)
    .single();

  if (invErr || !invoice) {
    throw new Error(`Campaign invoice not found: ${invoiceId}`);
  }

  // Skip if already synced
  if (invoice.qbo_invoice_id) {
    return { qboInvoiceId: invoice.qbo_invoice_id };
  }

  // Mark as pending
  await supabase
    .from('campaign_invoices')
    .update({ qbo_sync_status: 'pending' })
    .eq('id', invoiceId);

  try {
    // 2. Find or create customer
    const clientName = invoice.client_name || 'Unknown Client';
    const clientEmail = invoice.client_email || null;
    const customerQboId = await findOrCreateCustomer(connectionId, realmId, clientName, clientEmail);

    // 3. Build line items
    const services = invoice.services_selected || ['Campaign Service'];
    const lineItems = [];

    for (const service of services) {
      const itemQboId = await findOrCreateServiceItem(connectionId, realmId, service);
      lineItems.push({
        Amount: invoice.amount || 0,
        DetailType: 'SalesItemLineDetail',
        SalesItemLineDetail: {
          ItemRef: { value: itemQboId },
          Qty: 1,
          UnitPrice: invoice.amount || 0,
        },
        Description: `${service} — Invoice ${invoice.invoice_number}`,
      });
    }

    // If there are multiple services, split amount evenly (simple approach)
    if (lineItems.length > 1) {
      const perItem = parseFloat(((invoice.amount || 0) / lineItems.length).toFixed(2));
      for (const line of lineItems) {
        line.Amount = perItem;
        line.SalesItemLineDetail.UnitPrice = perItem;
      }
    }

    // 4. Create QBO Invoice
    const invoicePayload = {
      CustomerRef: { value: customerQboId },
      Line: lineItems,
      DocNumber: invoice.invoice_number,
      TxnDate: invoice.issued_date || new Date().toISOString().split('T')[0],
      DueDate: invoice.due_date || undefined,
    };

    const createRes = await qboRequest({
      connectionId,
      realmId,
      method: 'POST',
      path: '/invoice',
      body: invoicePayload,
      isWrite: true,
    });

    if (!createRes.ok) {
      const errorMsg = `Failed to create QBO Invoice: HTTP ${createRes.status} — ${JSON.stringify(createRes.data?.Fault || createRes.data)}`;
      await supabase
        .from('campaign_invoices')
        .update({
          qbo_sync_status: 'error',
          qbo_error_message: errorMsg,
        })
        .eq('id', invoiceId);
      throw new Error(errorMsg);
    }

    const qboInvoice = createRes.data?.Invoice;
    if (!qboInvoice?.Id) {
      throw new Error('QBO Invoice creation returned no Id');
    }

    // 5. Mirror in qbo_invoices
    await supabase.from('qbo_invoices').upsert({
      connection_id: connectionId,
      qbo_id: qboInvoice.Id,
      sync_token: qboInvoice.SyncToken,
      customer_qbo_id: customerQboId,
      doc_number: qboInvoice.DocNumber,
      txn_date: qboInvoice.TxnDate,
      due_date: qboInvoice.DueDate,
      total_amt: qboInvoice.TotalAmt,
      balance: qboInvoice.Balance,
      campaign_invoice_id: invoiceId,
      raw_json: qboInvoice,
      synced_at: new Date().toISOString(),
    }, { onConflict: 'connection_id,qbo_id' });

    // 6. Update campaign_invoices with QBO reference
    await supabase
      .from('campaign_invoices')
      .update({
        qbo_invoice_id: qboInvoice.Id,
        qbo_sync_status: 'synced',
        qbo_last_synced_at: new Date().toISOString(),
        qbo_error_message: null,
      })
      .eq('id', invoiceId);

    logger.info({ invoiceId, qboInvoiceId: qboInvoice.Id }, 'Campaign invoice pushed to QBO');
    return { qboInvoiceId: qboInvoice.Id };
  } catch (err: any) {
    // Mark as error
    await supabase
      .from('campaign_invoices')
      .update({
        qbo_sync_status: 'error',
        qbo_error_message: err.message,
      })
      .eq('id', invoiceId);
    throw err;
  }
}

/**
 * Push all un-synced campaign invoices to QBO.
 */
export async function pushAllPendingInvoices(
  connection: QBOConnection
): Promise<{ synced: number; errors: number }> {
  const { data: invoices, error } = await supabase
    .from('campaign_invoices')
    .select('id')
    .eq('org_id', connection.org_id)
    .in('qbo_sync_status', ['not_synced', 'error'])
    .is('qbo_invoice_id', null)
    .order('created_at', { ascending: true });

  if (error || !invoices) {
    logger.error({ error }, 'Failed to fetch pending invoices for QBO sync');
    return { synced: 0, errors: 0 };
  }

  let synced = 0;
  let errors = 0;

  for (const inv of invoices) {
    try {
      await pushInvoiceToQBO(connection, inv.id);
      synced++;
    } catch (err: any) {
      logger.error({ err, invoiceId: inv.id }, 'Failed to push invoice to QBO');
      errors++;
    }
  }

  logger.info({ synced, errors, total: invoices.length }, 'Batch QBO invoice push complete');
  return { synced, errors };
}

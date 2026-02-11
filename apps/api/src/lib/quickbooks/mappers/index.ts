import type { QBOEntityType } from '../types.js';
import { mapCustomer } from './customer.js';
import { mapInvoice } from './invoice.js';
import { mapPayment } from './payment.js';
import { mapVendor } from './vendor.js';
import { mapItem } from './item.js';
import { mapAccount } from './account.js';

export { mapCustomer, mapInvoice, mapPayment, mapVendor, mapItem, mapAccount };

/**
 * Get the mapper function for a given entity type.
 * Each mapper takes (rawQBOJson, connectionId) and returns a local-table row object.
 */
export function getMapper(entityType: QBOEntityType): (raw: any, connectionId: string) => any {
  switch (entityType) {
    case 'Customer': return mapCustomer;
    case 'Invoice':  return mapInvoice;
    case 'Payment':  return mapPayment;
    case 'Vendor':   return mapVendor;
    case 'Item':     return mapItem;
    case 'Account':  return mapAccount;
    default:
      throw new Error(`No mapper for entity type: ${entityType}`);
  }
}

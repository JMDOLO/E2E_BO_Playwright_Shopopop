/**
 * Helper to create payment transaction test data in PostgreSQL
 *
 * Inserts a row in the transactions table (service_payment_engineering_qa)
 * linked to a delivery via metadata.delivery_id.
 */

import { faker } from '@faker-js/faker/locale/fr';
import { insertPgRow, PGInsertField } from '@utils/PG_Utils/insertData.pg';

/** Transaction statuses in PG → UI label mapping */
export const TRANSACTION_STATUS_LABELS: Record<string, string> = {
  success: 'Finalisé',
  pending: 'En attente',
  error: 'Échoué',
};

/** Transaction types in PG → UI label mapping */
export const TRANSACTION_TYPE_LABELS: Record<string, string> = {
  transfer: 'TRANSFER',
  payout: 'PAYOUT',
  charge: 'CHARGE',
};

export interface TransactionData {
  delivery_id: number;
  amount_cents: number;
  amount_display: string;
  type: string;
  type_label: string;
  status: string;
  status_label: string;
  provider_reference: string;
  comment: string;
}

export interface TransactionOptions {
  amount_cents?: number;
  type?: 'transfer' | 'payout' | 'charge';
  status?: 'success' | 'pending' | 'error';
  comment?: string;
}

/**
 * Insert a transaction row in PG payment database
 *
 * @param accountId - The account UUID from identities table (users.CTP.account_id_qa3)
 * @param deliveryId - The errand ID from createDeliveryAPI
 * @param options - Optional overrides for amount, type, status
 * @returns TransactionData with all values for assertions
 */
export async function insertTransaction(
  accountId: string,
  deliveryId: number,
  options: TransactionOptions = {}
): Promise<TransactionData> {
  const type = options.type || 'transfer';
  const status = options.status || 'success';
  const amount_cents = options.amount_cents ?? faker.number.int({ min: 100, max: 5000 });
  const comment = options.comment ?? faker.string.alphanumeric(25);
  const providerReference = `test_${faker.string.alphanumeric(12)}`;

  const now = new Date().toISOString();

  const metadata = {
    delivery_id: deliveryId,
    transfer_type: 'initial',
    delivery_start_utc: now,
    delivery_effective_utc: now,
    delivery_internal_reference: faker.string.alphanumeric({ length: 8, casing: 'upper' }),
    account_amount_before: 0,
    account_amount_after: amount_cents,
    comment,
  };

  const fields: PGInsertField[] = [
    { field: 'provider_reference', value: providerReference },
    { field: 'status', value: status },
    { field: 'amount', value: amount_cents },
    { field: 'currency', value: 'EUR' },
    { field: 'type', value: type },
    { field: 'account_id', value: accountId },
    { field: 'metadata', value: JSON.stringify(metadata) },
    { field: 'transaction_date', value: now },
  ];

  await insertPgRow('payment', 'transactions', fields);

  // Amount display: cents → euros with comma separator and € sign (e.g., 540 → "5,40 €")
  const euros = (amount_cents / 100).toFixed(2).replace('.', ',');
  const amount_display = `${euros}`;

  return {
    delivery_id: deliveryId,
    amount_cents,
    amount_display,
    type,
    type_label: TRANSACTION_TYPE_LABELS[type] || type,
    status,
    status_label: TRANSACTION_STATUS_LABELS[status] || status,
    provider_reference: providerReference,
    comment,
  };
}

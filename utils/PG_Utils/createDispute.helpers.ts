/**
 * Helper to create dispute test data in PostgreSQL
 *
 * Inserts a row in the disputes table (api_backoffice_engineering_qa3)
 * linked to a delivery created via the GenericV2 API.
 */

import { randomUUID } from 'crypto';
import { faker } from '@faker-js/faker/locale/fr';
import { insertPgRow, PGInsertField } from '@utils/PG_Utils/insertData.pg';
import { selectTable } from '@utils/DB_Utils/selectData.db';
import { getRandomWithIndex } from '@utils/Helpers/random.helpers';

/** Drive location data (matches known QA3 pickup points from drives.json) */
const DRIVE_LOCATIONS: Record<string, { city: string; zipCode: string }> = {
  testAutoBOAlim1: { city: 'La Chapelle-sur-Erdre', zipCode: '44240' },
  testAutoBOFleur1: { city: 'Grandchamp-des-Fontaines', zipCode: '44119' },
  testAutoBOVin1: { city: 'Sucé-sur-Erdre', zipCode: '44240' },
};

/** PG dispute statuses grouped by UI tab */
export const IN_PROGRESS_STATUSES = ['to_be_completed', 'in_progress', 'invalid_documents'] as const;
export const COMPLETED_STATUSES = ['approved', 'cancelled', 'rejected'] as const;

/** PG status → UI label mapping */
export const STATUS_LABELS: Record<string, string> = {
  to_be_completed: 'A compléter',
  in_progress: 'En cours de traitement',
  invalid_documents: 'Documents invalides',
  approved: 'Validé',
  cancelled: 'Annulé',
  rejected: 'Refusé',
};

/** Dispute reasons as displayed in the UI (front-end transforms PG values) */
export const DISPUTE_REASONS = ['Vol', 'Produits manquants', 'Produits abîmés', 'Chaîne du froid'] as const;

export interface DisputeOptions {
  reason?: string;
  amount?: number;
  contactEmail?: string;
  formUrl?: string;
  airtableCreatedDate?: Date;
  airtableUpdatedStatusDate?: Date;
}

export interface DisputeData {
  delivery_id: number;
  reference: string;
  drive_name: string;
  drive_city: string;
  drive_zip_code: string;
  recipient_firstname: string;
  recipient_lastname: string;
  recipient_phone: string;
  contact_email: string;
  form_url: string;
  reason: string;
  amount: number;
  status: string;
  statusLabel: string;
  airtable_created_date: Date;
  airtable_updated_status_date: Date;
}

/**
 * Insert a dispute row in PG linked to an existing delivery
 *
 * @param deliveryId - The errand ID from createDeliveryAPI
 * @param driveName - The drive name from drives.json (e.g., 'testAutoBOAlim1')
 * @param driveId - The drive ID from drives.json (e.g., 14417)
 * @param recipientFirstname - From createDeliveryAPI result
 * @param recipientLastname - From createDeliveryAPI result
 * @param recipientPhone - From createDeliveryAPI result
 * @param status - PG status value
 * @param options - Optional overrides for reason, amount, contactEmail, formUrl
 * @returns DisputeData with all values for assertions
 */
export async function insertDispute(
  deliveryId: number,
  driveName: string,
  driveId: number,
  recipientFirstname: string,
  recipientLastname: string,
  recipientPhone: string,
  status: string,
  options: DisputeOptions = {}
): Promise<DisputeData> {
  // Get delivery reference from errand table
  const errand = await selectTable('errand', [{ field: 'id', value: deliveryId }], ['reference']);
  const reference = errand[0].reference as string;

  // Resolve drive location
  const location = DRIVE_LOCATIONS[driveName] || { city: 'Ville inconnue', zipCode: '00000' };

  // Build dispute values
  const reason = options.reason || getRandomWithIndex([...DISPUTE_REASONS]).value;
  const amount = options.amount ?? parseFloat(faker.finance.amount({ min: 1, max: 500, dec: 2 }));
  const contactEmail = options.contactEmail || faker.internet.exampleEmail();
  const formUrl = options.formUrl || `https://example.com/form/${faker.string.alphanumeric(10)}`;

  const now = new Date();
  const airtableCreatedDate = options.airtableCreatedDate ?? now;
  const airtableUpdatedStatusDate = options.airtableUpdatedStatusDate ?? now;

  const fields: PGInsertField[] = [
    { field: 'id', value: randomUUID() },
    { field: 'airtable_dispute_id', value: `test_${faker.string.alphanumeric(8)}` },
    { field: 'airtable_created_date', value: airtableCreatedDate.toISOString() },
    { field: 'airtable_updated_status_date', value: airtableUpdatedStatusDate.toISOString() },
    { field: 'delivery_id', value: deliveryId },
    { field: 'drive_id', value: driveId },
    { field: 'drive_city', value: location.city },
    { field: 'drive_zip_code', value: location.zipCode },
    { field: 'drive_name', value: driveName },
    { field: 'recipient_firstname', value: recipientFirstname },
    { field: 'recipient_lastname', value: recipientLastname },
    { field: 'recipient_phone', value: recipientPhone },
    { field: 'contact_email', value: contactEmail },
    { field: 'form_url', value: formUrl },
    { field: 'reason', value: reason },
    { field: 'amount', value: amount },
    { field: 'status', value: status },
    { field: 'reference', value: reference },
    { field: 'created_at', value: now.toISOString() },
    { field: 'updated_at', value: now.toISOString() },
  ];

  await insertPgRow('backoffice', 'disputes', fields);

  return {
    delivery_id: deliveryId,
    reference,
    drive_name: driveName,
    drive_city: location.city,
    drive_zip_code: location.zipCode,
    recipient_firstname: recipientFirstname,
    recipient_lastname: recipientLastname,
    recipient_phone: recipientPhone,
    contact_email: contactEmail,
    form_url: formUrl,
    reason,
    amount,
    status,
    statusLabel: STATUS_LABELS[status] || status,
    airtable_created_date: airtableCreatedDate,
    airtable_updated_status_date: airtableUpdatedStatusDate,
  };
}

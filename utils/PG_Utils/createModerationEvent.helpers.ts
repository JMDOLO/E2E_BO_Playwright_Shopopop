/**
 * Helper to create moderation event test data in PostgreSQL
 *
 * Inserts a row in the moderation_events table (service_kyc_engineering_qa3)
 * linked to a CTP user and a delivery.
 */

import { randomUUID } from 'node:crypto';
import { insertPgRow, PGInsertField } from '@utils/PG_Utils/insertData.pg';

export type ModerationEventType = 'NO_SHOW' | 'LATE_CANCELLATION';

/**
 * Insert a moderation_events row in PG kyc database
 *
 * @param userId - The shop_user id (e.g. ctpId from copyRow)
 * @param deliveryId - The errand id from createDeliveryAPI
 * @param type - 'NO_SHOW' or 'LATE_CANCELLATION' (default 'LATE_CANCELLATION')
 */
export async function insertModerationEvent(
  userId: number,
  deliveryId: number,
  type: ModerationEventType = 'LATE_CANCELLATION'
): Promise<void> {
  const fields: PGInsertField[] = [
    { field: 'id', value: randomUUID() },
    { field: 'user_id', value: userId },
    { field: 'delivery_id', value: deliveryId },
    { field: 'type', value: type },
    { field: 'created_at', value: new Date().toISOString() },
  ];

  await insertPgRow('kyc', 'moderation_events', fields);
}
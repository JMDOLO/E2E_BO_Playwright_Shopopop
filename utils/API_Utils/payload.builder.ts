/**
 * Payload builder for delivery creation via GenericV2 API
 */

import { faker } from '@faker-js/faker';
import { GenericV2DeliveryPayload } from '@utils/API_Utils/delivery.post';
import { deliveryDefaults } from '@testdata/order_information';

/**
 * Interface for drive data (from testdata/drives.json)
 */
export interface Drive {
  name: string;
  id: string;
  trade_type: string;
  trade_name: string;
}

/**
 * Interface for recipient data (from testdata/users.json)
 */
export interface Recipient {
  name: string;
  firstname: string;
  lastname: string;
  email: string;
  phone: string;
  address: string;
  shortaddress: string;
  street: string;
  zipCode: string;
  city: string;
  type: string;
  floor: number | null;
  elevator: boolean | null;
  id: number;
}

/**
 * Interface for optional order information overrides
 */
export interface OrderInfo {
  reference?: string;
  amount?: string;
  size?: string;
  packs?: string;
  additionalInfos?: string;
  frozenFood?: boolean;
  minimalTransportModeAPI?: string;
}

/**
 * Get coherent number of packs based on order size category
 *
 * XS: 0 | S: 1-2 | M: 3-8 | L: 9-15 | XL: 16-29 | XXL: 30-40
 */
function getCoherentPacks(size: string): number {
  switch (size) {
    case 'XS': return 0;
    case 'S': return faker.number.int({ min: 1, max: 2 });
    case 'M': return faker.number.int({ min: 3, max: 8 });
    case 'L': return faker.number.int({ min: 9, max: 15 });
    case 'XL': return faker.number.int({ min: 16, max: 29 });
    case 'XXL': return faker.number.int({ min: 30, max: 40 });
    default: throw new Error(`Invalid size category: ${size}. Expected: XS, S, M, L, XL, XXL`);
  }
}

/**
 * Calculate dropoff time window for tomorrow
 *
 * @returns ISO formatted dropoff start and end times
 */
function getTomorrowDropoffWindow() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const year = tomorrow.getFullYear();
  const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const day = String(tomorrow.getDate()).padStart(2, '0');

  return {
    start: `${year}-${month}-${day}T${deliveryDefaults.dropoffTimeWindow.start}Z`,
    end: `${year}-${month}-${day}T${deliveryDefaults.dropoffTimeWindow.end}Z`,
  };
}

/**
 * Build delivery creation payload in GenericV2 format
 * Uses data from testdata files (drives, recipients) and applies optional overrides
 * Generates random values for order info by default (reference, amount, size, additionalInfos)
 *
 * @param drive - Drive/pickup point data
 * @param recipient - Recipient data
 * @param orderInfo - Optional order information overrides
 * @returns GenericV2 delivery creation payload
 *
 * @example
 * ```typescript
 * import * as drives from '@testdata/drives.json';
 * import * as users from '@testdata/users.json';
 *
 * // With random values (default)
 * const payload = buildDeliveryPayload(drives.drive_alim1, users.recipient_pro);
 *
 * // With custom values for specific test
 * const payload2 = buildDeliveryPayload(
 *   drives.drive_alim1,
 *   users.recipient_pro,
 *   { amount: "500", size: "M", reference: "TESTREF1" }
 * );
 * ```
 */
export function buildDeliveryPayload(
  drive: Drive, // eslint-disable-line @typescript-eslint/no-unused-vars
  recipient: Recipient,
  orderInfo: OrderInfo = {}
): GenericV2DeliveryPayload {
  // Generate random values or use provided overrides (matching order_information.ts format)
  const reference = orderInfo.reference || faker.string.alphanumeric({ length: 8, casing: 'upper' });
  const amount = orderInfo.amount ? parseFloat(orderInfo.amount) : parseFloat(faker.string.numeric(3));
  const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const;
  const size = orderInfo.size || faker.helpers.arrayElement(sizes);
  const quantity = orderInfo.packs ? parseInt(orderInfo.packs) : getCoherentPacks(size);
  const additionalInfo = orderInfo.additionalInfos || faker.string.alphanumeric(25);
  const minimalTransportModeAPI = orderInfo.minimalTransportModeAPI || `TRANSPORT_${faker.number.int({ min: 1, max: 6 })}`;

  // Get tomorrow's dropoff window
  const dropoffWindow = getTomorrowDropoffWindow();

  const payload: GenericV2DeliveryPayload = {
    retailer: drive.trade_name,
    pickup: {
      id: drive.name,
      name: undefined,
    },
    dropoff: {
      dropoff_start: dropoffWindow.start,
      dropoff_end: dropoffWindow.end,
      contact: {
        first_name: recipient.firstname,
        last_name: recipient.lastname,
        email: recipient.email,
        phone: recipient.phone,
      },
      street: recipient.street,
      zip_code: recipient.zipCode,
      city: recipient.city,
      country: undefined,
      phone_other: undefined,
      location_name: undefined,
      type: recipient.type,
      floor: recipient.floor,
      elevator: recipient.elevator,
      comment: additionalInfo,
      latitude: undefined,
      longitude: undefined,
    },
    delivery: {
      id: reference,
      order: {
        reference: reference,
        amount: amount,
        number_of_items: quantity,
        frozen_food: orderInfo.frozenFood,
        alcohol: undefined,
        order_detail: undefined,
      },
      content_size: {
        category: size,
        weight: undefined,
        volume: undefined,
        dimensions: deliveryDefaults.contentSize.dimensions,
        heavy_item: undefined,
        bulky_item: undefined,
        size_for_florists: undefined,
      },
      special_event: deliveryDefaults.specialEvent,
      minimal_transport_mode: minimalTransportModeAPI,
      additional_infos: additionalInfo,
    },
  };

  return payload;
}

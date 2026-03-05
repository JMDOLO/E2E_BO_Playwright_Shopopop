import { faker } from '@faker-js/faker/locale/fr';
import { getRandomWithIndex } from '@utils/Helpers/random.helpers';

/**
 * UI transport mode labels (source of truth for POM and tests)
 */
export const TRANSPORT_OPTIONS_UI = ['Piéton', 'Vélo', 'Voiture'] as const; // Rajouter 'Camionnette' après fix BO-3807

/**
 * Mapping partners API transport mode → UI label
 * TODO: Remplacer les placeholders par le vrai mapping une fois défini
 */
export const TRANSPORT_OPTIONS_API: Record<string, string> = {
  TRANSPORT_1: TRANSPORT_OPTIONS_UI[2], // TODO: placeholder → vrai mapping
  TRANSPORT_2: TRANSPORT_OPTIONS_UI[2],
  TRANSPORT_3: TRANSPORT_OPTIONS_UI[2],
  TRANSPORT_4: TRANSPORT_OPTIONS_UI[2],
  TRANSPORT_5: TRANSPORT_OPTIONS_UI[2],
  TRANSPORT_6: TRANSPORT_OPTIONS_UI[2],
};

/**
 * Generate order information data using Faker
 */
export const orderInformation = {
  reference: faker.string.alphanumeric({ length: 8, casing: 'upper' }),
  amount: faker.string.numeric({ length: 3, allowLeadingZeros: false }),
  size: getRandomWithIndex(['XS', 'S', 'M', 'L', 'XL', 'XXL']).value,
  additionalInfos: faker.string.alphanumeric(25),
  minimalTransportModeAPI: getRandomWithIndex(['TRANSPORT_1', 'TRANSPORT_2', 'TRANSPORT_3', 'TRANSPORT_4', 'TRANSPORT_5', 'TRANSPORT_6']).value,
  minimalTransportModeUI: getRandomWithIndex([...TRANSPORT_OPTIONS_UI]).value,
};

/**
 * Default values for delivery creation via API
 */
export const deliveryDefaults = {
  contentSize: {
    dimensions: {
      length: 1,
      height: 1,
      depth: 1
    }
  },
  specialEvent: 'NONE',
  dropoffTimeWindow: {
    start: '10:00:00',
    end: '12:00:00'
  }
};

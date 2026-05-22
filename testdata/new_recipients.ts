import * as users from '@testdata/users.json';
import { faker } from '@faker-js/faker/locale/fr';

/**
 * Generate a valid French mobile phone number in +33 format
 * Excludes invalid 06XX combinations per French numbering plan
 */
export function generateFrenchPhone(): string {
  const excludedNumbers = ['39', '90', '91', '92', '93', '94', '96', '97'];
  let combination: string;

  do {
    combination = faker.string.numeric(1) + faker.string.numeric(1);
  } while (excludedNumbers.includes(combination));

  // 06 only: all 06XX ranges are allocated (ARCEP). 07 has unallocated ranges rejected by libphonenumber-js
  return '+336' + combination + faker.string.numeric(6);
}

/**
 * New recipient with Faker-generated identity and valid French phone
 *
 * - firstname, lastname, email, phone: unique per test run (Faker)
 * - address, street, zipCode, city, type: inherited from recipient_interne (within 40km of drives)
 * - isElevator, floorNumber, addressAdditionalInfo: random but valid values
 *
 * Used as default recipient in createDeliveryAPI() to ensure test isolation
 * (each test creates its own recipient, no shared state)
 */
export function newRecipient() {
  const firstname = faker.person.firstName();
  const lastname = faker.person.lastName();
  return {
    ...users.recipient_interne,
    firstname,
    lastname,
    phone: generateFrenchPhone(),
    email: faker.internet.exampleEmail({ firstName: firstname, lastName: lastname }),
    isElevator: faker.helpers.arrayElement(["yes", "no", "dontknow"] as const),
    floorNumber: faker.string.numeric(1),
    addressAdditionalInfo: faker.location.secondaryAddress()
  };
}

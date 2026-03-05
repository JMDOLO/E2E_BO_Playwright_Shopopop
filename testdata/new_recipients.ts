import * as users from '@testdata/users.json';
import { faker } from '@faker-js/faker/locale/fr';

/**
 * Generate new recipient data using Faker with unique identifiers
 *
 * IMPORTANT: firstname and lastname are randomly generated to ensure uniqueness
 * across test campaigns. The "Pro" or "Interne" suffix maintains visual coherence
 * and allows quick identification of the application origin.
 */
export const newRecipientPro = {
  ...users.recipient_pro,
  firstname: faker.person.firstName(),
  lastname: faker.person.lastName() + 'Pro',
  get email(): string {
    return faker.internet.exampleEmail({
      firstName: this.firstname,
      lastName: this.lastname
    });
  }
}

export const newRecipientInterne = {
  ...users.recipient_interne,
  firstname: faker.person.firstName(),
  lastname: faker.person.lastName() + 'Interne',
  get email(): string {
    return faker.internet.exampleEmail({
      firstName: this.firstname,
      lastName: this.lastname
    });
  }
}

export const newRecipient = {
  phone: (() => {
    const excludedNumbers = ['39', '90', '91', '92', '93', '94', '96', '97',];
    let secondDigit: string;
    let thirdDigit: string;
    let combination: string;

    do {
      secondDigit = faker.string.numeric(1);
      thirdDigit = faker.string.numeric(1);
      combination = secondDigit + thirdDigit;
    } while (excludedNumbers.includes(combination));

    return '06' + secondDigit + thirdDigit + faker.string.numeric(6);
  })(),
  isElevator: faker.helpers.arrayElement(["yes", "no", "dontknow"] as const),
  floorNumber: faker.string.numeric(1),
  addressAdditionalInfo: faker.location.secondaryAddress()
};

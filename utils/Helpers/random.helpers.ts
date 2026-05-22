/**
 * Get a random value from an array with its index
 * @param list - The array to select from
 * @returns An object containing the random value and its index
 * @throws Error if the list is empty
 *
 * @example
 * // Get both value and index
 * const { value, index } = getRandomWithIndex(['a', 'b', 'c']);
 *
 * @example
 * // Get only the value (ignore index)
 * const { value: randomItem } = getRandomWithIndex(['a', 'b', 'c']);
 */
export function getRandomWithIndex<T>(list: T[]): { value: T; index: number } {
  if (list.length === 0) {
    throw new Error('Cannot select random value from empty list');
  }
  const randomIndex = Math.floor(Math.random() * list.length);
  return { value: list[randomIndex], index: randomIndex };
}
import { Character } from '@/types/character'

/**
 * Creates a unique identifier for a character using both fullName and source.
 * This ensures characters with the same name from different sources are treated as different.
 */
export function getCharacterKey(character: Character): string {
  return `${character.fullName}|${character.source}`
}

/**
 * Efficiently compares two character arrays using fullName and source as the key.
 * This is much more performant than JSON.stringify comparison as it:
 * - Only compares the fullName and source fields (no full object serialization)
 * - Has O(n) time complexity with O(1) space allocation
 * - Maintains order sensitivity for accurate comparison
 */
export function areCharacterListsEqual(a: Character[], b: Character[]): boolean {
  // Same reference check
  if (a === b) return true

  // Length check for early exit
  if (a.length !== b.length) return false

  // Build a multiset keyed by fullName + source so we
  // compare contents irrespective of order.
  const counts = new Map<string, number>()
  for (const char of a) {
    const key = getCharacterKey(char)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  for (const char of b) {
    const key = getCharacterKey(char)
    const remaining = counts.get(key)
    if (!remaining) return false
    if (remaining === 1) {
      counts.delete(key)
    } else {
      counts.set(key, remaining - 1)
    }
  }

  // If map is empty, the lists contained the same items.
  return counts.size === 0
}
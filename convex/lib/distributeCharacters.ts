import { Doc } from "../_generated/dataModel";

// Helper function to distribute characters across multiple suggestions
export function distributeCharacters(
  characters: Doc<"selectedCharacters">[],
  numSuggestions: number
): Array<{ character: Doc<"selectedCharacters">; sameSourceChars: Doc<"selectedCharacters">[] }> {
  // If requesting more suggestions than characters, cycle through characters
  const assignments: Array<{ character: Doc<"selectedCharacters">; sameSourceChars: Doc<"selectedCharacters">[] }> = [];

  // Group characters by source for prioritization
  const sourceToChars = new Map<string, Doc<"selectedCharacters">[]>();
  for (const c of characters) {
    const list = sourceToChars.get(c.source) || [];
    list.push(c);
    sourceToChars.set(c.source, list);
  }

  // Build a rotation that prefers sources with more members first
  const sourcesBySize = Array.from(sourceToChars.entries()).sort((a, b) => b[1].length - a[1].length).map(([s]) => s);
  let rotationIndex = 0;

  for (let i = 0; i < numSuggestions; i++) {
    // Pick a source that has at least one member; rotate for variation
    let chosenSource = sourcesBySize.length > 0 ? sourcesBySize[rotationIndex % sourcesBySize.length] : undefined;
    rotationIndex++;

    let mainChar: Doc<"selectedCharacters">;
    if (chosenSource) {
      const pool = sourceToChars.get(chosenSource)!;
      mainChar = pool[i % pool.length];
    } else {
      // Fallback if no sources (shouldn't happen) or empty input
      mainChar = characters[i % characters.length];
    }

    // Prefer same-source companions; if none exist, fall back to others
    const sameSource = characters.filter(c => c._id !== mainChar._id && c.source === mainChar.source);
    const companions = sameSource.length > 0
      ? sameSource
      : characters.filter(c => c._id !== mainChar._id);

    assignments.push({ character: mainChar, sameSourceChars: companions });
  }

  return assignments;
}
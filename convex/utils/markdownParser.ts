/**
 * Utility functions for parsing markdown-formatted character results
 */

export interface ParsedCharacter {
  fullName: string;
  gender: string;
  source: string;
}

/**
 * Parses character results from markdown format
 * Expected format:
 * # CHARACTER_RESULTS
 * - Character Name
 *   Gender: male/female/other
 *   Source: Source Title
 * 
 * - Another Character
 *   Gender: male/female/other
 *   Source: Another Source
 */
export function parseCharacterMarkdown(markdown: string): ParsedCharacter[] {
  // Split by the header to find the results section
  const parts = markdown.split('# CHARACTER_RESULTS');
  if (parts.length < 2) {
    console.warn('No CHARACTER_RESULTS section found in markdown');
    return [];
  }
  
  // Get the section after the header, stop at next # section
  let section = parts[1];
  const nextSectionIndex = section.indexOf('\n#');
  if (nextSectionIndex !== -1) {
    section = section.substring(0, nextSectionIndex);
  }
  
  // Split by lines and process character blocks
  const lines = section.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  const parsed: ParsedCharacter[] = [];
  let currentCharacter: Partial<ParsedCharacter> = {};
  
  for (const line of lines) {
    if (line.startsWith('- ')) {
      // Save previous character if complete
      if (currentCharacter.fullName && currentCharacter.gender && currentCharacter.source) {
        parsed.push(currentCharacter as ParsedCharacter);
      }
      
      // Start new character
      currentCharacter = {
        fullName: line.substring(2).trim()
      };
    } else if (line.startsWith('Gender:')) {
      const gender = line.substring(7).trim().toLowerCase();
      if (['male', 'female', 'other'].includes(gender)) {
        currentCharacter.gender = gender;
      } else {
        console.warn(`Invalid gender "${gender}" in line: ${line}`);
      }
    } else if (line.startsWith('Source:')) {
      currentCharacter.source = line.substring(7).trim();
    }
  }
  
  // Don't forget the last character
  if (currentCharacter.fullName && currentCharacter.gender && currentCharacter.source) {
    parsed.push(currentCharacter as ParsedCharacter);
  }
  
  // Validate all characters have required fields
  const validated = parsed.filter(char => {
    if (!char.fullName || !char.gender || !char.source) {
      console.warn(`Incomplete character data:`, char);
      return false;
    }
    return true;
  });
  
  // Deduplicate by fullName|source combination
  const seen = new Set<string>();
  const deduped = validated.filter(char => {
    const key = `${char.fullName}|${char.source}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
  
  return deduped;
}
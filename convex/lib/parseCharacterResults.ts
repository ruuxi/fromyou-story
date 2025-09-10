export interface ParsedCharacter {
  fullName: string;
  gender: "male" | "female" | "other";
  source: string;
}

/**
 * Parse AI model output in the CHARACTER_RESULTS format
 * Expected format:
 * # CHARACTER_RESULTS
 * 
 * - Full Name | gender | Source
 * - Full Name | gender | Source
 * - Full Name | gender | Source
 */
export function parseCharacterResults(text: string): ParsedCharacter[] {
  // Normalize newlines and strip code fences if present
  const withoutCodeFences = text
    .replace(/```[\s\S]*?```/g, "")
    .replace(/~~~[\s\S]*?~~~/g, "");

  const lines = withoutCodeFences.split(/\r?\n/);

  // Helper to normalize gender inputs to our union
  const normalizeGender = (raw: string): "male" | "female" | "other" | null => {
    const g = raw.trim().toLowerCase();
    if (["male", "man", "m", "masculine"].includes(g)) return "male";
    if (["female", "woman", "f", "feminine"].includes(g)) return "female";
    if ([
      "other",
      "nonbinary",
      "non-binary",
      "nb",
      "enby",
      "agender",
      "unspecified",
      "unknown",
    ].includes(g))
      return "other";
    return null;
  };

  // Find the CHARACTER_RESULTS header (accept # or ##, extra spaces, case-insensitive)
  let inResultsSection = false;
  const headerRegex = /^#{1,6}\s*character_results\s*$/i;

  const parsedAllLines: ParsedCharacter[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (headerRegex.test(line)) {
      inResultsSection = true;
      continue;
    }

    // If we haven't seen an explicit header, still allow parsing globally
    const allowParsing = inResultsSection || true;
    if (!allowParsing) continue;

    // Accept bullets starting with '-' or '*'
    const bulletMatch = line.match(/^[-*]\s+(.*)$/);
    if (!bulletMatch) continue;

    const content = bulletMatch[1].trim();

    // Try hyphen-separated first: "Name - gender - Source"
    let parts = content.split(" - ").map((p) => p.trim()).filter(Boolean);
    // Backward compatibility: if not 3 parts, try pipe-separated
    if (parts.length < 3) {
      parts = content.split("|").map((p) => p.trim()).filter(Boolean);
    }
    if (parts.length < 3) {
      console.warn(`Malformed character line: ${line}`);
      continue;
    }

    const [rawName, rawGender, rawSource] = parts;

    // Clean quotes and trailing punctuation
    const fullName = rawName.replace(/^"|"$/g, "").trim();
    const gender = normalizeGender(rawGender);
    const source = rawSource.replace(/^"|"$/g, "").trim();

    if (!fullName || !source || !gender) {
      console.warn(`Invalid data in character line: ${line}`);
      continue;
    }

    parsedAllLines.push({ fullName, gender, source });
  }

  // Deduplicate by source first, then by name+source if needed
  const seenSources = new Set<string>();
  const seenNameSource = new Set<string>();
  const unique: ParsedCharacter[] = [];
  for (const c of parsedAllLines) {
    const key = `${c.fullName}|${c.source}`;
    if (seenNameSource.has(key)) continue;
    // Prefer unique sources
    if (seenSources.has(c.source)) continue;
    seenNameSource.add(key);
    seenSources.add(c.source);
    unique.push(c);
    if (unique.length === 3) break;
  }

  if (unique.length < 3) {
    // As a fallback, allow duplicates of source to try to reach 3
    for (const c of parsedAllLines) {
      const key = `${c.fullName}|${c.source}`;
      if (seenNameSource.has(key)) continue;
      seenNameSource.add(key);
      unique.push(c);
      if (unique.length === 3) break;
    }
  }

  if (unique.length === 0) {
    throw new Error("No valid characters found in AI response");
  }

  if (unique.length !== 3) {
    throw new Error(`Expected exactly 3 characters, but found ${unique.length}`);
  }

  return unique;
}
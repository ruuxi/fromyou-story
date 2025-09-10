// Validator for story suggestion output
export const storySuggestionValidator = {
  parse: (text: string, knownCharacters?: { main_characters: string[], side_characters: string[] }) => {
    // Extract the text between ### STORY and ### TAGS (or end of text)
    const storyMatch = text.match(/### STORY\s*\n([\s\S]*?)(?=### TAGS|$)/i);
    const storyText = storyMatch ? storyMatch[1].trim() : text.trim();
    
    // Extract tags section
    const tagsMatch = text.match(/### TAGS\s*\n([\s\S]*?)(?=### STORY|$)/i);
    const tagsSection = tagsMatch ? tagsMatch[1].trim() : "";
    
    // Parse tags from the tags section (handle both bullet points and comma-separated)
    const tags: string[] = [];
    if (tagsSection) {
      // Try to parse bullet points first
      const bulletMatches = tagsSection.match(/^[-•]\s*(.+)$/gm);
      if (bulletMatches) {
        tags.push(...bulletMatches.map(match => match.replace(/^[-•]\s*/, '').trim()));
      } else {
        // Fall back to comma-separated
        tags.push(...tagsSection.split(',').map(tag => tag.trim()).filter(Boolean));
      }
    }
    
    // Use known characters if provided, otherwise return empty arrays
    const characters = knownCharacters || {
      main_characters: [],
      side_characters: []
    };
    
    return {
      text: storyText,
      tags: tags.slice(0, 6), // Limit to 6 tags
      characters
    };
  }
};
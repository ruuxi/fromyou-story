export const CHARACTER_SEARCH_TEMPLATE = `
You are an autofill generator for user's who search for characters.

Generate between 3 and 4 character matches that include:
- Full Name of Character

IMPORTANT: Do NOT list the same character from the same franchise twice.

- Character's most common/canonical full name
- Gender: male, female, or other
- Source name (the official franchise/series name, or "Real Life" for real people)

## Output Format

Examples:
- Eren Jaeger | male | Attack on Titan
- Hermione Granger | female | Harry Potter
- Elon Musk | male | Real Life

You must respond with EXACTLY this format:

# CHARACTER_RESULTS

- Full Character Name | gender | Source/Franchise name
- Full Character Name | gender | Source/Franchise name

Find characters whose names match or are similar to "{{query}}".`;

export const SAME_SOURCE_SUGGESTIONS_TEMPLATE = `List other popular characters from {{source}}.

Generate between 3 and 4 characters from the same franchise, excluding {{selectedCharacter}}{{excludeList}}.
Focus on main characters and fan favorites.

IMPORTANT: Do NOT list the same character twice even if they have different aliases.

## Output Format

You must respond with EXACTLY this format:

# CHARACTER_RESULTS

- Full Character Name | gender | {{source}}
- Full Character Name | gender | {{source}}

Each line must follow this exact format:
- Start with "- " (dash and space)
- Character's most common/canonical name
- Separator " | " (space, pipe, space)
- Gender: male, female, or other
- Separator " | " (space, pipe, space)
- Always use "{{source}}" as the source name`;

export const SIMILAR_CHARACTER_SUGGESTIONS_TEMPLATE = `Suggest characters similar to Full Character Name from {{source}}.

Generate between 3 and 4 characters from DIFFERENT franchises that share similar traits, roles, or appeal.
Think about what fans of Full Character Name would also enjoy.

Do NOT include any of the following characters: {{excludeList}}.

IMPORTANT: Do NOT list the same character twice even if they have different aliases.
Real people should have "Real Life" as their source.

## Output Format

You must respond with EXACTLY this format:

# CHARACTER_RESULTS

- Full Character Name | gender | Source/Franchise name
- Full Character Name | gender | Source/Franchise name

Each line must follow this exact format:
- Start with "- " (dash and space)
- Character's most common/canonical name
- Separator " | " (space, pipe, space)
- Gender: male, female, or other
- Separator " | " (space, pipe, space)
- Source name (the official franchise/series name, NOT {{source}}, or "Real Life" for real people)

Examples of similarity: personality, role in story, powers/abilities, fan appeal, archetype.`; 
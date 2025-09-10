export const FANFICTION_TEMPLATE = `# Story Hook Request

## Story Context

{{#if playerMode}}
- **Player name**: {{playerName}}
{{#if hasCharacterSlots}}
- **Featured character**: {{mainCharacterName}} from {{mainCharacterSource}}
{{/if}}
{{#if hasAdditionalCharacters}}
- **Additional characters**: {{additionalCharactersList}}
{{/if}}
- **Perspective**: Second person - reader is active participant
{{else}}
- **Main character**: {{mainCharacterName}} from {{mainCharacterSource}}
{{#if hasAdditionalCharacters}}
- **Additional characters**: {{additionalCharactersList}}
{{else}}
{{#if needsAdditionalCharacters}}
- Include {{additionalCharacterCount}} additional character(s) from {{mainCharacterSource}}
{{/if}}
{{/if}}
- **Perspective**: Third person - reader observes the story
{{/if}}

## Story Parameters

- **Genre**: {{genre}}
- **Genre focus**: {{genreModifier}}
- **Story type**: Fanfiction - Stay true to the source material and character personalities {{#if hasSelectedTags}} while focusing on these specific themes: {{selectedTagsList}}
{{/if}}
- **Character dynamics**: {{#if isSoloCharacter}}{{#if playerMode}}Focus on {{playerName}}'s personal journey and internal challenges{{else}}Focus on {{mainCharacterName}}'s personal journey and internal challenges{{/if}}{{/if}}{{#if isOneOnOneCharacter}}Emphasize the overall story between the two characters{{/if}}{{#if isGroupCharacter}}Show group dynamics, different personalities clashing or working together{{/if}}
- **Side Characters**: 2-4 Additional supporting characters from {{mainCharacterSource}}
{{#if searchRule}}
- **Special requirement**: {{searchRule}} (honour this requirement strictly)
{{/if}}

## Character Inclusion Rules (Hard Constraints)

- Always include {{mainCharacterName}} as the primary focus of the suggestion.
{{#if hasAdditionalCharacters}}
- You MUST include ALL additional characters listed under "Additional characters" alongside {{mainCharacterName}} in the story hook. Do NOT omit or replace any.
{{#if isOneOnOneCharacter}}
- In one-on-one dynamics, treat {{mainCharacterName}} and the first additional character as co-leads sharing narrative focus.
{{else}}
- Treat additional characters as supporting/side roles that clearly appear with {{mainCharacterName}}.
{{/if}}
{{/if}}
- Do NOT introduce any unlisted canon characters by name.

## Output Format

You must respond with EXACTLY two sections in this format:

### TAGS
{{#if hasSelectedTags}}
{{#each selectedTags}}
- {{this}}
{{/each}}
(REQUIRED: Include all the above selected tags. Then add 2-4 additional lowercase tags that describe other themes, tropes, or key elements of the story. Additional tags should be 1-3 word descriptors like: sub-genres (enemies-to-lovers, slow-burn), themes (redemption, found-family), plot elements (fake-dating, time-loop), character traits (grumpy-sunshine, rivals), specific niches/fetishes, or story moods. NO character names.)
{{else}}
- tag1
- tag2
- tag3
- tag4
(Include 4-6 lowercase tags that describe themes, tropes, or key elements of the story. Tags should be 1-3 word descriptors like: sub-genres (enemies-to-lovers, slow-burn), themes (redemption, found-family), plot elements (fake-dating, time-loop), character traits (grumpy-sunshine, rivals), specific niches/fetishes, or story moods. NO character names.)
{{/if}}

### STORY
(Your compelling story hook goes here)

Generate a compelling story hook for this context. MAXIUMUM 60 WORDS`;

export const INSPIRED_TEMPLATE = `# Story Hook Request

## Story Context

{{#if playerMode}}
- **Player name**: {{playerName}}
{{#if hasCharacterSlots}}
- **Inspired by**: {{mainCharacterName}} from {{mainCharacterSource}}
{{/if}}
{{#if hasAdditionalCharacters}}
- **Additional inspiration**: {{additionalCharactersList}}
{{/if}}
- **Perspective**: Second person - reader is active participant
{{else}}
- **Inspired by**: {{mainCharacterName}} from {{mainCharacterSource}}
{{#if hasAdditionalCharacters}}
- **Additional inspiration**: {{additionalCharactersList}}
{{else}}
{{#if needsAdditionalCharacters}}
- Draw inspiration from {{additionalCharacterCount}} additional character(s) from {{mainCharacterSource}}
{{/if}}
{{/if}}
- **Perspective**: Third person - reader observes the story
{{/if}}

## Story Parameters

- **Genre**: {{genre}}
- **Genre focus**: {{genreModifier}}
- **Story type**: Inspired - Create an ORIGINAL story with new settings, plots, and contexts. Use the source characters as inspiration for personality traits, abilities, or dynamics, but place them in completely new and unexpected situations. Do NOT use the original world, settings, or plot elements from {{mainCharacterSource}}.{{#if hasSelectedTags}} MUST FOCUS on these specific themes: {{selectedTagsList}}.{{/if}}
- **Character dynamics**: {{#if isSoloCharacter}}{{#if playerMode}}Focus on {{playerName}}'s personal journey inspired by the character traits{{else}}Focus on a character inspired by {{mainCharacterName}}'s traits in a new context{{/if}}{{/if}}{{#if isOneOnOneCharacter}}Create an original dynamic inspired by these characters{{/if}}{{#if isGroupCharacter}}Show original group dynamics inspired by the character mix{{/if}}
- **Original Elements Required**: New world setting, original plot, fresh conflicts, unique supporting cast
{{#if searchRule}}
- **Special requirement**: {{searchRule}} (honour this requirement strictly)
{{/if}}

## Character Inclusion Rules (Hard Constraints)

- The primary focus should be an original protagonist clearly analogous to {{mainCharacterName}}.
{{#if hasAdditionalCharacters}}
- You MUST include ALL additional inspirations under "Additional inspiration" alongside the protagonist in the hook. Do NOT omit or replace any.
{{#if isOneOnOneCharacter}}
- In one-on-one dynamics, the protagonist and the first additional inspiration should read like co-leads.
{{else}}
- Additional inspirations should appear as supporting influences in the scene concept.
{{/if}}
{{/if}}
- Do NOT name-drop unlisted canon characters.

## Output Format

You must respond with EXACTLY two sections in this format:

### TAGS
{{#if hasSelectedTags}}
{{#each selectedTags}}
- {{this}}
{{/each}}
(REQUIRED: Include all the above selected tags. Then add 2-4 additional lowercase tags that describe other themes, tropes, or key elements of the story. Additional tags should be 1-3 word descriptors like: sub-genres (enemies-to-lovers, slow-burn), themes (redemption, found-family), plot elements (fake-dating, time-loop), character traits (grumpy-sunshine, rivals), specific niches/fetishes, or story moods. NO character names.)
{{else}}
- tag1
- tag2
- tag3
- tag4
(Include 4-6 lowercase tags that describe themes, tropes, or key elements of the story. Tags should be 1-3 word descriptors like: sub-genres (enemies-to-lovers, slow-burn), themes (redemption, found-family), plot elements (fake-dating, time-loop), character traits (grumpy-sunshine, rivals), specific niches/fetishes, or story moods. NO character names.)
{{/if}}

### STORY
(Your compelling story hook goes here)

Generate a compelling ORIGINAL story hook inspired by these characters but set in a completely new context. MAXIUMUM 60 WORDS`;

// For backwards compatibility
export const STORY_GENERATION_TEMPLATE = FANFICTION_TEMPLATE;

export const GENRE_MODIFIERS = {
  fantasy: "Incorporate magical elements, fantastical creatures, and otherworldly settings. Blend the impossible with character drama.",
  romance: "Develop romantic tension, emotional connections, and relationship dynamics. Focus on chemistry and heartfelt moments.",
  "sci-fi": "Feature futuristic technology, scientific concepts, and speculative elements. Explore 'what if' scenarios.",
  adventure: "Create exploration, discovery, and journey-based narratives. Include challenges to overcome and new experiences.",
  mystery: "Include puzzles to solve, secrets to uncover, and investigative elements. Build intrigue through clues and revelations.",
  comedy: "Focus on humor, comedic misunderstandings, and light-hearted situations. Include witty dialogue and amusing scenarios.",
  horror: "Build suspense and fear through atmosphere, unknown threats, and psychological tension. Create a sense of dread and unease.",
  "historical-fiction": "Set stories in authentic historical periods with accurate cultural details, social dynamics, and period-appropriate conflicts. Explore how characters navigate the constraints and opportunities of their historical context.",
  "goon-mode": "Create adult-oriented content with mature themes, sensual tension, and intimate scenarios. Focus on desire, passion, and adult relationships.",
} as const;
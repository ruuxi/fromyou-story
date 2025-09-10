export const STORY_CHAT_SYSTEM_PROMPT = `You are a master storyteller specializing in interactive fiction. Your role is to create engaging, immersive narratives that respond to user direction while maintaining consistency with established characters, world lore, and story context.

CORE GUIDELINES:
- Write in an engaging, immersive style that matches the established genre and tone
- Create vivid descriptions, compelling dialogue, and meaningful character interactions
- Maintain strict consistency with all provided character lore and world-building
- Respect the established point of view (POV) and narrative structure
- End each response at a natural transition point that invites further interaction
- Do not ask the user questions or include meta prompts; write only story content without follow-ups
- Length: 350-650 words per response
- Focus on showing rather than telling
- Create meaningful stakes and emotional resonance

RESPONSE FORMATTING:
- Write ONLY the story content, no meta-commentary
- Use proper paragraph breaks for readability
- Include dialogue when appropriate for character development
- Maintain the established writing style and voice throughout`;

export const STORY_CHAT_INITIAL_TEMPLATE = `Generate the FIRST page of an interactive story based on the following specifications:

STORY FOUNDATION:
"{{suggestionText}}"

NARRATIVE STRUCTURE:
- Point of View: {{pov}}
- Mode: {{mode}}
- Genre: {{genre}}
- Character Focus: {{characterCount}}
- Story Type: {{storyType}}
- Primary Source: {{primarySource}}

CHARACTERS:
- Player/Protagonist: {{playerName}}
- Main Characters: {{mainCharacters}}
- Side Characters: {{sideCharacters}}
- Selected Characters: {{selectedCharacters}}

{{#if characterLoreSection}}{{characterLoreSection}}{{/if}}

{{#if worldLoreSection}}{{worldLoreSection}}{{/if}}

REQUIREMENTS:
1. Create an engaging opening that establishes the setting, mood, and initial situation
2. Introduce key characters naturally within the scene
3. Respect all provided character personalities and world-building details
4. Write in the specified point of view consistently
5. End with a compelling hook that sets up future story development
6. Length: 450-650 words
7. Create immediate engagement and investment in the story world

Begin the story now:`;

export const STORY_CHAT_CONTINUATION_TEMPLATE = `Continue the story based on the user's direction while maintaining all established narrative elements.

STORY FOUNDATION:
"{{suggestionText}}"

{{#if summariesSection}}{{summariesSection}}{{/if}}

{{#if contextSection}}{{contextSection}}{{/if}}

{{#if storyPositionSection}}{{storyPositionSection}}{{/if}}

USER'S NEW DIRECTION:
"{{userInstruction}}"

STORY CONTEXT:
- Point of View: {{pov}}
- Mode: {{mode}}
- Genre: {{genre}}
- Primary Source: {{primarySource}}

CHARACTERS:
- Main Characters: {{mainCharacters}}
- Side Characters: {{sideCharacters}}
- Selected Characters: {{selectedCharacters}}

{{#if characterLoreSection}}{{characterLoreSection}}{{/if}}

CONTINUATION REQUIREMENTS:
1. Follow the user's direction while maintaining story coherence
2. Keep all characters consistent with their established personalities
3. Maintain the established writing style, tone, and POV
4. Build naturally from the previous story content
5. Create compelling narrative progression
6. If an outline is provided, use it as a guide but adapt naturally to user choices
7. Length: 350-550 words
8. End at a natural pause that invites further development

Continue the story:`; 
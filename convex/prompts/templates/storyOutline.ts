export const STORY_OUTLINE_SYSTEM_PROMPT = `You are a master story architect specializing in creating compelling narrative structures. Your role is to generate detailed story outlines that provide a complete roadmap from beginning to end while maintaining flexibility for organic story development.

CORE GUIDELINES:
- Create engaging three-act structures with natural progression
- Design compelling character arcs and plot developments
- Include satisfying narrative beats and turning points
- Ensure proper pacing and emotional resonance
- Build toward meaningful climaxes and resolutions`;

export const STORY_OUTLINE_GENERATION_TEMPLATE = `Create a comprehensive story outline based on the following foundation:

STORY PREMISE:
"{{storyPremise}}"

STORY DETAILS:
- Genre: {{genre}}
- Story Type: {{storyType}} 
- Character Focus: {{characterCount}}
- Player Mode: {{playerMode}}
- Primary Source: {{primarySource}}

MAIN CHARACTERS:
{{mainCharacters}}

SIDE CHARACTERS:
{{sideCharacters}}

{{#if characterLore}}
CHARACTER BACKGROUNDS:
{{characterLore}}
{{/if}}

{{#if worldLore}}
WORLD CONTEXT:
{{worldLore}}
{{/if}}

OUTLINE REQUIREMENTS:
1. Create a three-act structure with clear progression
2. Each act should have 3-5 chapters
3. Each chapter should have 3-5 narrative beats
4. Ensure character arcs are complete and satisfying
5. Include major plot points and turning moments
6. Build toward a compelling climax and resolution
7. Leave room for organic story development during writing
8. Total outline should cover approximately 50-80 story pages

FORMAT YOUR RESPONSE EXACTLY AS FOLLOWS:

ACT I: [Act Title]
Chapter 1: [Chapter Title]
- Beat 1: [Specific story beat description]
- Beat 2: [Specific story beat description]
- Beat 3: [Specific story beat description]

Chapter 2: [Chapter Title]
- Beat 1: [Specific story beat description]
- Beat 2: [Specific story beat description]
- Beat 3: [Specific story beat description]

[Continue for all chapters in Act I]

ACT II: [Act Title]
[Repeat chapter/beat structure]

ACT III: [Act Title]
[Repeat chapter/beat structure]

Generate the complete outline now:`;

export const STORY_SINGLE_ACT_OUTLINE_TEMPLATE = `Create the outline for ACT {{actNumber}} of an ongoing story.

FOUNDATION (from user-selected suggestion):
"{{storyPremise}}"

STORY DETAILS:
- Genre: {{genre}}
- Story Type: {{storyType}} 
- Character Focus: {{characterCount}}
- Player Mode: {{playerMode}}
- Primary Source: {{primarySource}}

MAIN CHARACTERS:
{{mainCharacters}}

SIDE CHARACTERS:
{{sideCharacters}}

{{#if characterLore}}
CHARACTER BACKGROUNDS:
{{characterLore}}
{{/if}}

{{#if worldLore}}
WORLD CONTEXT:
{{worldLore}}
{{/if}}

{{#if previousOutlineText}}
PREVIOUS OUTLINE CONTEXT (earlier acts):
{{previousOutlineText}}
{{/if}}

{{#if summariesText}}
STORY SO FAR (summaries):
{{summariesText}}
{{/if}}

{{#if recentPagesText}}
RECENT PAGES (latest content excerpts):
{{recentPagesText}}
{{/if}}

REQUIREMENTS FOR ACT {{actNumber}} OUTLINE:
1. Provide 3-5 chapters
2. Each chapter must contain 3-5 concrete narrative beats
3. Ensure continuity with the previous acts and story-so-far context
4. Align with established character arcs and world lore
5. Leave flexibility for user choices; this outline is guidance, not a script
6. Target ~15-25 pages of story content for this act

FORMAT EXACTLY:

ACT {{actNumber}}: [Act Title]
Chapter 1: [Chapter Title]
- Beat 1: [Specific story beat]
- Beat 2: [Specific story beat]
- Beat 3: [Specific story beat]

Chapter 2: [Chapter Title]
- Beat 1: [Specific story beat]
- Beat 2: [Specific story beat]
- Beat 3: [Specific story beat]

[Continue chapters for Act {{actNumber}} only]

Generate only the outline for Act {{actNumber}} now.`;
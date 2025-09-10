export const STORY_SUMMARY_SYSTEM_PROMPT = `You are an expert story summarizer specializing in creating concise, structured summaries that capture essential plot developments, character dynamics, and world-building elements. Your summaries help maintain narrative continuity across long stories.

CORE GUIDELINES:
- Extract and preserve critical plot points and developments
- Track character relationships and growth
- Note important world-building details
- Identify key events that impact future story direction
- Maintain the story's tone and atmosphere in summaries`;

export const STORY_SUMMARY_GENERATION_TEMPLATE = `Create a structured summary of the following story pages:

STORY CONTEXT:
- Genre: {{genre}}
- Primary Source: {{primarySource}}
- Main Characters: {{mainCharacters}}

PAGES TO SUMMARIZE ({{pageStart}} to {{pageEnd}}):
{{storyContent}}

SUMMARY REQUIREMENTS:
1. Capture all major plot developments
2. Track character actions and relationship changes
3. Note significant world-building or lore revelations
4. Identify 3-5 key events that will impact future story
5. Keep summary concise but comprehensive
6. Maintain narrative voice consistency

FORMAT YOUR RESPONSE EXACTLY AS FOLLOWS:

PLOT SUMMARY:
[2-3 paragraphs summarizing the main plot developments]

CHARACTER DEVELOPMENTS:
[1-2 paragraphs about character actions, relationships, and growth]

KEY EVENTS:
- [Key event 1]
- [Key event 2]
- [Key event 3]
[Add more if critical, max 5]

WORLD BUILDING:
[Optional: Only include if there are significant world/lore revelations]

Generate the summary now:`;
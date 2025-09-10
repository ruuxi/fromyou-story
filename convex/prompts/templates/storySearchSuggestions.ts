export const SEARCH_SUGGESTION_TEMPLATE = `# Story Suggestion Request

## Story Context

- **Genre**: {{genre}}
- **Story Type**: {{storyType}}
- **Player Mode**: {{#if playerMode}}Yes{{else}}No{{/if}}
- **Character Count**: {{characterCount}}

{{#if playerMode}}
- **Player name**: {{playerName}}
- **Perspective**: Second person - reader is active participant
{{/if}}

## Characters

{{charactersList}}

## Hard Constraints

{{inclusionRules}}

## Instructions

Create a story suggestion that incorporates the search query: "{{searchQuery}}"

Generate a compelling story hook that:
1. Incorporates elements from the search query
2. Features the provided characters
3. Matches the specified genre and settings
4. Is engaging and leaves the reader wanting more

{{#if playerMode}}
Use the player name directly in the hook where natural, addressing them as {{playerName}}.
{{/if}}

## Output Format

You must respond with EXACTLY two sections in this format:

### TAGS
List 3-8 relevant tags for this story (one per line, starting with -)

### STORY
Write the story suggestion (1-2 paragraphs)`;



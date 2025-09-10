"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { getModelClient, getModelConfig } from "./models";
import { checkRateLimit } from "../lib/rateLimiter";

export const generateInterests = action({
  args: {
    genre: v.string(),
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
  },
  returns: v.array(v.string()),
  handler: async (ctx, args) => {
    try {
      // Check rate limit
      await checkRateLimit(ctx, 'generateInterests', args.userId, args.sessionId);
      
      // Get model configuration (using storySuggestionGeneration as it's similar)
      const modelConfig = getModelConfig('storySuggestionGeneration', 'anonymous');
      const model = getModelClient('storySuggestionGeneration', 'anonymous');
      
      const prompt = `Generate 9 short, engaging reader interests/tropes for ${args.genre} stories. These should be specific themes, plot elements, or character dynamics that fans of ${args.genre} would enjoy.

Examples for fantasy might include: "dragons", "magic systems", "prophecies", "epic quests"
Examples for romance might include: "enemies to lovers", "fake dating", "second chance", "forbidden love"

Requirements:
- Exactly 9 interests
- Each should be 1-4 words maximum
- Focus on popular tropes and themes for ${args.genre}
- Make them appealing to readers who love ${args.genre}
- Avoid overly generic terms
- Use lowercase

Return only the list, one per line, no numbers or bullets:`;

      const { generateText } = await import('ai');
      
      const result = await generateText({
        model: model,
        messages: [{ role: "user", content: prompt }],
        maxRetries: 3,
        temperature: 0.7,
      });

      // Parse the response into an array of interests
      const interests = result.text
        .split('\n')
        .map(line => line.trim().toLowerCase())
        .filter(line => line.length > 0 && line.length <= 50) // Filter out empty lines and overly long ones
        .slice(0, 9); // Ensure we don't exceed 9

      // If we don't have enough interests, pad with fallbacks
      if (interests.length < 9) {
        const fallbacks = getFallbackInterests(args.genre);
        const needed = 9 - interests.length;
        const additionalInterests = fallbacks
          .filter(fallback => !interests.includes(fallback))
          .slice(0, needed);
        interests.push(...additionalInterests);
      }

      console.log(`Generated ${interests.length} interests for ${args.genre}:`, interests);
      return interests;

    } catch (error) {
      console.error('Error generating interests:', error);
      
      // Return fallback interests on error
      const fallbacks = getFallbackInterests(args.genre);
      console.log(`Falling back to static interests for ${args.genre}`);
      return fallbacks;
    }
  },
});

export const generateSearchInterest = action({
  args: {
    searchQuery: v.string(),
    genre: v.string(),
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    try {
      // Check rate limit
      await checkRateLimit(ctx, 'generateSearchInterest', args.userId, args.sessionId);
      
      // Get model configuration
      const modelConfig = getModelConfig('storySuggestionGeneration', 'anonymous');
      const model = getModelClient('storySuggestionGeneration', 'anonymous');
      
      const prompt = `Based on the search query "${args.searchQuery}" and the genre "${args.genre}", generate the most likely single interest/trope that would appeal to readers of ${args.genre} stories.

This should be a specific theme, plot element, character dynamic, or trope that relates to both the search query and the genre. Think about what readers who search for "${args.searchQuery}" in ${args.genre} stories would be looking for.

Examples:
- Search: "magic school" + Genre: "fantasy" → "magical academies"
- Search: "enemies fall in love" + Genre: "romance" → "enemies to lovers"
- Search: "robot uprising" + Genre: "sci-fi" → "AI rebellion"
- Search: "treasure map" + Genre: "adventure" → "treasure hunting"

Requirements:
- Return exactly one interest/trope
- 1-4 words maximum
- Must be relevant to both the search query and genre
- Use lowercase
- Make it appealing to readers of ${args.genre}
- Focus on popular, recognizable tropes when possible

Return only the single interest, no explanation:`;

      const { generateText } = await import('ai');
      
      const result = await generateText({
        model: model,
        messages: [{ role: "user", content: prompt }],
        maxRetries: 3,
        temperature: 0.3, // Lower temperature for more consistent results
      });

      // Clean and validate the response
      const interest = result.text
        .trim()
        .toLowerCase()
        .replace(/[^\w\s&-]/g, '') // Remove punctuation except & and -
        .slice(0, 50); // Ensure it's not too long

      console.log(`Generated search interest for "${args.searchQuery}" in ${args.genre}:`, interest);
      return interest;

    } catch (error) {
      console.error('Error generating search interest:', error);
      
      // Return a fallback based on the search query
      const fallback = args.searchQuery.toLowerCase().trim().slice(0, 20);
      console.log(`Falling back to search query for interest: ${fallback}`);
      return fallback;
    }
  },
});

// Static interests based on genre - exactly 9 per genre for 3x3 grid
function getFallbackInterests(genre: string): string[] {
  const fallbackInterests: Record<string, string[]> = {
    fantasy: [
      'dragons', 'magic systems', 'epic quests',
      'mythical creatures', 'dark fantasy', 'prophecies',
      'sword & sorcery', 'fairy tales', 'magical realism'
    ],
    romance: [
      'enemies to lovers', 'slow burn', 'forbidden love',
      'fake dating', 'soulmates', 'second chance',
      'friends to lovers', 'workplace romance', 'historical romance'
    ],
    'sci-fi': [
      'space opera', 'time travel', 'alien contact',
      'cyberpunk', 'AI & robots', 'dystopian',
      'space exploration', 'post-apocalyptic', 'hard sci-fi'
    ],
    adventure: [
      'treasure hunting', 'exploration', 'survival',
      'quests', 'expeditions', 'discoveries',
      'wilderness', 'archaeological', 'nautical'
    ],
    mystery: [
      'detective stories', 'whodunits', 'noir',
      'psychological thriller', 'conspiracy', 'cold cases',
      'cozy mystery', 'amateur sleuth', 'locked room'
    ],
    comedy: [
      'romantic comedy', 'witty banter', 'satire',
      'dark comedy', 'parody', 'sitcom-style',
      'fish out of water', 'buddy comedy', 'mistaken identity'
    ],
    horror: [
      'supernatural horror', 'psychological thriller', 'ghost stories',
      'monster encounters', 'survival horror', 'gothic atmosphere',
      'paranormal activity', 'zombie apocalypse', 'vampire tales'
    ],
    'goon-mode': [
      'steamy romance', 'tension & teasing', 'power dynamics',
      'forbidden desire', 'intimate moments', 'sensual awakening',
      'chemistry & heat', 'romantic tension', 'spicy encounters'
    ]
  };

  const defaultInterests = [
    'character-driven', 'plot twists', 'emotional depth',
    'world-building', 'relationships', 'coming of age',
    'found family', 'redemption arcs', 'moral dilemmas'
  ];

  return fallbackInterests[genre.toLowerCase()] || defaultInterests;
}
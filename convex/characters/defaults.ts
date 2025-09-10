import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { authArgsValidator, buildIdentifierQuery, requireAuth } from "../lib/authHelpers";

// Default characters for new users
const DEFAULT_CHARACTERS = [
  {
    fullName: "Harry Potter",
    gender: "male",
    source: "Harry Potter"
  },
  {
    fullName: "Hermione Granger", 
    gender: "female",
    source: "Harry Potter"
  },
  {
    fullName: "Luke Skywalker",
    gender: "male",
    source: "Star Wars"
  }
];

// Genre-specific fallback characters for when AI generation fails
export const GENRE_FALLBACKS: Record<string, Array<{ fullName: string; gender: "male" | "female" | "other"; source: string }>> = {
  fantasy: [
    { fullName: "Tyrion Lannister", gender: "male", source: "Game of Thrones" },
    { fullName: "Hermione Granger", gender: "female", source: "Harry Potter" },
    { fullName: "Aragorn", gender: "male", source: "The Lord of the Rings" },
  ],
  romance: [
    { fullName: "Elizabeth Bennet", gender: "female", source: "Pride and Prejudice" },
    { fullName: "Mr. Darcy", gender: "male", source: "Pride and Prejudice" },
    { fullName: "Noah Calhoun", gender: "male", source: "The Notebook" },
  ],
  "sci-fi": [
    { fullName: "Luke Skywalker", gender: "male", source: "Star Wars" },
    { fullName: "Ellen Ripley", gender: "female", source: "Alien" },
    { fullName: "Jean-Luc Picard", gender: "male", source: "Star Trek" },
  ],
  adventure: [
    { fullName: "Indiana Jones", gender: "male", source: "Indiana Jones" },
    { fullName: "Lara Croft", gender: "female", source: "Tomb Raider" },
    { fullName: "Nathan Drake", gender: "male", source: "Uncharted" },
  ],
  mystery: [
    { fullName: "Sherlock Holmes", gender: "male", source: "Sherlock Holmes" },
    { fullName: "Hercule Poirot", gender: "male", source: "Agatha Christie" },
    { fullName: "Nancy Drew", gender: "female", source: "Nancy Drew" },
  ],
  comedy: [
    { fullName: "Michael Scott", gender: "male", source: "The Office" },
    { fullName: "Leslie Knope", gender: "female", source: "Parks and Recreation" },
    { fullName: "Chandler Bing", gender: "male", source: "Friends" },
  ],
  horror: [
    { fullName: "Laurie Strode", gender: "female", source: "Halloween" },
    { fullName: "Ash Williams", gender: "male", source: "Evil Dead" },
    { fullName: "Sidney Prescott", gender: "female", source: "Scream" },
  ],
  "goon-mode": [
    { fullName: "Anastasia Steele", gender: "female", source: "Fifty Shades of Grey" },
    { fullName: "Christian Grey", gender: "male", source: "Fifty Shades of Grey" },
    { fullName: "Jamie Fraser", gender: "male", source: "Outlander" },
  ],
};

// Global fallback when no genre-specific fallback exists
export const GLOBAL_FALLBACK = DEFAULT_CHARACTERS;

export const createDefaultCharacters = mutation({
  args: authArgsValidator,
  handler: async (ctx, args) => {
    const identifier = await requireAuth(ctx, args);
    const identifierQuery = buildIdentifierQuery(args);
    const indexName = args.userId ? "by_user" : "by_session";
    
    // Check if user already has characters
    const existing = await ctx.db
      .query("selectedCharacters")
      .withIndex(indexName, (q) => q.eq(args.userId ? "userId" : "sessionId", identifier))
      .first();
    
    if (!existing) {
      // Add default characters
      for (const character of DEFAULT_CHARACTERS) {
        await ctx.db.insert("selectedCharacters", {
          ...identifierQuery,
          fullName: character.fullName,
          gender: character.gender,
          source: character.source,
        });
      }
    }
    
    return { success: true };
  },
});
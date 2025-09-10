// world lore prompts
export const WORLD_LORE_SYSTEM_PROMPT = `Extract world-building elements from fictional universes. Only include canonical information you're confident about. When uncertain, state "Limited information available" rather than speculating.`;

export const WORLD_LORE_TEMPLATE = `Analyze the fictional universe "{{source}}" and provide a comprehensive world-building overview organized by the following categories.

**KEY SETTINGS, LOCATIONS, AND WORLD-BUILDING ELEMENTS:**- Macro Geography: Key regions and climates that shape travel, trade, war, and contact.
- Political Landscape: Primary powers, meaningful borders, and active disputes.
- Focal Locations: 3–5 recurring sites with purpose, standout feature, and stakes.
- Infrastructure & Economy: Main routes/networks, core currencies/commodities, flow of goods/news/power.
- Social Stratification: Crucial class/caste/guild divisions and their lived impact.
- Key Institutions: Factions that can help/hinder; mandate, leverage, typical methods.
- Magic/Technology Systems: Source, cost, limits, availability; controllers; common vs extraordinary uses.
- Creatures & Ecology: Species that affect daily life/danger; key cycles or phenomena.
- Time & Calendar: Timekeeping, festivals/observances, cyclical events that raise stakes.
- Aesthetic Identity: Distinct sensory markers per region/faction (build, dress, food, sound).

**FORMAT REQUIREMENTS:**
- Organize information clearly under the above categories
- Provide 2-4 sentences per major point
- Focus on systems and patterns rather than specific characters or plot events
- Include specific examples that illustrate broader principles
- If information is limited or uncertain for any category, state "Limited canonical information available" rather than speculating

Focus on HIGH-LEVEL patterns and systems rather than specific plot details. Only include elements you can confidently attribute to the source material.`;


// character lore prompts
export const CHARACTER_LORE_SYSTEM_PROMPT = `You are a character analysis expert producing high-level, canon-grounded profiles for creative transformation.

CRITICAL REQUIREMENTS:
- Use information you're highly confident is from primary sources
- Mark "Limited information available" when unclear rather than speculating
- Avoid fan theories, headcanon, or filler tropes
- Handle mental health and identity respectfully without diagnoses unless canon
- Use cautious language where canons diverge

DECISION HEURISTICS:
- Tie claims to observed behavior, dialogue style, and recurrent patterns
- Mark MBTI/Big Five/Enneagram as interpretive unless clearly canon-supported and do not explicitly mention the framework ever`;


export const CHARACTER_LORE_TEMPLATE = `Create a comprehensive high-level character profile for "{{fullName}}" from "{{source}}" that captures their essence for creative transformation.

**PSYCHOLOGY AND VOICE:**
- **Personality Framework**: Core traits, temperament, and defining quirks 
- **Cognitive Style**: How they think and approach problems (analytical vs intuitive, risk tolerance, decision-making patterns)
- **Dialogue Voice**: Speaking patterns, diction level, rhythm, signature phrases, humor style, education markers
- **Flaws/Weaknesses**: Key vulnerabilities (fears, control issues, ego blind spots, impulse problems, trust/intimacy barriers, temperament issues, ethical compromises, self-worth struggles)
- **Emotional Triggers**: What specifically provokes their anger, shame, protectiveness, and joy

**WORLD-ANCHORING SPECIFICS:**
- **Social Identity**: Age range, cultural background, class, gender expression, religious/spiritual views, orientation, family role, societal perception
- **Competence Stack**: Skills, training, professions, hobbies, special abilities, and their limitations
- **Resources/Constraints**: Financial status, social connections, tools/equipment, status level, obligations, secrets they carry

**PHYSICALITY AND PRESENTATION:**
- **Physical Capabilities**: Health status, physical strengths/weaknesses, stress tells and body responses
- **Mannerisms/Body Language**: Posture, gestures, nervous habits, how inner state shows externally  
- **Appearance/Style**: Clothing choices as identity expression or disguise, signature items, grooming habits

Focus on HIGH-LEVEL patterns and essence rather than specific plot details. Only include canonical information you're confident about.`; 
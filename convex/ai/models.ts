import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { UserTier } from "../config/rateLimits";

// Model definition type - defines a specific model with its properties
type ModelDefinition = {
  useOpenRouter: boolean;
  provider: string;
  model: string;
  pricing: {
    inputTokenPrice: number;
    outputTokenPrice: number;
  };
  maxTokens: number;
  reasoning?: {
    exclude?: boolean;
    effort?: "high" | "medium" | "low";
    max_tokens?: number;
    enabled?: boolean;
  };
};

// Route configuration type - references a model by name and includes route-specific settings
type RouteConfig = {
  modelName: string;
  temperature: number;
};

// Flexible route configuration - can be unified (single config for all tiers) or tier-specific
type FlexibleRouteConfig = RouteConfig | Record<UserTier, RouteConfig>;

// Define the use case keys type
export type ModelUseCase = 
  | 'characterSearch'
  | 'characterSuggestions'
  | 'storySearchSuggestions'
  | 'storySuggestionGeneration'
  | 'storyGeneration'
  | 'storyOutlineGeneration'
  | 'storySummaryGeneration'
  | 'continueStoryGeneration'
  | 'ruleGeneration'
  | 'worldLore'
  | 'characterLore'
  | 'tagSuggestions'
  | 'customCharacterLore'
  | 'customWorldLore'
  | 'customStorySuggestion'
  | 'expandStoryIdea'
  | 'importAnalysis'
  | 'characterChat'
  | 'onboardingAnalysis'
;

// Model definitions - centralized list of all available models
export const MODEL_DEFINITIONS: Record<string, ModelDefinition> = {
  'gemini-2.5-flash-lite': {
    useOpenRouter: true,
    provider: "google",
    model: "gemini-2.5-flash-lite:nitro",
    pricing: { inputTokenPrice: 0.0000001, outputTokenPrice: 0.0000004 },
    maxTokens: 8000,
  },
  'gemini-2.5-flash': {
    useOpenRouter: true,
    provider: "google",
    model: "gemini-2.5-flash:nitro",
    pricing: { inputTokenPrice: 0.0000001, outputTokenPrice: 0.0000004 },
    maxTokens: 8000,
    reasoning: {
      exclude: true,
    },
  },
  // Gemini 2.5 (non-preview)
  'gemini-2.5-pro': {
    useOpenRouter: true,
    provider: "google",
    model: "gemini-2.5-pro:nitro",
    pricing: { inputTokenPrice: 0.0000001, outputTokenPrice: 0.0000004 },
    maxTokens: 8000,
    reasoning: {
      exclude: true,
    },
  },
  // Gemini 2.0 (non-preview)
  'gemini-2.0': {
    useOpenRouter: true,
    provider: "google",
    model: "gemini-2.0:nitro",
    pricing: { inputTokenPrice: 0.0000001, outputTokenPrice: 0.0000004 },
    maxTokens: 8000,
  },
  'gemini-2.0-pro': {
    useOpenRouter: true,
    provider: "google",
    model: "gemini-2.0-pro:nitro",
    pricing: { inputTokenPrice: 0.0000001, outputTokenPrice: 0.0000004 },
    maxTokens: 8000,
  },
  'gemini-2.0-flash': {
    useOpenRouter: true,
    provider: "google",
    model: "gemini-2.0-flash-001:nitro",
    pricing: { inputTokenPrice: 0.0000001, outputTokenPrice: 0.0000004 },
    maxTokens: 8000,
  },
  'gemini-2.0-flash-lite': {
    useOpenRouter: true,
    provider: "google",
    model: "gemini-2.0-flash-lite-001:nitro",
    pricing: { inputTokenPrice: 0.0000001, outputTokenPrice: 0.0000004 },
    maxTokens: 8000,
  },
  'kimi-k2-nitro': {
    useOpenRouter: true,
    provider: "moonshotai",
    model: "kimi-k2:nitro",
    pricing: { inputTokenPrice: 0.000001, outputTokenPrice: 0.000003 },
    maxTokens: 1200,
  },
  'oss120': {
    useOpenRouter: true,
    provider: "openai",
    model: "gpt-oss-120b:nitro",
    pricing: { inputTokenPrice: 0.000001, outputTokenPrice: 0.000003 },
    maxTokens: 128000,
  },
  'qwen3-thinking': {
    useOpenRouter: true,
    provider: "qwen",
    model: "qwen3-235b-a22b-thinking-2507:nitro",
    pricing: { inputTokenPrice: 0.000001, outputTokenPrice: 0.000003 },
    maxTokens: 128000,
  },
  'qwen-3': {
    useOpenRouter: true,
    provider: "qwen",
    model: "qwen3-235b-a22b-2507:nitro",
    pricing: { inputTokenPrice: 0.000001, outputTokenPrice: 0.000003 },
    maxTokens: 128000,
  },
  'gpt-5-nano': {
    useOpenRouter: true,
    provider: "openai",
    model: "gpt-5-nano",
    pricing: { inputTokenPrice: 0.000001, outputTokenPrice: 0.000004 },
    maxTokens: 128000,
  },
  'gpt-5-mini': {
    useOpenRouter: true,
    provider: "openai",
    model: "gpt-5-mini",
    pricing: { inputTokenPrice: 0.000002, outputTokenPrice: 0.000006 },
    maxTokens: 128000,
  },
  'gpt-5': {
    useOpenRouter: true,
    provider: "openai",
    model: "gpt-5",
    pricing: { inputTokenPrice: 0.000015, outputTokenPrice: 0.000045 },
    maxTokens: 128000,
  },
  'gpt-5-chat': {
    useOpenRouter: true,
    provider: "openai",
    model: "gpt-5-chat",
    pricing: { inputTokenPrice: 0.000020, outputTokenPrice: 0.000060 },
    maxTokens: 128000,
  },
  // Direct OpenAI models (not through OpenRouter)
  'gemini-2.5-flash-on': {
    useOpenRouter: false,
    provider: "google",
    model: "gemini-2.5-flash",
    pricing: { inputTokenPrice: 0.000003, outputTokenPrice: 0.000012 },
    maxTokens: 4096,
  }
};

// Route configurations - specify which model to use and route-specific settings
// You can either specify a single config for all tiers or different configs per tier
//
// Option 1: Unified configuration (same config for all users)
// characterSuggestions: {
//   modelName: "gemini-2.5-flash-lite",
//   temperature: 0.1,
// }
//
// Option 2: Tier-specific configuration (different configs per tier)
// characterSearch: {
//   anonymous: { modelName: "gemini-2.5-flash-lite", temperature: 0.1 },
//   authenticated: { modelName: "gemini-2.5-flash-lite", temperature: 0.1 },
//   tier1: { modelName: "gemini-2.5-flash-lite", temperature: 0.1 },
//   tier2: { modelName: "kimi-k2-nitro", temperature: 0.1 },
//   tier3: { modelName: "kimi-k2-nitro", temperature: 0.1 }
// }
export const ROUTE_CONFIGS: Record<ModelUseCase, FlexibleRouteConfig> = {
  // Example of tier-specific config
  characterSearch: {
    anonymous: {
      modelName: "gemini-2.5-flash-lite",
      temperature: 0.1,
    },
    authenticated: {
      modelName: "gemini-2.5-flash-lite",
      temperature: 0.1,
    },
    tier1: {
      modelName: "gemini-2.5-flash-lite",
      temperature: 0.1,
    },
    tier2: {
      modelName: "gemini-2.5-flash-lite",
      temperature: 0.1,
    },
    tier3: {
      modelName: "gemini-2.5-flash-lite",
      temperature: 0.1,
    },
  },
  
  // Unified configs for simplicity - same model for all users
  characterSuggestions: {
    modelName: "gemini-2.5-flash-lite",
    temperature: 0.1,
  },
  
  storySearchSuggestions: {
    modelName: "gemini-2.5-flash-lite",
    temperature: 0.7,
  },
  
  storySuggestionGeneration: {
    modelName: "gemini-2.0-flash",
    temperature: 0.7,
  },
  
  storyGeneration: {
    anonymous: {
      modelName: "gemini-2.5-flash-lite",
      temperature: 1.0,
    },
    authenticated: {
      modelName: "gemini-2.5-flash-lite",
      temperature: 1.0,
    },
    tier1: {
      modelName: "gemini-2.0-flash",
      temperature: 1.0,
    },
    tier2: {
      modelName: "gemini-2.5-flash",
      temperature: 1.0  ,
    },
    tier3: {
      modelName: "gemini-2.5-flash",
      temperature: 1.0,
    },
  },
  
  storyOutlineGeneration: {
    modelName: "qwen-3",
    temperature: 0.7,
  },
  
  storySummaryGeneration: {
    modelName: "oss120",
    temperature: 0.3,
  },
  
  continueStoryGeneration: {
    modelName: "gemini-2.5-flash-lite",
    temperature: 0.8,
  },
  
  ruleGeneration: {
    modelName: "gemini-2.5-flash-lite",
    temperature: 0.7,
  },
  
  worldLore: {
    modelName: "kimi-k2-nitro",
    temperature: 0.2,
  },
  
  characterLore: {
    modelName: "kimi-k2-nitro",
    temperature: 0.2,
  },
  
  tagSuggestions: {
    modelName: "gemini-2.5-flash-lite",
    temperature: 0.7,
  },
  
  customCharacterLore: {
    modelName: "gemini-2.5-flash-lite",
    temperature: 0.8,
  },
  
  customWorldLore: {
    modelName: "gemini-2.5-flash-lite",
    temperature: 0.85,
  },
  
  customStorySuggestion: {
    modelName: "gemini-2.5-flash-lite",
    temperature: 0.9,
  },
  
  expandStoryIdea: {
    modelName: "gemini-2.5-flash-lite",
    temperature: 0.85,
  },

  // Analyze imported text and extract structured sections in Markdown
  importAnalysis: {
    modelName: "oss120",
    temperature: 0.2,
  },

  // Character chat (roleplay) - defaults to a creative, responsive chat model
  characterChat: {
    modelName: 'gemini-2.5-flash',
    temperature: 0.9,
  },

  // Onboarding analysis for image/text processing - uses direct OpenAI (not OpenRouter)
  onboardingAnalysis: {
    modelName: 'gemini-2.5-flash-on',
    temperature: 0.4,
  },
};

// Initialize OpenRouter client
const openrouterApiKey = process.env.OPENROUTER_API_KEY;
if (!openrouterApiKey) {
  console.error('OPENROUTER_API_KEY environment variable is not set');
}

export const openrouter = createOpenRouter({
  apiKey: openrouterApiKey,
});

// Helper function to calculate costs and prepare log data
export function calculateUsageAndCost(
  useCase: ModelUseCase,
  tier: UserTier,
  result: {
    usage?: {
      inputTokens?: number;
      outputTokens?: number;
      totalTokens?: number;
      reasoningTokens?: number;
      cachedInputTokens?: number;
    };
    totalUsage?: {
      inputTokens?: number;
      outputTokens?: number;
      totalTokens?: number;
      reasoningTokens?: number;
      cachedInputTokens?: number;
    };
  },
  success: boolean = true,
  errorMessage?: string
) {
  const routeConfig = getRouteConfig(useCase, tier);
  const modelDef = getModelDefinition(routeConfig.modelName);
  const usage = result.totalUsage || result.usage;
  
  // Calculate costs
  const inputTokens = usage?.inputTokens || 0;
  const outputTokens = usage?.outputTokens || 0;
  const inputCost = inputTokens * modelDef.pricing.inputTokenPrice;
  const outputCost = outputTokens * modelDef.pricing.outputTokenPrice;
  const totalCost = inputCost + outputCost;
  
  const logData = {
    useCase: useCase as string,
    tier: tier as string,
    provider: modelDef.provider,
    model: modelDef.model,
    modelName: routeConfig.modelName,
    temperature: routeConfig.temperature,
    inputTokens: usage?.inputTokens,
    outputTokens: usage?.outputTokens,
    totalTokens: usage?.totalTokens,
    reasoningTokens: usage?.reasoningTokens,
    cachedInputTokens: usage?.cachedInputTokens,
    inputCost,
    outputCost,
    totalCost,
    success,
    errorMessage,
  };

  return logData;
}

// Helper function to get gateway-compatible model string for non-OpenRouter providers
export function getModelString(useCase: ModelUseCase, tier: UserTier = 'authenticated') {
  const routeConfig = getRouteConfig(useCase, tier);
  const modelDef = getModelDefinition(routeConfig.modelName);
  if (!modelDef.useOpenRouter) {
    return `${modelDef.provider}/${modelDef.model}`;
  }
  throw new Error(`getModelString() is only for non-OpenRouter providers. Use getModelClient() for OpenRouter.`);
}

// Helper function to get the appropriate model client based on provider
export function getModelClient(useCase: ModelUseCase, tier: UserTier = 'authenticated') {
  const routeConfig = getRouteConfig(useCase, tier);
  const modelDef = getModelDefinition(routeConfig.modelName);
  
  if (!modelDef.useOpenRouter) {
    return `${modelDef.provider}/${modelDef.model}`;
  } else {
    return openrouter.chat(`${modelDef.provider}/${modelDef.model}`);
  }
}

// Helper to check if a route config is tier-specific
function isTierSpecificRouteConfig(config: FlexibleRouteConfig): config is Record<UserTier, RouteConfig> {
  return 'anonymous' in config || 'authenticated' in config || 'tier1' in config;
}

// Helper function to get route configuration for a use case and tier
export function getRouteConfig(useCase: ModelUseCase, tier: UserTier = 'authenticated'): RouteConfig {
  const config = ROUTE_CONFIGS[useCase];
  
  if (isTierSpecificRouteConfig(config)) {
    // Tier-specific config
    return config[tier];
  } else {
    // Unified config - same for all tiers
    return config;
  }
}

// Helper function to get model definition by name
export function getModelDefinition(modelName: string): ModelDefinition {
  const modelDef = MODEL_DEFINITIONS[modelName];
  if (!modelDef) {
    throw new Error(`Model definition not found for: ${modelName}`);
  }
  return modelDef;
}

// Helper function to get complete model configuration for a use case and tier (backward compatibility)
export function getModelConfig(useCase: ModelUseCase, tier: UserTier = 'authenticated') {
  const routeConfig = getRouteConfig(useCase, tier);
  const modelDef = getModelDefinition(routeConfig.modelName);
  
  // Return a combined object that maintains backward compatibility
  return {
    useOpenRouter: modelDef.useOpenRouter,
    provider: modelDef.provider,
    model: modelDef.model,
    settings: {
      temperature: routeConfig.temperature,
      maxTokens: modelDef.maxTokens,
    },
    pricing: modelDef.pricing,
  };
}


export type ModelProvider = "google" | "anthropic" | "moonshotai" | "qwen";
export type ModelName = string;
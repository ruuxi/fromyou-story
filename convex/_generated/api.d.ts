/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as actions_storyOutline from "../actions/storyOutline.js";
import type * as actions_storySummary from "../actions/storySummary.js";
import type * as ai_discovery from "../ai/discovery.js";
import type * as ai_interests from "../ai/interests.js";
import type * as ai_models from "../ai/models.js";
import type * as ai_usageLog from "../ai/usageLog.js";
import type * as analytics from "../analytics.js";
import type * as blindTest_mutations from "../blindTest/mutations.js";
import type * as characters__generated from "../characters/_generated.js";
import type * as characters_chatIntegration from "../characters/chatIntegration.js";
import type * as characters_defaults from "../characters/defaults.js";
import type * as characters_generateByGenre from "../characters/generateByGenre.js";
import type * as characters_index from "../characters/index.js";
import type * as characters_lore from "../characters/lore.js";
import type * as characters_loreHelpers from "../characters/loreHelpers.js";
import type * as characters_parser from "../characters/parser.js";
import type * as characters_pngProcessor from "../characters/pngProcessor.js";
import type * as characters_search from "../characters/search.js";
import type * as characters_searchHelpers from "../characters/searchHelpers.js";
import type * as characters_storage from "../characters/storage.js";
import type * as characters_types from "../characters/types.js";
import type * as characters_validators from "../characters/validators.js";
import type * as chats_index from "../chats/index.js";
import type * as config_rateLimits from "../config/rateLimits.js";
import type * as customContent_actions from "../customContent/actions.js";
import type * as customContent_mutations from "../customContent/mutations.js";
import type * as customContent_queries from "../customContent/queries.js";
import type * as http_advancedCharacterChat from "../http/advancedCharacterChat.js";
import type * as http_blindTest from "../http/blindTest.js";
import type * as http_characterChat from "../http/characterChat.js";
import type * as http_markdownJoinerTransform from "../http/markdownJoinerTransform.js";
import type * as http_onboarding from "../http/onboarding.js";
import type * as http_storyActions from "../http/storyActions.js";
import type * as http_storyGeneration from "../http/storyGeneration.js";
import type * as http from "../http.js";
import type * as imports_discovery from "../imports/discovery.js";
import type * as imports_index from "../imports/index.js";
import type * as imports_social from "../imports/social.js";
import type * as imports_versions from "../imports/versions.js";
import type * as lib_authHelpers from "../lib/authHelpers.js";
import type * as lib_characterSlots from "../lib/characterSlots.js";
import type * as lib_distributeCharacters from "../lib/distributeCharacters.js";
import type * as lib_parseCharacterResults from "../lib/parseCharacterResults.js";
import type * as lib_rateLimiter from "../lib/rateLimiter.js";
import type * as lib_subscriptionQuery from "../lib/subscriptionQuery.js";
import type * as lib_tagHelpers from "../lib/tagHelpers.js";
import type * as lib_tierCache from "../lib/tierCache.js";
import type * as lib_userTier from "../lib/userTier.js";
import type * as lorebooks_chatIntegration from "../lorebooks/chatIntegration.js";
import type * as lorebooks_parser from "../lorebooks/parser.js";
import type * as lorebooks_pngProcessor from "../lorebooks/pngProcessor.js";
import type * as lorebooks_storage from "../lorebooks/storage.js";
import type * as lorebooks_types from "../lorebooks/types.js";
import type * as lorebooks_validators from "../lorebooks/validators.js";
import type * as presets_mapper from "../presets/mapper.js";
import type * as presets_parser from "../presets/parser.js";
import type * as presets_storage from "../presets/storage.js";
import type * as presets_types from "../presets/types.js";
import type * as presets_validators from "../presets/validators.js";
import type * as prompts_adaptors_outputValidators from "../prompts/adaptors/outputValidators.js";
import type * as prompts_advanced_contextManager from "../prompts/advanced/contextManager.js";
import type * as prompts_advanced_macroProcessor from "../prompts/advanced/macroProcessor.js";
import type * as prompts_advanced_promptBuilder from "../prompts/advanced/promptBuilder.js";
import type * as prompts_advanced_samplerSettings from "../prompts/advanced/samplerSettings.js";
import type * as prompts_characterChat from "../prompts/characterChat.js";
import type * as prompts_characterSearch from "../prompts/characterSearch.js";
import type * as prompts_index from "../prompts/index.js";
import type * as prompts_lore from "../prompts/lore.js";
import type * as prompts_storyActions from "../prompts/storyActions.js";
import type * as prompts_storyChat from "../prompts/storyChat.js";
import type * as prompts_storyGeneration from "../prompts/storyGeneration.js";
import type * as prompts_storyOutline from "../prompts/storyOutline.js";
import type * as prompts_storySearchSuggestions from "../prompts/storySearchSuggestions.js";
import type * as prompts_storySuggestionGeneration from "../prompts/storySuggestionGeneration.js";
import type * as prompts_storySummary from "../prompts/storySummary.js";
import type * as prompts_templateRenderer from "../prompts/templateRenderer.js";
import type * as prompts_templates_characterSearch from "../prompts/templates/characterSearch.js";
import type * as prompts_templates_genreCharacters from "../prompts/templates/genreCharacters.js";
import type * as prompts_templates_index from "../prompts/templates/index.js";
import type * as prompts_templates_lore from "../prompts/templates/lore.js";
import type * as prompts_templates_storyActions from "../prompts/templates/storyActions.js";
import type * as prompts_templates_storyChat from "../prompts/templates/storyChat.js";
import type * as prompts_templates_storyGeneration from "../prompts/templates/storyGeneration.js";
import type * as prompts_templates_storyOutline from "../prompts/templates/storyOutline.js";
import type * as prompts_templates_storySearchSuggestions from "../prompts/templates/storySearchSuggestions.js";
import type * as prompts_templates_storySuggestionGeneration from "../prompts/templates/storySuggestionGeneration.js";
import type * as prompts_templates_storySummary from "../prompts/templates/storySummary.js";
import type * as prompts_templates_systemPrompts from "../prompts/templates/systemPrompts.js";
import type * as queries_outlineStatus from "../queries/outlineStatus.js";
import type * as queries_stories from "../queries/stories.js";
import type * as queries from "../queries.js";
import type * as referrals_mutations from "../referrals/mutations.js";
import type * as referrals_queries from "../referrals/queries.js";
import type * as resend from "../resend.js";
import type * as stories__helpers from "../stories/_helpers.js";
import type * as stories_feed from "../stories/feed.js";
import type * as stories_index from "../stories/index.js";
import type * as stories_internalQueries from "../stories/internalQueries.js";
import type * as stories_migration from "../stories/migration.js";
import type * as stories_mutations from "../stories/mutations.js";
import type * as stories_queries from "../stories/queries.js";
import type * as stories_searchSuggestions from "../stories/searchSuggestions.js";
import type * as stories_settings from "../stories/settings.js";
import type * as stories_sharing from "../stories/sharing.js";
import type * as stories_suggestions from "../stories/suggestions.js";
import type * as stories_tagSuggestions from "../stories/tagSuggestions.js";
import type * as stripe from "../stripe.js";
import type * as subscriptions_index from "../subscriptions/index.js";
import type * as users_index from "../users/index.js";
import type * as users_migration from "../users/migration.js";
import type * as users_preferences from "../users/preferences.js";
import type * as users_queries from "../users/queries.js";
import type * as utils_markdownParser from "../utils/markdownParser.js";
import type * as webhooks from "../webhooks.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  "actions/storyOutline": typeof actions_storyOutline;
  "actions/storySummary": typeof actions_storySummary;
  "ai/discovery": typeof ai_discovery;
  "ai/interests": typeof ai_interests;
  "ai/models": typeof ai_models;
  "ai/usageLog": typeof ai_usageLog;
  analytics: typeof analytics;
  "blindTest/mutations": typeof blindTest_mutations;
  "characters/_generated": typeof characters__generated;
  "characters/chatIntegration": typeof characters_chatIntegration;
  "characters/defaults": typeof characters_defaults;
  "characters/generateByGenre": typeof characters_generateByGenre;
  "characters/index": typeof characters_index;
  "characters/lore": typeof characters_lore;
  "characters/loreHelpers": typeof characters_loreHelpers;
  "characters/parser": typeof characters_parser;
  "characters/pngProcessor": typeof characters_pngProcessor;
  "characters/search": typeof characters_search;
  "characters/searchHelpers": typeof characters_searchHelpers;
  "characters/storage": typeof characters_storage;
  "characters/types": typeof characters_types;
  "characters/validators": typeof characters_validators;
  "chats/index": typeof chats_index;
  "config/rateLimits": typeof config_rateLimits;
  "customContent/actions": typeof customContent_actions;
  "customContent/mutations": typeof customContent_mutations;
  "customContent/queries": typeof customContent_queries;
  "http/advancedCharacterChat": typeof http_advancedCharacterChat;
  "http/blindTest": typeof http_blindTest;
  "http/characterChat": typeof http_characterChat;
  "http/markdownJoinerTransform": typeof http_markdownJoinerTransform;
  "http/onboarding": typeof http_onboarding;
  "http/storyActions": typeof http_storyActions;
  "http/storyGeneration": typeof http_storyGeneration;
  http: typeof http;
  "imports/discovery": typeof imports_discovery;
  "imports/index": typeof imports_index;
  "imports/social": typeof imports_social;
  "imports/versions": typeof imports_versions;
  "lib/authHelpers": typeof lib_authHelpers;
  "lib/characterSlots": typeof lib_characterSlots;
  "lib/distributeCharacters": typeof lib_distributeCharacters;
  "lib/parseCharacterResults": typeof lib_parseCharacterResults;
  "lib/rateLimiter": typeof lib_rateLimiter;
  "lib/subscriptionQuery": typeof lib_subscriptionQuery;
  "lib/tagHelpers": typeof lib_tagHelpers;
  "lib/tierCache": typeof lib_tierCache;
  "lib/userTier": typeof lib_userTier;
  "lorebooks/chatIntegration": typeof lorebooks_chatIntegration;
  "lorebooks/parser": typeof lorebooks_parser;
  "lorebooks/pngProcessor": typeof lorebooks_pngProcessor;
  "lorebooks/storage": typeof lorebooks_storage;
  "lorebooks/types": typeof lorebooks_types;
  "lorebooks/validators": typeof lorebooks_validators;
  "presets/mapper": typeof presets_mapper;
  "presets/parser": typeof presets_parser;
  "presets/storage": typeof presets_storage;
  "presets/types": typeof presets_types;
  "presets/validators": typeof presets_validators;
  "prompts/adaptors/outputValidators": typeof prompts_adaptors_outputValidators;
  "prompts/advanced/contextManager": typeof prompts_advanced_contextManager;
  "prompts/advanced/macroProcessor": typeof prompts_advanced_macroProcessor;
  "prompts/advanced/promptBuilder": typeof prompts_advanced_promptBuilder;
  "prompts/advanced/samplerSettings": typeof prompts_advanced_samplerSettings;
  "prompts/characterChat": typeof prompts_characterChat;
  "prompts/characterSearch": typeof prompts_characterSearch;
  "prompts/index": typeof prompts_index;
  "prompts/lore": typeof prompts_lore;
  "prompts/storyActions": typeof prompts_storyActions;
  "prompts/storyChat": typeof prompts_storyChat;
  "prompts/storyGeneration": typeof prompts_storyGeneration;
  "prompts/storyOutline": typeof prompts_storyOutline;
  "prompts/storySearchSuggestions": typeof prompts_storySearchSuggestions;
  "prompts/storySuggestionGeneration": typeof prompts_storySuggestionGeneration;
  "prompts/storySummary": typeof prompts_storySummary;
  "prompts/templateRenderer": typeof prompts_templateRenderer;
  "prompts/templates/characterSearch": typeof prompts_templates_characterSearch;
  "prompts/templates/genreCharacters": typeof prompts_templates_genreCharacters;
  "prompts/templates/index": typeof prompts_templates_index;
  "prompts/templates/lore": typeof prompts_templates_lore;
  "prompts/templates/storyActions": typeof prompts_templates_storyActions;
  "prompts/templates/storyChat": typeof prompts_templates_storyChat;
  "prompts/templates/storyGeneration": typeof prompts_templates_storyGeneration;
  "prompts/templates/storyOutline": typeof prompts_templates_storyOutline;
  "prompts/templates/storySearchSuggestions": typeof prompts_templates_storySearchSuggestions;
  "prompts/templates/storySuggestionGeneration": typeof prompts_templates_storySuggestionGeneration;
  "prompts/templates/storySummary": typeof prompts_templates_storySummary;
  "prompts/templates/systemPrompts": typeof prompts_templates_systemPrompts;
  "queries/outlineStatus": typeof queries_outlineStatus;
  "queries/stories": typeof queries_stories;
  queries: typeof queries;
  "referrals/mutations": typeof referrals_mutations;
  "referrals/queries": typeof referrals_queries;
  resend: typeof resend;
  "stories/_helpers": typeof stories__helpers;
  "stories/feed": typeof stories_feed;
  "stories/index": typeof stories_index;
  "stories/internalQueries": typeof stories_internalQueries;
  "stories/migration": typeof stories_migration;
  "stories/mutations": typeof stories_mutations;
  "stories/queries": typeof stories_queries;
  "stories/searchSuggestions": typeof stories_searchSuggestions;
  "stories/settings": typeof stories_settings;
  "stories/sharing": typeof stories_sharing;
  "stories/suggestions": typeof stories_suggestions;
  "stories/tagSuggestions": typeof stories_tagSuggestions;
  stripe: typeof stripe;
  "subscriptions/index": typeof subscriptions_index;
  "users/index": typeof users_index;
  "users/migration": typeof users_migration;
  "users/preferences": typeof users_preferences;
  "users/queries": typeof users_queries;
  "utils/markdownParser": typeof utils_markdownParser;
  webhooks: typeof webhooks;
}>;
declare const fullApiWithMounts: typeof fullApi;

export declare const api: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApiWithMounts,
  FunctionReference<any, "internal">
>;

export declare const components: {
  rateLimiter: {
    lib: {
      checkRateLimit: FunctionReference<
        "query",
        "internal",
        {
          config:
            | {
                capacity?: number;
                kind: "token bucket";
                maxReserved?: number;
                period: number;
                rate: number;
                shards?: number;
                start?: null;
              }
            | {
                capacity?: number;
                kind: "fixed window";
                maxReserved?: number;
                period: number;
                rate: number;
                shards?: number;
                start?: number;
              };
          count?: number;
          key?: string;
          name: string;
          reserve?: boolean;
          throws?: boolean;
        },
        { ok: true; retryAfter?: number } | { ok: false; retryAfter: number }
      >;
      clearAll: FunctionReference<
        "mutation",
        "internal",
        { before?: number },
        null
      >;
      getServerTime: FunctionReference<"mutation", "internal", {}, number>;
      getValue: FunctionReference<
        "query",
        "internal",
        {
          config:
            | {
                capacity?: number;
                kind: "token bucket";
                maxReserved?: number;
                period: number;
                rate: number;
                shards?: number;
                start?: null;
              }
            | {
                capacity?: number;
                kind: "fixed window";
                maxReserved?: number;
                period: number;
                rate: number;
                shards?: number;
                start?: number;
              };
          key?: string;
          name: string;
          sampleShards?: number;
        },
        {
          config:
            | {
                capacity?: number;
                kind: "token bucket";
                maxReserved?: number;
                period: number;
                rate: number;
                shards?: number;
                start?: null;
              }
            | {
                capacity?: number;
                kind: "fixed window";
                maxReserved?: number;
                period: number;
                rate: number;
                shards?: number;
                start?: number;
              };
          shard: number;
          ts: number;
          value: number;
        }
      >;
      rateLimit: FunctionReference<
        "mutation",
        "internal",
        {
          config:
            | {
                capacity?: number;
                kind: "token bucket";
                maxReserved?: number;
                period: number;
                rate: number;
                shards?: number;
                start?: null;
              }
            | {
                capacity?: number;
                kind: "fixed window";
                maxReserved?: number;
                period: number;
                rate: number;
                shards?: number;
                start?: number;
              };
          count?: number;
          key?: string;
          name: string;
          reserve?: boolean;
          throws?: boolean;
        },
        { ok: true; retryAfter?: number } | { ok: false; retryAfter: number }
      >;
      resetRateLimit: FunctionReference<
        "mutation",
        "internal",
        { key?: string; name: string },
        null
      >;
    };
    time: {
      getServerTime: FunctionReference<"mutation", "internal", {}, number>;
    };
  };
  resend: {
    lib: {
      cancelEmail: FunctionReference<
        "mutation",
        "internal",
        { emailId: string },
        null
      >;
      cleanupAbandonedEmails: FunctionReference<
        "mutation",
        "internal",
        { olderThan?: number },
        null
      >;
      cleanupOldEmails: FunctionReference<
        "mutation",
        "internal",
        { olderThan?: number },
        null
      >;
      get: FunctionReference<
        "query",
        "internal",
        { emailId: string },
        {
          complained: boolean;
          createdAt: number;
          errorMessage?: string;
          finalizedAt: number;
          from: string;
          headers?: Array<{ name: string; value: string }>;
          html?: string;
          opened: boolean;
          replyTo: Array<string>;
          resendId?: string;
          segment: number;
          status:
            | "waiting"
            | "queued"
            | "cancelled"
            | "sent"
            | "delivered"
            | "delivery_delayed"
            | "bounced"
            | "failed";
          subject: string;
          text?: string;
          to: string;
        } | null
      >;
      getStatus: FunctionReference<
        "query",
        "internal",
        { emailId: string },
        {
          complained: boolean;
          errorMessage: string | null;
          opened: boolean;
          status:
            | "waiting"
            | "queued"
            | "cancelled"
            | "sent"
            | "delivered"
            | "delivery_delayed"
            | "bounced"
            | "failed";
        } | null
      >;
      handleEmailEvent: FunctionReference<
        "mutation",
        "internal",
        { event: any },
        null
      >;
      sendEmail: FunctionReference<
        "mutation",
        "internal",
        {
          from: string;
          headers?: Array<{ name: string; value: string }>;
          html?: string;
          options: {
            apiKey: string;
            initialBackoffMs: number;
            onEmailEvent?: { fnHandle: string };
            retryAttempts: number;
            testMode: boolean;
          };
          replyTo?: Array<string>;
          subject: string;
          text?: string;
          to: string;
        },
        string
      >;
    };
  };
};

"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";

export const discoverAvailableModels = action({
  args: {},
  returns: v.object({
    modelCount: v.number(),
    models: v.array(v.object({
      id: v.string(),
      name: v.string(),
      description: v.optional(v.string()),
      pricing: v.optional(v.object({
        input: v.union(v.number(), v.string()),
        output: v.union(v.number(), v.string()),
      })),
    })),
  }),
  handler: async (ctx, args) => {
    // Check authentication

    try {
      // Import gateway dynamically
      const { gateway } = await import('@ai-sdk/gateway');
      
      console.log("🔍 Discovering available models from AI Gateway...");
      
      // Get available models from the gateway
      const availableModels = await gateway.getAvailableModels();
      
      console.log(`\n📊 Found ${availableModels.models.length} available models:\n`);
      console.log("=" .repeat(80));
      
      // Log each model with details
      availableModels.models.forEach((model, index) => {
        console.log(`\n${index + 1}. Model ID: ${model.id}`);
        console.log(`   Name: ${model.name}`);
        
        if (model.description) {
          console.log(`   📝 Description: ${model.description}`);
        }
        
        if (model.pricing) {
          console.log(`   💰 Pricing:`);
          console.log(`      📥 Input: $${model.pricing.input} per token`);
          console.log(`      📤 Output: $${model.pricing.output} per token`);
        }
        
        // Log any additional metadata if available
        if ((model as any).contextWindow) {
          console.log(`   🪟 Context Window: ${(model as any).contextWindow.toLocaleString()} tokens`);
        }
        
        if ((model as any).maxOutputTokens) {
          console.log(`   📏 Max Output: ${(model as any).maxOutputTokens.toLocaleString()} tokens`);
        }
        
        console.log("   " + "-".repeat(60));
      });

      console.log(`\n✅ Model discovery completed! Total: ${availableModels.models.length} models`);
      
      // Group models by provider for summary
      const modelsByProvider = availableModels.models.reduce((acc, model) => {
        const provider = model.id.split('/')[0];
        if (!acc[provider]) acc[provider] = [];
        acc[provider].push(model);
        return acc;
      }, {} as Record<string, any[]>);
      
      console.log("\n📈 Models by Provider:");
      Object.entries(modelsByProvider).forEach(([provider, models]) => {
        console.log(`   ${provider}: ${models.length} models`);
      });

      // Return the data
      return {
        modelCount: availableModels.models.length,
        models: availableModels.models.map(model => ({
          id: model.id,
          name: model.name,
          description: model.description || undefined,
          pricing: model.pricing ? {
            input: model.pricing.input,
            output: model.pricing.output,
          } : undefined,
        })),
      };

    } catch (error) {
      console.error('❌ Error discovering models:', error);
      throw new Error(`Failed to discover models. Please try again.`);
    }
  },
});

export const testModelGeneration = action({
  args: {
    prompt: v.string(),
    modelId: v.optional(v.string()),
  },
  returns: v.object({
    text: v.string(),
    modelUsed: v.string(),
    usage: v.optional(v.object({
      inputTokens: v.optional(v.number()),
      outputTokens: v.optional(v.number()),
      totalTokens: v.optional(v.number()),
    })),
  }),
  handler: async (ctx, args) => {
    // Check authentication

    try {
      const { gateway } = await import('@ai-sdk/gateway');
      const { generateText } = await import('ai');
      
      let modelId = args.modelId;
      
      // If no model specified, get the first available one
      if (!modelId) {
        const availableModels = await gateway.getAvailableModels();
        if (availableModels.models.length === 0) {
          throw new Error("No models available");
        }
        modelId = availableModels.models[0].id;
        console.log(`🎯 No model specified, using first available: ${modelId}`);
      }

      console.log(`🤖 Testing generation with model: ${modelId}`);
      console.log(`📝 Prompt: "${args.prompt}"`);
      
      // Generate text with the specified model
      const result = await generateText({
        model: modelId,
        prompt: args.prompt,
      });

      console.log(`\n✨ Generated Response:`);
      console.log(`"${result.text}"`);
      
             if (result.usage) {
         console.log(`\n📊 Token Usage:`);
         console.log(`   Input: ${result.usage.inputTokens} tokens`);
         console.log(`   Output: ${result.usage.outputTokens} tokens`);
         console.log(`   Total: ${result.usage.totalTokens} tokens`);
       }

       return {
         text: result.text,
         modelUsed: modelId,
         usage: result.usage ? {
           inputTokens: result.usage.inputTokens,
           outputTokens: result.usage.outputTokens,
           totalTokens: result.usage.totalTokens,
         } : undefined,
       };

    } catch (error) {
      console.error('❌ Error testing model generation:', error);
      throw new Error(`Failed to test model. Please try again.`);
    }
  },
}); 
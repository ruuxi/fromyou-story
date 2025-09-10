import { query, mutation, internalMutation } from "../_generated/server";
import { v } from "convex/values";
import { Id } from "../_generated/dataModel";
import { authArgsValidator, requireAuth, buildIdentifierQueryNormalized, isAnonymous } from "../lib/authHelpers";

// Types for convenience
type ChatId = Id<'characterChats'>;

// Utilities
async function assertChatOwner(ctx: any, chatId: ChatId, userId?: string, sessionId?: string) {
  const chat = await ctx.db.get(chatId);
  if (!chat) throw new Error("Chat not found");
  const isOwner = userId ? chat.userId === userId : chat.sessionId === sessionId;
  if (!isOwner) throw new Error("Forbidden");
  return chat;
}

// Queries
export const listChats = query({
  args: {
    ...authArgsValidator.fields,
    limit: v.optional(v.number()),
  },
  returns: v.array(v.object({
    _id: v.id('characterChats'),
    title: v.optional(v.string()),
    participants: v.array(v.string()),
    primarySource: v.optional(v.string()),
    lastMessageAt: v.optional(v.number()),
    lastPreview: v.optional(v.string()),
    updatedAt: v.number(),
    createdAt: v.number(),
    isActive: v.boolean(),
  })),
  handler: async (ctx, args) => {
    const identifier = await requireAuth(ctx, args);
    const isUser = !!args.userId;
    const limit = args.limit || 20;
    const indexName = isUser ? "by_user_and_updated" : "by_session_and_updated";
    const field = isUser ? "userId" : "sessionId";
    const rows = await ctx.db
      .query("characterChats")
      .withIndex(indexName, (q: any) => q.eq(field, identifier))
      .order("desc")
      .take(limit);
    return rows.map((r: any) => ({
      _id: r._id,
      title: r.title,
      participants: r.participants,
      primarySource: r.primarySource,
      lastMessageAt: r.lastMessageAt,
      lastPreview: r.lastPreview,
      updatedAt: r.updatedAt,
      createdAt: r._creationTime,
      isActive: r.isActive,
    }));
  },
});

export const getChat = query({
  args: {
    ...authArgsValidator.fields,
    chatId: v.id('characterChats'),
  },
  returns: v.union(v.object({
    _creationTime: v.number(),
    _id: v.id('characterChats'),
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    title: v.optional(v.string()),
    participants: v.array(v.string()),
    primarySource: v.optional(v.string()),
    authorNote: v.optional(v.string()),
    memory: v.optional(v.string()),
    formatMode: v.union(v.literal('classic_rp'), v.literal('chatml')),
    isGroup: v.boolean(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
    lastMessageAt: v.optional(v.number()),
    lastPreview: v.optional(v.string()),
  }), v.null()),
  handler: async (ctx, args) => {
    await requireAuth(ctx, args);
    const chat = await ctx.db.get(args.chatId);
    if (!chat) return null;
    const ownerOk = args.userId ? chat.userId === args.userId : chat.sessionId === args.sessionId;
    if (!ownerOk) return null;
    
    return {
      _creationTime: chat._creationTime,
      _id: chat._id,
      userId: chat.userId,
      sessionId: chat.sessionId,
      title: chat.title,
      participants: chat.participants,
      primarySource: chat.primarySource,
      authorNote: chat.authorNote,
      memory: chat.memory,
      formatMode: chat.formatMode,
      isGroup: chat.isGroup,
      isActive: chat.isActive,
      createdAt: chat._creationTime,
      updatedAt: chat.updatedAt,
      lastMessageAt: chat.lastMessageAt,
      lastPreview: chat.lastPreview,
    };
  },
});

export const getMessages = query({
  args: {
    ...authArgsValidator.fields,
    chatId: v.id('characterChats'),
    offset: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.object({
    _id: v.id('characterChatMessages'),
    _creationTime: v.number(),
    chatId: v.id('characterChats'),
    role: v.union(v.literal('user'), v.literal('assistant'), v.literal('system'), v.literal('ooc')),
    name: v.optional(v.string()),
    content: v.string(),
    messageIndex: v.number(),
    usage: v.optional(v.object({
      inputTokens: v.optional(v.number()),
      outputTokens: v.optional(v.number()),
      totalTokens: v.optional(v.number()),
      reasoningTokens: v.optional(v.number()),
      cachedInputTokens: v.optional(v.number()),
    })),
    model: v.optional(v.string()),
  })),
  handler: async (ctx, args) => {
    await requireAuth(ctx, args);
    const chat = await ctx.db.get(args.chatId);
    if (!chat) return [];
    const ownerOk = args.userId ? chat.userId === args.userId : chat.sessionId === args.sessionId;
    if (!ownerOk) return [];
    const offset = args.offset || 0;
    const limit = args.limit || 50;
    const rows = await ctx.db
      .query('characterChatMessages')
      .withIndex('by_chat_and_index', (q: any) =>
        q.eq('chatId', args.chatId).gte('messageIndex', offset)
      )
      .order('asc')
      .take(limit);
    return rows;
  },
});

// Paginated messages API: fetch last page or older pages relative to a cursor (messageIndex)
export const getMessagesPage = query({
  args: {
    ...authArgsValidator.fields,
    chatId: v.id('characterChats'),
    limit: v.optional(v.number()),
    beforeIndex: v.optional(v.number()),
  },
  returns: v.object({
    items: v.array(v.object({
      _creationTime: v.number(),
      _id: v.id('characterChatMessages'),
      chatId: v.id('characterChats'),
      role: v.union(v.literal('user'), v.literal('assistant'), v.literal('system'), v.literal('ooc')),
      name: v.optional(v.string()),
      content: v.string(),
      createdAt: v.number(),
      messageIndex: v.number(),
      usage: v.optional(v.object({
        inputTokens: v.optional(v.number()),
        outputTokens: v.optional(v.number()),
        totalTokens: v.optional(v.number()),
        reasoningTokens: v.optional(v.number()),
        cachedInputTokens: v.optional(v.number()),
      })),
      model: v.optional(v.string()),
    })),
    nextBeforeIndex: v.optional(v.number()),
  }),
  handler: async (ctx, args) => {
    await requireAuth(ctx, args);
    const chat = await ctx.db.get(args.chatId);
    if (!chat) return { items: [], nextBeforeIndex: undefined };
    const ownerOk = args.userId ? chat.userId === args.userId : chat.sessionId === args.sessionId;
    if (!ownerOk) return { items: [], nextBeforeIndex: undefined };

    const limit = args.limit || 50;
    const rows = await ctx.db
      .query('characterChatMessages')
      .withIndex('by_chat_and_index', (q: any) => {
        let b = q.eq('chatId', args.chatId);
        if (args.beforeIndex !== undefined) {
          b = b.lt('messageIndex', args.beforeIndex!);
        }
        return b;
      })
      .order('desc')
      .take(limit);

    const asc = [...rows].reverse();
    const nextBeforeIndex = asc.length > 0 ? asc[0].messageIndex : undefined;
    return { 
      items: asc.map(msg => ({
        ...msg,
        createdAt: msg._creationTime,
      })), 
      nextBeforeIndex 
    };
  },
});

// Mutations
export const createChat = mutation({
  args: {
    ...authArgsValidator.fields,
    participants: v.array(v.string()),
    primarySource: v.optional(v.string()),
    authorNote: v.optional(v.string()),
    memory: v.optional(v.string()),
    formatMode: v.optional(v.union(v.literal('classic_rp'), v.literal('chatml'))),
    title: v.optional(v.string()),
  },
  returns: v.id('characterChats'),
  handler: async (ctx, args) => {
    const identifierQuery = await buildIdentifierQueryNormalized(ctx, args);
    
    const now = Date.now();
    const chatId = await ctx.db.insert('characterChats', {
      ...identifierQuery,
      title: args.title,
      participants: args.participants,
      primarySource: args.primarySource,
      authorNote: args.authorNote,
      memory: args.memory,
      formatMode: args.formatMode || 'classic_rp',
      isGroup: args.participants.length > 1,
      isActive: true,
      updatedAt: now,
      lastMessageAt: undefined,
      lastPreview: undefined,
    });
    
    return chatId;
  },
});

export const appendUserMessage = internalMutation({
  args: {
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    chatId: v.id('characterChats'),
    name: v.optional(v.string()),
    content: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const chat = await assertChatOwner(ctx, args.chatId, args.userId, args.sessionId);
    const last = await ctx.db
      .query('characterChatMessages')
      .withIndex('by_chat_and_index', (q: any) => q.eq('chatId', args.chatId))
      .order('desc')
      .take(1);
    const nextIndex = (last[0]?.messageIndex ?? -1) + 1;
    await ctx.db.insert('characterChatMessages', {
      chatId: args.chatId,
      role: 'user',
      name: args.name,
      content: args.content,
      messageIndex: nextIndex,
    });
    await ctx.db.patch(args.chatId, {
      updatedAt: Date.now(),
      lastMessageAt: Date.now(),
      lastPreview: args.content.slice(0, 180),
    });
    return null;
  },
});

export const appendAssistantMessage = internalMutation({
  args: {
    userId: v.optional(v.string()),
    sessionId: v.optional(v.string()),
    chatId: v.id('characterChats'),
    name: v.optional(v.string()),
    content: v.string(),
    usage: v.optional(v.object({
      inputTokens: v.optional(v.number()),
      outputTokens: v.optional(v.number()),
      totalTokens: v.optional(v.number()),
      reasoningTokens: v.optional(v.number()),
      cachedInputTokens: v.optional(v.number()),
    })),
    model: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const chat = await assertChatOwner(ctx, args.chatId, args.userId, args.sessionId);
    const last = await ctx.db
      .query('characterChatMessages')
      .withIndex('by_chat_and_index', (q: any) => q.eq('chatId', args.chatId))
      .order('desc')
      .take(1);
    const nextIndex = (last[0]?.messageIndex ?? -1) + 1;
    await ctx.db.insert('characterChatMessages', {
      chatId: args.chatId,
      role: 'assistant',
      name: args.name,
      content: args.content,
      messageIndex: nextIndex,
      usage: args.usage,
      model: args.model,
    });
    await ctx.db.patch(args.chatId, {
      updatedAt: Date.now(),
      lastMessageAt: Date.now(),
      lastPreview: args.content.slice(0, 180),
    });
    return null;
  },
});

export const renameChat = mutation({
  args: {
    ...authArgsValidator.fields,
    chatId: v.id('characterChats'),
    title: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAuth(ctx, args);
    const chat = await ctx.db.get(args.chatId);
    if (!chat) throw new Error('Chat not found');
    const ownerOk = args.userId ? chat.userId === args.userId : chat.sessionId === args.sessionId;
    if (!ownerOk) throw new Error('Forbidden');
    await ctx.db.patch(args.chatId, { title: args.title, updatedAt: Date.now() });
    return null;
  },
});

export const deleteChat = mutation({
  args: {
    ...authArgsValidator.fields,
    chatId: v.id('characterChats'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAuth(ctx, args);
    const chat = await ctx.db.get(args.chatId);
    if (!chat) throw new Error('Chat not found');
    const ownerOk = args.userId ? chat.userId === args.userId : chat.sessionId === args.sessionId;
    if (!ownerOk) throw new Error('Forbidden');
    await ctx.db.patch(args.chatId, { isActive: false, updatedAt: Date.now() });
    return null;
  },
});

// Update chat settings
export const updateChatSettings = mutation({
  args: {
    ...authArgsValidator.fields,
    chatId: v.id('characterChats'),
    title: v.optional(v.string()),
    primarySource: v.optional(v.string()),
    authorNote: v.optional(v.string()),
    memory: v.optional(v.string()),
    formatMode: v.optional(v.union(v.literal('classic_rp'), v.literal('chatml'))),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAuth(ctx, args);
    const chat = await ctx.db.get(args.chatId);
    if (!chat) throw new Error('Chat not found');
    const ownerOk = args.userId ? chat.userId === args.userId : chat.sessionId === args.sessionId;
    if (!ownerOk) throw new Error('Forbidden');
    const patch: Record<string, any> = { updatedAt: Date.now() };
    if (args.title !== undefined) patch.title = args.title;
    if (args.primarySource !== undefined) patch.primarySource = args.primarySource;
    if (args.authorNote !== undefined) patch.authorNote = args.authorNote;
    if (args.memory !== undefined) patch.memory = args.memory;
    if (args.formatMode !== undefined) patch.formatMode = args.formatMode;
    await ctx.db.patch(args.chatId, patch);
    return null;
  },
});

// Public mutation to seed greeting if chat is empty
export const seedGreeting = mutation({
  args: {
    ...authArgsValidator.fields,
    chatId: v.id('characterChats'),
    content: v.string(),
    name: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAuth(ctx, args);
    const chat = await ctx.db.get(args.chatId);
    if (!chat) throw new Error('Chat not found');
    const ownerOk = args.userId ? chat.userId === args.userId : chat.sessionId === args.sessionId;
    if (!ownerOk) throw new Error('Forbidden');
    const existing = await ctx.db
      .query('characterChatMessages')
      .withIndex('by_chat_and_index', (q: any) => q.eq('chatId', args.chatId))
      .take(1);
    if (existing.length > 0) return null; // already seeded or has messages
    await ctx.db.insert('characterChatMessages', {
      chatId: args.chatId,
      role: 'assistant',
      name: args.name,
      content: args.content,
      messageIndex: 0,
    });
    await ctx.db.patch(args.chatId, {
      updatedAt: Date.now(),
      lastMessageAt: Date.now(),
      lastPreview: args.content.slice(0, 180),
    });
    return null;
  },
});


// Update a message's content (user/assistant/ooc only)
export const updateMessage = mutation({
  args: {
    ...authArgsValidator.fields,
    messageId: v.id('characterChatMessages'),
    content: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAuth(ctx, args);
    const msg = await ctx.db.get(args.messageId);
    if (!msg) throw new Error('Message not found');
    const chat = await ctx.db.get(msg.chatId);
    if (!chat) throw new Error('Chat not found');
    const ownerOk = args.userId ? chat.userId === args.userId : chat.sessionId === args.sessionId;
    if (!ownerOk) throw new Error('Forbidden');
    if (msg.role === 'system') throw new Error('System messages cannot be edited');

    await ctx.db.patch(args.messageId, { content: args.content });

    // If this was the last message, update chat preview
    const last = await ctx.db
      .query('characterChatMessages')
      .withIndex('by_chat_and_index', (q: any) => q.eq('chatId', msg.chatId))
      .order('desc')
      .take(1);
    const isLast = last[0]?._id === args.messageId;
    const chatPatch: Record<string, any> = { updatedAt: Date.now() };
    if (isLast) {
      chatPatch.lastPreview = args.content.slice(0, 180);
      chatPatch.lastMessageAt = last[0]?._creationTime ?? Date.now();
    }
    await ctx.db.patch(msg.chatId, chatPatch);
    return null;
  },
});

// Delete a message
export const deleteMessage = mutation({
  args: {
    ...authArgsValidator.fields,
    messageId: v.id('characterChatMessages'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAuth(ctx, args);
    const msg = await ctx.db.get(args.messageId);
    if (!msg) throw new Error('Message not found');
    const chat = await ctx.db.get(msg.chatId);
    if (!chat) throw new Error('Chat not found');
    const ownerOk = args.userId ? chat.userId === args.userId : chat.sessionId === args.sessionId;
    if (!ownerOk) throw new Error('Forbidden');

    await ctx.db.delete(args.messageId);

    // Recompute last preview and timestamp
    const last = await ctx.db
      .query('characterChatMessages')
      .withIndex('by_chat_and_index', (q: any) => q.eq('chatId', msg.chatId))
      .order('desc')
      .take(1);
    const chatPatch: Record<string, any> = { updatedAt: Date.now() };
    if (last.length > 0) {
      chatPatch.lastPreview = (last[0].content || '').slice(0, 180);
      chatPatch.lastMessageAt = last[0]._creationTime;
    } else {
      chatPatch.lastPreview = undefined;
      chatPatch.lastMessageAt = undefined;
    }
    await ctx.db.patch(msg.chatId, chatPatch);
    return null;
  },
});



import type { UIMessage } from 'ai';

// Simple macro replacement for basic chat functionality
function applyMacros(input: string, opts: { 
  userName?: string; 
  playerName?: string; 
  activeChar?: string; 
}): string {
  if (!input) return '';
  const { userName = 'You', playerName, activeChar = 'Character' } = opts || {};
  const effectiveUserName = playerName || userName || 'You';
  
  return String(input)
    .replace(/\{\{user\}\}/g, effectiveUserName)
    .replace(/\{\{playerName\}\}/g, effectiveUserName)
    .replace(/\{\{char\}\}/g, activeChar)
    .replace(/\{\{time\}\}/g, new Date().toLocaleTimeString())
    .replace(/\{\{date\}\}/g, new Date().toLocaleDateString());
}

// Build basic system prompt for character chat
export function buildCharacterChatSystemPrompt(opts: {
  userName?: string;
  playerName?: string;
  activeChar?: string;
  formatMode?: 'classic_rp' | 'chatml';
  charLore?: Record<string, string>;
  characterId?: string;
}): string {
  const { userName = 'You', playerName, activeChar = 'Character', formatMode = 'classic_rp' } = opts || {};
  const effectiveUserName = playerName || userName || 'You';

  let systemPrompt = `You are ${activeChar}. You are having a conversation with ${effectiveUserName}.

Stay in character and respond naturally. Use the conversation history to maintain context and consistency.`;

  if (formatMode === 'classic_rp') {
    systemPrompt += `\n\nFormat your responses in a roleplay style, using actions in asterisks when appropriate.`;
  }

  return systemPrompt;
}

// Compose context for character chat
export function composeCharacterChatContext(opts: {
  memory?: string;
  authorNote?: string;
  userName?: string;
  playerName?: string;
  activeChar?: string;
  charLore?: Record<string, string>;
  worldLore?: string | null;
  characterId?: string;
}): string {
  const { memory, authorNote, userName = 'You', playerName, activeChar = 'Character' } = opts || {};
  const effectiveUserName = playerName || userName || 'You';
  
  const contextParts: string[] = [];

  if (memory) {
    contextParts.push(`Background: ${applyMacros(memory, { userName, playerName, activeChar })}`);
  }

  if (authorNote) {
    contextParts.push(`Instructions: ${applyMacros(authorNote, { userName, playerName, activeChar })}`);
  }

  return contextParts.join('\n\n');
}

// Convert UI messages to model format
export function toModelMessages(opts: {
  messages: UIMessage[];
  formatMode?: 'classic_rp' | 'chatml';
  userName?: string;
  activeChar?: string;
}): Array<{ role: string; content: string }> {
  const { messages, userName = 'You', activeChar = 'Character' } = opts || {};
  
  return messages.map((msg: any) => ({
    role: msg.role,
    content: (msg.parts || [])
      .filter((p: any) => p.type === 'text')
      .map((p: any) => p.text)
      .join('')
  }));
}

// Empty functions for compatibility
export function activateLorebookEntries(): any {
  return {};
}

export function mapPresetToModelOptions(): any {
  return {};
}
'use client';

import { useEffect, useMemo, useCallback, useState, useRef } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useChat } from '@ai-sdk/react';
import type { UIMessage } from 'ai';
import { useAuthedTransport } from '@/hooks/useAuthedTransport';
import { useStoryActions } from '@/hooks/useStoryActions';
import { useStoryActionsContext } from '@/contexts/StoryActionsContext';
import { useScrollContainer } from '@/contexts/ScrollContext';
import { useAutoScrollToBottom } from '@/hooks/useAutoScrollToBottom';

import { StoryContent } from './StoryContent';
import { StoryLoreSettingsDialog } from './StoryLoreSettingsDialog';
import { StoryShareDialog } from './StoryShareDialog';
import { StoryProgressIndicator } from './StoryProgressIndicator';

export interface StoryPlaceholder {
  id: string;
  sourceTitle: string;
  pages: string[];
  currentChapter?: number;
  currentAct?: number;
  storyStatus?: 'ongoing' | 'act_complete' | 'chapter_complete' | 'story_complete';
  selectedCharacters?: string[];
  primarySource?: string;
  outline?: {
    acts: Array<{
      title?: string;
      chapters: Array<{
        title?: string;
        beats: string[];
      }>;
    }>;
  };
  userMessages?: Array<{
    text: string;
    timestamp: number;
    actionId?: string;
  }>;
  // New loading state properties
  isLoading?: boolean;
  outlineStatus?: 'pending' | 'complete' | 'error';
  hasError?: boolean;
}

interface StoryViewerProps {
  story: StoryPlaceholder;
  onBack?: () => void;
  isModal?: boolean;
  isPublicView?: boolean;
}

export function StoryViewer({ story, onBack, isPublicView = false }: StoryViewerProps) {
  // Custom lore state for this story
  const [customWorldLore, setCustomWorldLore] = useState<string | undefined>(undefined);
  const [customCharacterLore, setCustomCharacterLore] = useState<Record<string, string> | undefined>(undefined);
  const [isLoreDialogOpen, setIsLoreDialogOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

  // Open/close settings via global events (toggle on open) - disabled for public views
  useEffect(() => {
    if (isPublicView) return; // Don't enable settings for public views
    
    const handleOpenOrToggle = () => {
      setIsLoreDialogOpen((wasOpen) => !wasOpen);
    };
    const handleClose = () => setIsLoreDialogOpen(false);

    window.addEventListener('openStoryLoreSettings', handleOpenOrToggle);
    window.addEventListener('closeStoryLoreSettings', handleClose);
    window.addEventListener('storySettings:close', handleClose);
    return () => {
      window.removeEventListener('openStoryLoreSettings', handleOpenOrToggle);
      window.removeEventListener('closeStoryLoreSettings', handleClose);
      window.removeEventListener('storySettings:close', handleClose);
    };
  }, [isPublicView]);

  // Open/close share dialog via global events - disabled for public views
  const [shareDialogPageNumber, setShareDialogPageNumber] = useState<number | undefined>(undefined);
  
  useEffect(() => {
    if (isPublicView) return; // Don't enable sharing for public views
    
    const handleOpenShare = () => {
      setShareDialogPageNumber(undefined); // entire story
      setIsShareDialogOpen(true);
    };
    const handleOpenSharePage = (event: CustomEvent<{ pageNumber: number }>) => {
      setShareDialogPageNumber(event.detail.pageNumber);
      setIsShareDialogOpen(true);
    };
    const handleCloseShare = () => setIsShareDialogOpen(false);

    window.addEventListener('openStoryShare', handleOpenShare);
    window.addEventListener('openStorySharePage', handleOpenSharePage as EventListener);
    window.addEventListener('closeStoryShare', handleCloseShare);
    return () => {
      window.removeEventListener('openStoryShare', handleOpenShare);
      window.removeEventListener('openStorySharePage', handleOpenSharePage as EventListener);
      window.removeEventListener('closeStoryShare', handleCloseShare);
    };
  }, [isPublicView]);

  // After closing, broadcast a close event asynchronously so other UI can react
  const prevOpenRef = useRef(isLoreDialogOpen);
  // Prevent initialMessages hydration from repopulating old pages during page-1 retry reset
  const suppressInitialHydrationRef = useRef(false);
  useEffect(() => {
    const wasOpen = prevOpenRef.current;
    if (wasOpen && !isLoreDialogOpen) {
      const id = setTimeout(() => {
        window.dispatchEvent(new Event('closeStoryLoreSettings'));
      }, 0);
      return () => clearTimeout(id);
    }
    prevOpenRef.current = isLoreDialogOpen;
  }, [isLoreDialogOpen]);
  const { setStoryActions } = useStoryActionsContext();
  const scrollContainerRef = useScrollContainer();

  // Convert existing story pages and user messages to UIMessage format for chat initialization
  const initialMessages = useMemo(() => {
    if (story.pages.length === 0) return [];

    const messages: UIMessage[] = [];
    
    // Add initial "Start the story" message for the first page
    messages.push({
      id: `user-start-${story.id}`,
      role: 'user',
      parts: [{ type: 'text', text: 'Start the story' }],
    });

    // Always add the first page as an assistant response
    if (story.pages[0]) {
      messages.push({
        id: `assistant-page-0-${story.id}`,
        role: 'assistant', 
        parts: [{ type: 'text', text: story.pages[0] }],
      });
    }

    // For public views, include all remaining pages as assistant messages so the full story renders
    if (isPublicView && story.pages.length > 1) {
      for (let pageIndex = 1; pageIndex < story.pages.length; pageIndex++) {
        const pageText = story.pages[pageIndex];
        if (!pageText) continue;
        messages.push({
          id: `assistant-page-${pageIndex}-${story.id}`,
          role: 'assistant',
          parts: [{ type: 'text', text: pageText }],
        });
      }
      return messages;
    }

    // Private views: include user messages and corresponding pages
    if (story.userMessages) {
      story.userMessages.forEach((userMsg, index) => {
        // Add user message
        messages.push({
          id: `user-${index}-${story.id}`,
          role: 'user',
          parts: [{ type: 'text', text: userMsg.text }],
          metadata: userMsg.actionId ? { actionId: userMsg.actionId } : undefined,
        });

        // Add corresponding story page (index + 1 because first page is already added)
        const pageIndex = index + 1;
        if (story.pages[pageIndex]) {
          messages.push({
            id: `assistant-page-${pageIndex}-${story.id}`,
            role: 'assistant',
            parts: [{ type: 'text', text: story.pages[pageIndex] }],
          });
        }
      });
    }

    return messages;
  }, [
    story.pages.length,
    story.pages.map(page => page.substring(0, 50)).join('|'), // Only check beginning of pages to avoid excessive deps
    story.userMessages?.length || 0,
    story.userMessages?.map(msg => msg.text.substring(0, 20)).join('|') || '',
    story.id,
    isPublicView
  ]);

  const {
    messages,
    sendMessage,
    status,
    setMessages,
    // regenerate, // Alternative approach if server supports regeneration trigger
  } = useChat({
    // Use persistent chat ID to maintain state
    id: story.id,
    transport: useAuthedTransport('/api/story/chat', { storyId: story.id, customWorldLore, customCharacterLore }),
    onError: (error) => {
      console.error('useChat error:', error);
    },
  });

  // Initialize messages once when component mounts and we have initial data
  useEffect(() => {
    if (suppressInitialHydrationRef.current) return;
    if (initialMessages.length > 0 && messages.length === 0) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[StoryViewer] Setting initial messages:', initialMessages.length);
      }
      setMessages(initialMessages);
    }
  }, [initialMessages, messages.length, setMessages]);

  // Reset hydration suppression once the DB reports zero pages (retry page 1 case)
  useEffect(() => {
    if (story.pages.length === 0 && suppressInitialHydrationRef.current) {
      suppressInitialHydrationRef.current = false;
    }
  }, [story.pages.length]);
  
  // Determine if generating - only consider streaming, not submitted
  const isGenerating = status === 'streaming';

  // Auto-scroll when streaming new content - only track the last message content when streaming
  const lastMessageContent = messages.filter(m => m.role === 'assistant').at(-1)?.parts
    .filter(p => p.type === 'text').map(p => p.text).join('') || '';
  
  useAutoScrollToBottom(
    scrollContainerRef || { current: null },
    [lastMessageContent],
    isGenerating,
    undefined,
    {
      getTargetTop: (container) => {
        try {
          const actionNodes = container.querySelectorAll('[data-action-index]')
          if (!actionNodes || actionNodes.length === 0) return null
          const lastAction = actionNodes[actionNodes.length - 1] as HTMLElement
          const containerTop = container.getBoundingClientRect().top
          const elementTop = lastAction.getBoundingClientRect().top
          const absoluteTop = container.scrollTop + (elementTop - containerTop)
          return absoluteTop
        } catch {
          return null
        }
      }
    }
  );

  // Generate initial page strictly after outline is complete
  useEffect(() => {
    if (!story.isLoading && story.outlineStatus === 'complete' && story.pages.length === 0) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[StoryViewer] Starting initial page generation (outline complete)');
      }
      sendMessage({ text: 'Start the story' });
    }
  }, [story.isLoading, story.outlineStatus, story.pages.length, sendMessage]);

  // Debug logging
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[StoryViewer] Debug info:', {
        'initialMessages.length': initialMessages.length,
        'messages.length': messages.length,
        'story.pages.length': story.pages.length,
        'initialMessages': initialMessages.map(m => ({ role: m.role, contentLength: m.parts?.filter(p => p.type === 'text').map(p => p.text).join('').length || 0 })),
        'messages': messages.map(m => ({ role: m.role, contentLength: m.parts?.filter(p => p.type === 'text').map(p => p.text).join('').length || 0 }))
      });
    }
  }, [initialMessages, messages, story.pages.length]);

  // Memoized computation of story pages and content
  const { allPages, currentPageContent } = useMemo(() => {
    // Extract pages from current chat session (assistant messages only)
    const chatPages = messages
      .filter(m => m.role === 'assistant')
      .map(m => m.parts.filter(p => p.type === 'text').map(p => p.text).join(''));

    // Always use chat session since it's properly initialized
    const finalPages = chatPages.length > 0 ? chatPages : [''];

    return {
      allPages: finalPages,
      currentPageContent: finalPages[finalPages.length - 1] || ''
    };
  }, [
    // Only depend on messages since they're properly managed by useChat
    messages.length,
    messages.filter(m => m.role === 'assistant').map(m => m.parts.filter(p => p.type === 'text').map(p => p.text).join('')).join('|')
  ]);

  // Fetch story actions for the current page - disabled for public views
  const actionsEnabled = !!currentPageContent && !isGenerating && !story.isLoading && !isPublicView;
  
  const { actions, isLoading: isLoadingActions } = useStoryActions(
    story.id,
    currentPageContent,
    actionsEnabled,
    isGenerating
  );

  // Notify parent of actions change
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[StoryViewer] Actions update:', {
        actions,
        isLoadingActions,
        isGenerating,
        isLoading: story.isLoading
      });
    }
    
    if (isGenerating || story.isLoading) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[StoryViewer] Clearing actions (generating or loading)');
      }
      setStoryActions([]);
    } else if (!isLoadingActions && actionsEnabled) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[StoryViewer] Setting actions:', actions);
      }
      setStoryActions(actions);
    }
  }, [actions, isLoadingActions, isGenerating, setStoryActions, actionsEnabled, story.isLoading]);

  // Handle external message sending (from search input) via custom events
  useEffect(() => {
    const handleSendMessage = (event: CustomEvent<{ text: string }>) => {
      sendMessage({ text: event.detail.text });
    };
    
    window.addEventListener('storyViewerSendMessage', handleSendMessage as EventListener);
    
    return () => {
      window.removeEventListener('storyViewerSendMessage', handleSendMessage as EventListener);
    };
  }, [sendMessage]);

  // Create action display pages based only on current chat user messages
  const actionDisplayPages = useMemo(() => {
    const userMsgs = messages
      .filter(m => m.role === 'user')
      .filter(m => m.parts.some(p => p.type === 'text'))
      .map(m => ({
        text: m.parts.filter(p => p.type === 'text').map(p => p.text).join(''),
        actionId: (m.metadata as { actionId?: string })?.actionId,
      }));

    const filtered = userMsgs.filter(m => m.text !== 'Start the story');
    return filtered.map(m => (m.actionId ? `Action: ${m.text}` : `User: ${m.text}`));
  }, [
    messages.filter(m => m.role === 'user').map(m => m.parts.filter(p => p.type === 'text').map(p => p.text).join('')).join('|')
  ]);

  // Helpers to map indices between displayed items and chat messages
  const getMessageText = useCallback((m: UIMessage) => (
    (m.parts || [])
      .filter(p => (p as any).type === 'text')
      .map(p => (p as any).text)
      .join('')
  ), []);

  const findAssistantMessageIndexByPage = useCallback((pageIndex: number) => {
    let assistantCount = -1;
    for (let i = 0; i < messages.length; i++) {
      if (messages[i].role === 'assistant') {
        assistantCount++;
        if (assistantCount === pageIndex) return i;
      }
    }
    return -1;
  }, [messages]);

  const findUserMessageIndexByAction = useCallback((actionIndex: number) => {
    let userCount = -1;
    for (let i = 0; i < messages.length; i++) {
      const m = messages[i];
      if (m.role === 'user') {
        const text = getMessageText(m);
        if (text === 'Start the story') continue;
        userCount++;
        if (userCount === actionIndex) return i;
      }
    }
    return -1;
  }, [messages, getMessageText]);

  // Server-side mutations to keep DB aligned with in-memory chat
  const deletePageAndUserMutation = useMutation(api.stories.mutations.deleteStoryPageAndPrecedingUserMessage);
  const truncateAtPageMutation = useMutation(api.stories.mutations.truncateStoryAtPageIndex);
  const deleteUserMessageMutation = useMutation(api.stories.mutations.deleteUserMessageAtIndex);

  // Handlers for pages (assistant messages)
  const handleDeletePage = useCallback((pageIndex: number) => {
    // Special-case page 1 (index 0): same logic as retry to maintain consistency
    if (pageIndex === 0) {
      // Avoid rehydration with old pages while DB update propagates
      suppressInitialHydrationRef.current = true;
      // Clear chat first so the UI immediately reflects 0 pages
      setMessages([]);
      // Then truncate DB; auto-start effect will send Start the story once
      truncateAtPageMutation({ storyId: story.id as any, pageIndex: 0 }).catch(() => {/* ignore */});
      return;
    }

    const assistantIdx = findAssistantMessageIndexByPage(pageIndex);
    if (assistantIdx < 0) return;
    // also remove the preceding user message if present
    let precedingUserIdx = -1;
    for (let i = assistantIdx - 1; i >= 0; i--) {
      if (messages[i].role === 'user') { precedingUserIdx = i; break; }
      if (messages[i].role === 'assistant') break; // stop if previous block is another assistant
    }
    setMessages(messages.filter((_, i) => i !== assistantIdx && i !== precedingUserIdx));
    // Persist deletion in DB atomically by page index and aligned preceding user message
    deletePageAndUserMutation({ storyId: story.id as any, pageIndex }).catch(() => {/* ignore */});
  }, [messages, setMessages, findAssistantMessageIndexByPage, deletePageAndUserMutation, truncateAtPageMutation, story.id]);

  const handleRetryPage = useCallback((pageIndex: number) => {
    // Special-case page 1 (index 0): don't send a message; just truncate to 0 and
    // clear chat so the auto-start effect triggers a single "Start the story".
    if (pageIndex === 0) {
      // Avoid rehydration with old pages while DB update propagates
      suppressInitialHydrationRef.current = true;
      // Clear chat first so the UI immediately reflects 0 pages
      setMessages([]);
      // Then truncate DB; auto-start effect will send Start the story once
      truncateAtPageMutation({ storyId: story.id as any, pageIndex: 0 }).catch(() => {/* ignore */});
      return;
    }

    const assistantIdx = findAssistantMessageIndexByPage(pageIndex);
    if (assistantIdx < 0) return;
    // find preceding user message
    let userIdx = -1;
    for (let i = assistantIdx - 1; i >= 0; i--) {
      if (messages[i].role === 'user') { userIdx = i; break; }
    }
    if (userIdx < 0) return;
    const userMsg = messages[userIdx];
    const userText = getMessageText(userMsg);
    const metadata = (userMsg.metadata ?? {}) as Record<string, any>;
    // First, truncate DB at the selected page index to keep DB aligned
    truncateAtPageMutation({ storyId: story.id as any, pageIndex }).catch(() => {/* ignore */});
    // keep everything before this user message
    setMessages(messages.slice(0, userIdx));
    // re-send the same user message after state update
    setTimeout(() => {
      sendMessage({ text: userText }, { metadata });
    }, 0);
  }, [messages, setMessages, sendMessage, findAssistantMessageIndexByPage, getMessageText, truncateAtPageMutation, story.id]);

  // Handlers for action display items (user messages)
  const handleDeleteActionMessage = useCallback((actionIndex: number) => {
    const userIdx = findUserMessageIndexByAction(actionIndex);
    if (userIdx < 0) return;
    // delete only the user message; keep the assistant page
    setMessages(messages.filter((_, i) => i !== userIdx));
    // Persist delete by deterministic index mapping (actionIndex corresponds to persisted userMessages index)
    deleteUserMessageMutation({ storyId: story.id as any, messageIndex: actionIndex }).catch(() => {/* ignore */});
  }, [messages, setMessages, findUserMessageIndexByAction, deleteUserMessageMutation, story.id]);

  const handleRetryActionMessage = useCallback((actionIndex: number) => {
    const userIdx = findUserMessageIndexByAction(actionIndex);
    if (userIdx < 0) return;
    const userMsg = messages[userIdx];
    const userText = getMessageText(userMsg);
    const metadata = (userMsg.metadata ?? {}) as Record<string, any>;
    // Truncate DB at the page that follows this user message: pageIndex = actionIndex + 1
    const pageIndex = actionIndex + 1;
    truncateAtPageMutation({ storyId: story.id as any, pageIndex }).catch(() => {/* ignore */});
    // keep everything before this user message
    setMessages(messages.slice(0, userIdx));
    // re-send the same user message after state update
    setTimeout(() => {
      sendMessage({ text: userText }, { metadata });
    }, 0);
  }, [messages, setMessages, sendMessage, findUserMessageIndexByAction, getMessageText, truncateAtPageMutation, story.id]);

  // Handle page edits by updating the corresponding assistant message
  const handleEditPage = useCallback((pageIndex: number, newContent: string) => {
    const assistantIdx = findAssistantMessageIndexByPage(pageIndex);
    if (assistantIdx < 0) return;
    
    // Create updated messages array with the edited content
    const updatedMessages = [...messages];
    updatedMessages[assistantIdx] = {
      ...updatedMessages[assistantIdx],
      parts: [{ type: 'text', text: newContent }]
    };
    
    setMessages(updatedMessages);
  }, [messages, setMessages, findAssistantMessageIndexByPage]);

  // Calculate total chapters if outline is available
  const totalChapters = story.outline?.acts.reduce(
    (total, act) => total + act.chapters.length, 
    0
  );

  // Determine loading message based on state
  let loadingMessage = 'Crafting your story...';
  if (story.isLoading) {
    loadingMessage = 'Loading story...';
  } else if (story.outlineStatus === 'pending') {
    loadingMessage = 'Crafting your story outline...';
  }

  // Handle error state after all hooks are initialized
  if (story.hasError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-rose-400 font-semibold mb-2">Error</div>
          <div className="text-amber-50/70 text-sm mb-4">Failed to generate story outline. Please try again.</div>
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 hover:bg-amber-100/20 text-amber-50 rounded-md"
          >
            Back to Stories
          </button>
        </div>
      </div>
    )
  }



  return (
    <div>
      {!isPublicView && isLoreDialogOpen && (
        <StoryLoreSettingsDialog
          storyId={story.id}
          primarySource={story.primarySource}
          selectedCharacters={story.selectedCharacters || []}
          onClose={() => {
            setIsLoreDialogOpen(false);
          }}
          onSave={(data) => {
            setCustomWorldLore(data.worldLore);
            setCustomCharacterLore(data.characterLore);
            setIsLoreDialogOpen(false);
          }}
        />
      )}
      {!isPublicView && isShareDialogOpen && (
        <StoryShareDialog
          storyId={story.id}
          currentPage={shareDialogPageNumber || allPages.length}
          totalPages={allPages.length}
          onClose={() => {
            setIsShareDialogOpen(false);
            setShareDialogPageNumber(undefined);
          }}
        />
      )}
      <StoryContent 
        pages={allPages} 
        currentPage={1} 
        actionDisplayPages={actionDisplayPages}
        storyId={story.id}
        isGenerating={isGenerating}
        isLoading={story.isLoading}
        loadingMessage={loadingMessage}
        onDeletePage={handleDeletePage}
        onRetryPage={handleRetryPage}
        onDeleteActionMessage={handleDeleteActionMessage}
        onRetryActionMessage={handleRetryActionMessage}
        onEditPage={handleEditPage}
      />
      <StoryProgressIndicator
        currentChapter={story.currentChapter || 1}
        currentAct={story.currentAct || 1}
        totalChapters={totalChapters}
        totalActs={story.outline?.acts.length || 3}
        storyStatus={story.storyStatus}
      />
    </div>
  );
} 
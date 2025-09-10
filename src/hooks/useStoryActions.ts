import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useAuthState } from '@/hooks/useAuthState';

export interface StoryAction {
  id: string;
  text: string;
  type: 'continue' | 'introduce' | 'change' | 'explore';
}

export function useStoryActions(storyId: string, currentPageContent: string, enabled: boolean = true, isGenerating: boolean = false) {
  // Only log when parameters actually change
  const prevParamsRef = useRef<{storyId?: string, enabled?: boolean, isGenerating?: boolean, contentLength?: number}>({});
  
  useEffect(() => {
    const currentParams = {
      storyId,
      enabled,
      isGenerating,
      contentLength: currentPageContent?.length
    };
    
    const prevParams = prevParamsRef.current;
    if (
      prevParams.storyId !== currentParams.storyId ||
      prevParams.enabled !== currentParams.enabled ||
      prevParams.isGenerating !== currentParams.isGenerating ||
      prevParams.contentLength !== currentParams.contentLength
    ) {
      prevParamsRef.current = currentParams;
    }
  }, [storyId, currentPageContent, enabled, isGenerating]);

  const { getToken } = useAuth();
  const { sessionId, userId } = useAuthState();
  const [actions, setActions] = useState<StoryAction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Don't fetch while generating or if disabled/no content
    if (!enabled || !currentPageContent || isGenerating) {
      return;
    }

    const fetchActions = async () => {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[useStoryActions] Starting fetch');
      }
      setIsLoading(true);
      setError(null);
      
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        const requestBody: {
          storyId: string;
          currentPage: string;
          sessionId?: string;
        } = {
          storyId,
          currentPage: currentPageContent,
        };

        if (userId) {
          // Authenticated user - use Clerk token
          const token = await getToken();
          if (!token) {
            throw new Error('No authentication token');
          }
          headers['Authorization'] = `Bearer ${token}`;
        } else {
          // Anonymous user - include sessionId in body
          requestBody.sessionId = sessionId || undefined;
        }

        const response = await fetch(`${process.env.NEXT_PUBLIC_CONVEX_SITE_URL}/api/story/actions`, {
          method: 'POST',
          headers,
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch actions: ${response.statusText}`);
        }

        const data = await response.json();
        if (process.env.NODE_ENV !== 'production') {
          console.log('[useStoryActions] Received actions:', data.actions);
        }
        setActions(data.actions || []);
      } catch (err) {
        console.error('Error fetching story actions:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch actions');
        
        // Set default actions on error
        setActions([
          { id: 'continue', text: 'Continue story', type: 'continue' },
          { id: 'twist', text: 'Add plot twist', type: 'change' },
          { id: 'character', text: 'New character', type: 'introduce' },
          { id: 'setting', text: 'Change setting', type: 'change' },
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    // Add a small delay to ensure generation is fully complete
    if (process.env.NODE_ENV !== 'production') {
      console.log('[useStoryActions] Setting timeout to fetch actions');
    }
    const timeoutId = setTimeout(() => {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[useStoryActions] Timeout triggered, fetching actions');
      }
      fetchActions();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [storyId, currentPageContent, enabled, isGenerating, getToken, userId, sessionId]);

  return { actions, isLoading, error };
}
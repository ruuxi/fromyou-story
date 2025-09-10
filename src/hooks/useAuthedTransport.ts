import { TextStreamChatTransport } from 'ai';
import { useAuth } from '@clerk/nextjs';
import { useMemo } from 'react';
import { useAuthState } from '@/hooks/useAuthState';

export function useAuthedTransport(
  path: string,
  body?: Record<string, unknown>,
) {
  const { getToken } = useAuth();
  const { sessionId } = useAuthState();

  return useMemo(
    () =>
      new TextStreamChatTransport({
        api: `${process.env.NEXT_PUBLIC_CONVEX_SITE_URL}${path}`,

        // Always include the anonymous sessionId; it’s ignored for logged-in users.
        body: { ...body, sessionId },

        // For story generation, send full messages; for character chat, send only last user message
        prepareSendMessagesRequest: ({ messages }) => {
          // Check if this is a story endpoint by looking at the path
          const isStoryEndpoint = path.includes('/story/');
          
          if (isStoryEndpoint) {
            // Story generation needs full message history to determine initial vs continuation
            return {
              body: {
                ...body,
                sessionId,
                messages,
              },
            } as any;
          } else {
            // Character chat only needs the last user message for persistence
            const last = messages[messages.length - 1];
            const lastText = (last?.parts || [])
              .filter((p: any) => p.type === 'text')
              .map((p: any) => p.text)
              .join('');
            return {
              body: {
                ...body,
                sessionId,
                chatId: (body as any)?.chatId,
                userMessage: lastText,
              },
            } as any;
          }
        },

        headers: () => {
          // For authenticated users, we'll handle the token in the fetch interceptor
          // This is a synchronous placeholder that will be overridden
          return {};
        },
        fetch: (async (url: RequestInfo | URL, options?: RequestInit) => {
          // Try to get a Clerk token for each request
          const token = await getToken({ template: 'convex' });
          const headers = new Headers(options?.headers);
          
          if (token) {
            headers.set('Authorization', `Bearer ${token}`);
          }
          
          return globalThis.fetch(url, {
            ...options,
            headers,
          });
        }) as typeof fetch,

        credentials: 'include',
      }),
    // Re-create the transport when the sessionId changes or once Clerk is able
    // to return a token (getToken reference never changes).
    [path, body, getToken, sessionId],
  );
} 
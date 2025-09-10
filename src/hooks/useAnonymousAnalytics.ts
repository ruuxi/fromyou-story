import { useEffect } from 'react';
import { useAuthState } from '@/hooks/useAuthState';
// import { useMutation } from 'convex/react';
// import { api } from '../../convex/_generated/api';

export function useAnonymousAnalytics() {
  const { isAnonymous, sessionId } = useAuthState();
  // Temporarily disabled - analytics table not yet in schema
  // const logAnalytics = useMutation(api.analytics.logEvent);

  const trackEvent = async (eventName: string, eventData?: Record<string, unknown>) => {
    if (!sessionId) return;

    try {
      // Temporarily disabled - analytics table not yet in schema
      console.log('Analytics event:', eventName, eventData);
      // await logAnalytics({
      //   sessionId,
      //   eventName,
      //   eventData,
      //   isAnonymous,
      //   timestamp: Date.now(),
      // });
    } catch (error) {
      console.error('Failed to track analytics event:', error);
    }
  };

  // Track session start
  useEffect(() => {
    if (isAnonymous && sessionId) {
      trackEvent('session_start', {
        userAgent: navigator.userAgent,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
      });
    }
  }, [isAnonymous, sessionId]);

  return { trackEvent, isAnonymous };
}
import { useEffect, useState, useRef, useMemo } from 'react';
import { useUser } from '@clerk/nextjs';
import { getOrCreateSessionId, getSessionUsername } from '@/lib/anonymousSession';
import { capitalizeUsername } from '@/lib/usernameGenerator';

interface AuthState {
  userId: string | null;
  sessionId: string | null;
  isAnonymous: boolean;
  isTransitioning: boolean;
  username: string | null;
  displayName: string | null;
  authArgs: { userId: string } | { sessionId: string } | null;
}

// Global auth state to maintain consistency during transitions
let globalAuthState: AuthState | null = null;

export function useAuthState() {
  const { isSignedIn, user, isLoaded } = useUser();
  const [authState, setAuthState] = useState<AuthState>(() => {
    // Use global state if available to prevent flashing
    if (globalAuthState) {
      return globalAuthState;
    }
    
    // Initial state - provide sessionId-based authArgs immediately if available
    const sessionId = getOrCreateSessionId();
    const sessionUsername = getSessionUsername();
    
    return {
      userId: null,
      sessionId,
      isAnonymous: true,
      isTransitioning: false,
      username: sessionUsername,
      displayName: sessionUsername ? capitalizeUsername(sessionUsername) : null,
      authArgs: sessionId ? { sessionId } : null
    };
  });
  
  // Track previous auth state to detect transitions
  const prevAuthStateRef = useRef<{ isSignedIn: boolean | undefined; userId: string | undefined }>({
    isSignedIn: undefined,
    userId: undefined
  });
  
  useEffect(() => {
    const prevIsSignedIn = prevAuthStateRef.current.isSignedIn;
    const prevUserId = prevAuthStateRef.current.userId;
    const currentUserId = user?.id;
    
    // Detect if we're transitioning between auth states (only after Clerk has loaded)
    const isTransitioning = isLoaded && prevIsSignedIn !== undefined && 
      (prevIsSignedIn !== isSignedIn || prevUserId !== currentUserId);
    
    // Update previous state (only when Clerk is loaded to avoid premature transition detection)
    if (isLoaded) {
      prevAuthStateRef.current = {
        isSignedIn,
        userId: currentUserId
      };
    }
    
    let newState: AuthState;
    
    if (isLoaded && isSignedIn && user) {
      // Authenticated state (only when Clerk confirms authentication)
      newState = {
        userId: user.id,
        sessionId: null,
        isAnonymous: false,
        isTransitioning,
        username: user.firstName || user.username || 'User',
        displayName: capitalizeUsername(user.firstName || user.username || 'User'),
        authArgs: { userId: user.id }
      };
    } else {
      // Anonymous state (available immediately, even before Clerk loads)
      const sessionId = getOrCreateSessionId();
      const sessionUsername = getSessionUsername();
      
      newState = {
        userId: null,
        sessionId,
        isAnonymous: true,
        isTransitioning,
        username: sessionUsername,
        displayName: sessionUsername ? capitalizeUsername(sessionUsername) : null,
        authArgs: sessionId ? { sessionId } : null
      };
    }
    
    // Update both local and global state
    setAuthState(newState);
    globalAuthState = newState;
    
    // Clear transitioning flag after a brief delay
    if (isTransitioning) {
      const timer = setTimeout(() => {
        setAuthState(prev => ({ ...prev, isTransitioning: false }));
        globalAuthState = { ...newState, isTransitioning: false };
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [isSignedIn, user, isLoaded]);
  
  // Memoize the return value to prevent unnecessary re-renders
  return useMemo(() => ({
    ...authState,
    isLoaded,
    identifier: authState.userId || authState.sessionId
  }), [authState, isLoaded]);
}
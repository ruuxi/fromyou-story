'use client';

import { useEffect, useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useAuthState } from '@/hooks/useAuthState';

/**
 * Automatically claims session-owned stories when a user signs in.
 * This component should be mounted at the app level to handle the migration.
 */
export function StoryMigrationHandler() {
  const { isAnonymous, sessionId, isLoaded } = useAuthState();
  const [hasMigrated, setHasMigrated] = useState(false);
  const claimSessionStories = useMutation(api.stories.migration.claimSessionStories);

  useEffect(() => {
    async function migrateStories() {
      // Only migrate once when user signs in (transitions from anonymous to authenticated)
      if (!isLoaded || isAnonymous || hasMigrated || !sessionId) {
        return;
      }

      try {
        const result = await claimSessionStories({ sessionId });
        
        if (result.claimedCount > 0) {
          console.log(`Successfully claimed ${result.claimedCount} stories from session`);
          
          // Optionally show a toast notification
          if (typeof window !== 'undefined' && window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('storiesClaimed', {
              detail: { count: result.claimedCount }
            }));
          }
        }
        
        setHasMigrated(true);
      } catch (error) {
        console.error('Failed to claim session stories:', error);
        // Don't block the user if migration fails
        setHasMigrated(true);
      }
    }

    migrateStories();
  }, [isLoaded, isAnonymous, sessionId, hasMigrated, claimSessionStories]);

  // This component doesn't render anything
  return null;
}

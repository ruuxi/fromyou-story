import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useUser } from '@clerk/nextjs';
import { getSessionId, clearSessionId } from '@/lib/anonymousSession';

// Store the session ID before sign-in globally
let preservedSessionId: string | null = null;

// Key for storing migration status in sessionStorage
const MIGRATION_STATUS_KEY = 'data_migration_status';

export function useDataMigration() {
  const { isSignedIn, user, isLoaded } = useUser();
  const migrateData = useMutation(api.users.migration.migrateAnonymousData);
  const lastUserIdRef = useRef<string | null>(null);
  const router = useRouter();

  // Preserve session ID before it might be cleared
  useEffect(() => {
    if (!isSignedIn && !preservedSessionId) {
      preservedSessionId = getSessionId();
    }
  }, [isSignedIn]);

  useEffect(() => {
    // Only run when Clerk is loaded
    if (!isLoaded) return;

    // Clear any resume-on-reload flag now that we're signed in (we're avoiding full reloads)
    if (isSignedIn) {
      try {
        sessionStorage.removeItem('resumeSignInOnReload');
      } catch {}
    }

    // Check if we have a new sign-in
    const currentUserId = user?.id || null;
    const hasNewSignIn = isSignedIn && currentUserId && currentUserId !== lastUserIdRef.current;
    
    // Update the last user ID
    lastUserIdRef.current = currentUserId;

    // Check if we've already migrated for this user in this session
    const getMigrationStatus = () => {
      try {
        const status = sessionStorage.getItem(MIGRATION_STATUS_KEY);
        return status ? JSON.parse(status) : {};
      } catch {
        return {};
      }
    };

    const setMigrationStatus = (userId: string) => {
      try {
        const status = getMigrationStatus();
        status[userId] = true;
        sessionStorage.setItem(MIGRATION_STATUS_KEY, JSON.stringify(status));
      } catch (error) {
        console.error('Failed to save migration status:', error);
      }
    };

    const hasMigratedForUser = (userId: string) => {
      const status = getMigrationStatus();
      return status[userId] === true;
    };

    // Only migrate if:
    // 1. User just signed in (new sign-in detected)
    // 2. We haven't already migrated for this user in this session
    // 3. There's an anonymous session to migrate from
    if (hasNewSignIn && currentUserId && !hasMigratedForUser(currentUserId)) {
      // Use preserved session ID or get current one
      const sessionId = preservedSessionId || getSessionId();
      
      if (sessionId) {
        // Mark as migrated immediately to prevent double migration
        setMigrationStatus(currentUserId);
        
        // Perform the migration
        migrateData({ userId: currentUserId, sessionId })
          .then((results) => {
            console.log('Data migration completed:', results);
            // Results will show counts for: selectedCharacters, userPreferences, stories, 
            // customCharacters, customWorldLore, customStorySuggestions
            
            // Clear the anonymous session from localStorage after successful migration
            clearSessionId();
            
            // Clear the preserved session ID
            preservedSessionId = null;
            
            // Soft-refresh the app so components pick up migrated data without a hard reload
            // Convex queries are reactive, but router.refresh provides extra safety for stale data
            try {
              router.refresh();
            } catch {}
          })
          .catch((error) => {
            console.error('Data migration failed:', error);
            // Clear the migration status so it can be retried
            try {
              const status = getMigrationStatus();
              delete status[currentUserId];
              sessionStorage.setItem(MIGRATION_STATUS_KEY, JSON.stringify(status));
            } catch {}
          });
      }
    }
    
    // Clear migration status when user signs out
    if (!isSignedIn && currentUserId) {
      try {
        const status = getMigrationStatus();
        if (currentUserId && status[currentUserId]) {
          delete status[currentUserId];
          sessionStorage.setItem(MIGRATION_STATUS_KEY, JSON.stringify(status));
        }
      } catch {}
    }
  }, [isSignedIn, user, isLoaded, migrateData]);
}
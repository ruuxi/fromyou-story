import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useEffect, useState, useRef } from 'react';
import debounce from 'lodash.debounce';
import { useAuthState } from '@/hooks/useAuthState';
import { Character } from '@/types/character';

type StorySettings = {
  genre: string;
  playerMode: boolean;
  playerName: string | undefined;
  characterCount: 'solo' | 'one-on-one' | 'group';
  pov: 'first' | 'second' | 'third';
  storyStructure: 'player' | 'reader';
  goonMode: boolean;
  selectedTags: string[];
  openrouterModelOverride?: string;
};

type SettingsUpdate = Partial<StorySettings>;

export function useSettings() {
  const { authArgs } = useAuthState();
  
  const settingsQuery = useQuery(api.stories.settings.getCurrentSettings, authArgs || 'skip');
  const updateMutation = useMutation(api.users.preferences.updateStorySettings);
  const createPreferences = useMutation(api.users.preferences.createDefaultPreferences);

  const [localSettings, setLocalSettings] = useState<StorySettings>({
    genre: 'adventure',
    playerMode: false,
    playerName: 'Hero',
    characterCount: 'one-on-one',
    pov: 'third',
    storyStructure: 'reader', // Maps to playerMode ('player' | 'reader')
    goonMode: false,
    selectedTags: [],
    openrouterModelOverride: undefined,
  });

  const [characters, setCharacters] = useState<Character[] | undefined>(undefined);

  useEffect(() => {
    if (settingsQuery === null) {
      setCharacters([]);
      return;
    }
    
    if (settingsQuery) {
      // eslint-disable-next-line @eslint-react/hooks-extra/no-direct-set-state-in-use-effect
      setLocalSettings({
        genre: settingsQuery.genre || 'adventure',
        playerMode: settingsQuery.playerMode || false,
        playerName: settingsQuery.playerName || 'Hero',
        characterCount: settingsQuery.characterCount || 'one-on-one',
        pov: settingsQuery.pov || 'third',
        storyStructure: settingsQuery.playerMode ? 'player' : 'reader',
        goonMode: (settingsQuery.genre || 'adventure') === 'goon-mode',
        selectedTags: [],
        openrouterModelOverride: settingsQuery.openrouterModelOverride || undefined,
      });
      setCharacters(settingsQuery.characters || []);
    }
  }, [settingsQuery]);

  const debouncedPlayerNameUpdate = useRef(
    debounce(async (authArgs: { userId?: string; sessionId?: string }, playerName: string | undefined) => {
      await updateMutation({ ...authArgs, playerName });
    }, 500)
  ).current;

  useEffect(() => {
    return () => {
      debouncedPlayerNameUpdate.cancel();
    };
  }, [debouncedPlayerNameUpdate]);

  const update = async (updates: SettingsUpdate) => {
    const localNext: StorySettings = { ...localSettings, ...updates } as StorySettings;
    if (updates.genre !== undefined) {
      localNext.goonMode = updates.genre === 'goon-mode';
    }
    if (updates.goonMode !== undefined) {
      if (updates.goonMode) {
        localNext.genre = 'goon-mode';
      } else if (localNext.genre === 'goon-mode') {
        localNext.genre = 'adventure';
      }
      localNext.goonMode = localNext.genre === 'goon-mode';
    }

    if (authArgs) {
      if (updates.playerName !== undefined) {
        debouncedPlayerNameUpdate(authArgs, updates.playerName);
      }
      type UpdatePayload = {
        userId?: string;
        sessionId?: string;
        genre?: string;
        playerMode?: boolean;
        playerName?: string;
        characterCount?: 'solo' | 'one-on-one' | 'group';
        pov?: 'first' | 'second' | 'third';
        goonMode?: boolean;
        selectedTags?: string[];
        openrouterModelOverride?: string | null;
      };

      const backendUpdates: UpdatePayload = { ...authArgs };
      let hasOtherUpdates = false;

      if (updates.genre !== undefined) {
        backendUpdates.genre = updates.genre;
        hasOtherUpdates = true;
      }
      if (updates.pov !== undefined) {
        backendUpdates.pov = updates.pov;
        hasOtherUpdates = true;
      }
      if (updates.playerMode !== undefined) {
        backendUpdates.playerMode = updates.playerMode;
        hasOtherUpdates = true;
      }
      if (updates.storyStructure !== undefined) {
        backendUpdates.playerMode = updates.storyStructure === 'player';
        hasOtherUpdates = true;
      }
      if (updates.characterCount !== undefined) {
        backendUpdates.characterCount = updates.characterCount;
        hasOtherUpdates = true;
      }
      if (updates.goonMode !== undefined) {
        backendUpdates.genre = updates.goonMode ? 'goon-mode' : 'adventure';
        hasOtherUpdates = true;
      }
      if (updates.selectedTags !== undefined) {
        backendUpdates.selectedTags = updates.selectedTags;
        hasOtherUpdates = true;
      }
      if (updates.openrouterModelOverride !== undefined) {
        backendUpdates.openrouterModelOverride = updates.openrouterModelOverride || null;
        hasOtherUpdates = true;
      }

      if (hasOtherUpdates) {
        await updateMutation(backendUpdates);
      }
    }
    setLocalSettings(localNext);
  };

  const ensurePreferencesAndUpdate = async (updates: SettingsUpdate) => {
    if (!authArgs) return;
    if (settingsQuery === null) {
      try {
        await createPreferences(authArgs);
      } catch (error) {
        console.error('Failed to create preferences:', error);
      }
    }
    await update(updates);
  };

  return {
    settings: localSettings,
    characters,
    hasPersistedSettings: settingsQuery !== null,
    updateStoryStructure: (value: 'player' | 'reader') => ensurePreferencesAndUpdate({ storyStructure: value, playerMode: value === 'player' }),
    updateGenre: (value: string) => ensurePreferencesAndUpdate({ genre: value }),
    updatePov: (value: 'first' | 'second' | 'third') => ensurePreferencesAndUpdate({ pov: value }),
    updateCharacterCount: (value: 'solo' | 'one-on-one' | 'group') => ensurePreferencesAndUpdate({ characterCount: value }),
    updatePlayerName: (value: string | undefined) => ensurePreferencesAndUpdate({ playerName: value }),
    updateGoonMode: (value: boolean) => ensurePreferencesAndUpdate({ goonMode: value }),
    updateInterests: (value: string[]) => ensurePreferencesAndUpdate({ selectedTags: value }),
    updateOpenrouterModelOverride: (value: string | undefined) => ensurePreferencesAndUpdate({ openrouterModelOverride: value }),
  };
}
'use client';

import { ReactNode } from 'react';
import { useDataMigration } from '@/hooks/useDataMigration';
import { StoryMigrationHandler } from '@/components/auth/StoryMigrationHandler';

export function DataMigrationWrapper({ children }: { children: ReactNode }) {
  // This hook will automatically handle migration when a user signs in
  useDataMigration();
  
  return (
    <>
      <StoryMigrationHandler />
      {children}
    </>
  );
}
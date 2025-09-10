import { nanoid } from 'nanoid';
import { generateRandomUsername } from './usernameGenerator';

const SESSION_ID_KEY = 'anonymous_session_id';
const SESSION_CREATED_KEY = 'anonymous_session_created';
const SESSION_USERNAME_KEY = 'anonymous_session_username';

export function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') {
    return '';
  }

  let sessionId = localStorage.getItem(SESSION_ID_KEY);
  
  if (!sessionId) {
    sessionId = `anon_${nanoid()}`;
    localStorage.setItem(SESSION_ID_KEY, sessionId);
    localStorage.setItem(SESSION_CREATED_KEY, new Date().toISOString());
    
    // Generate and store username
    const username = generateRandomUsername();
    localStorage.setItem(SESSION_USERNAME_KEY, username);
  }
  
  return sessionId;
}

export function getSessionId(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  
  return localStorage.getItem(SESSION_ID_KEY);
}

export function getSessionUsername(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  
  return localStorage.getItem(SESSION_USERNAME_KEY);
}

export function clearSessionId(): void {
  if (typeof window === 'undefined') {
    return;
  }
  
  localStorage.removeItem(SESSION_ID_KEY);
  localStorage.removeItem(SESSION_CREATED_KEY);
  localStorage.removeItem(SESSION_USERNAME_KEY);
}

export function getSessionAge(): number {
  if (typeof window === 'undefined') {
    return 0;
  }
  
  const created = localStorage.getItem(SESSION_CREATED_KEY);
  if (!created) {
    return 0;
  }
  
  return Date.now() - new Date(created).getTime();
}
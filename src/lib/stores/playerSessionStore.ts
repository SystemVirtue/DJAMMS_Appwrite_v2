/**
 * Player Session Store - Manages player instance session state
 * Integrates with PlayerInstanceManager for automated instance creation
 */

import { writable, derived, get } from 'svelte/store';
import { djammsStore } from './djamms';
import { playerInstanceManager } from '../services/playerInstanceManager.js';
import type { SessionInitResult } from '../services/playerInstanceManager.js';

// Session state interface
export interface PlayerSessionState {
  initialized: boolean;
  status: 'loading' | 'ready' | 'pending_approval' | 'error';
  message: string;
  user: any;
  playerInstance: any;
  activeQueue: any;
  canCreateInstance: boolean;
  error?: string;
  lastUpdated: Date;
}

// Initial session state
const initialState: PlayerSessionState = {
  initialized: false,
  status: 'loading',
  message: 'Initializing...',
  user: null,
  playerInstance: null,
  activeQueue: null,
  canCreateInstance: false,
  lastUpdated: new Date()
};

// Create the main session store
export const playerSession = writable<PlayerSessionState>(initialState);

// Session actions
export const sessionActions = {
  /**
   * Initialize player session when user authenticates
   */
  async initializeSession(authUser: any) {
    if (!authUser) {
      playerSession.set({
        ...initialState,
        initialized: true,
        status: 'error',
        message: 'No authenticated user',
        lastUpdated: new Date()
      });
      return;
    }

    console.log('🔄 Initializing player session for:', authUser.email);

    // Set loading state
    playerSession.update(state => ({
      ...state,
      status: 'loading',
      message: 'Checking user approval status...',
      lastUpdated: new Date()
    }));

    try {
      // Use PlayerInstanceManager to initialize session
      const sessionResult: SessionInitResult = await playerInstanceManager.initializeUserSession(authUser);
      
      // Update store with session result
      playerSession.set({
        initialized: true,
        status: sessionResult.status,
        message: sessionResult.message,
        user: sessionResult.user,
        playerInstance: sessionResult.playerInstance || null,
        activeQueue: sessionResult.activeQueue || null,
        canCreateInstance: sessionResult.canCreateInstance,
        error: sessionResult.error,
        lastUpdated: new Date()
      });

      console.log('✅ Player session initialized:', sessionResult.status);

    } catch (error) {
      console.error('❌ Failed to initialize player session:', error);
      
      playerSession.set({
        ...initialState,
        initialized: true,
        status: 'error',
        message: 'Failed to initialize session',
        error: error instanceof Error ? error.message : 'Unknown error',
        lastUpdated: new Date()
      });
    }
  },

  /**
   * Refresh session state (useful for checking approval status changes)
   */
  async refreshSession() {
    const currentState = get(djammsStore);
    if (currentState.currentUser) {
      await sessionActions.initializeSession(currentState.currentUser);
    }
  },

  /**
   * Clear session state (on logout)
   */
  clearSession() {
    playerSession.set({
      ...initialState,
      initialized: true,
      status: 'loading',
      message: 'No user session',
      lastUpdated: new Date()
    });
  },

  /**
   * Update player instance data
   */
  updatePlayerInstance(instanceData: any) {
    playerSession.update(state => ({
      ...state,
      playerInstance: instanceData,
      lastUpdated: new Date()
    }));
  },

  /**
   * Update active queue data
   */
  updateActiveQueue(queueData: any) {
    playerSession.update(state => ({
      ...state,
      activeQueue: queueData,
      lastUpdated: new Date()
    }));
  }
};

// Derived stores for common checks
export const isSessionReady = derived(
  playerSession,
  ($session) => $session.initialized && $session.status === 'ready'
);

export const isUserApproved = derived(
  playerSession,
  ($session) => $session.canCreateInstance && $session.user?.devApproved
);

export const isPendingApproval = derived(
  playerSession,
  ($session) => $session.initialized && $session.status === 'pending_approval'
);

export const sessionError = derived(
  playerSession,
  ($session) => $session.status === 'error' ? $session.error : null
);

export const hasPlayerInstance = derived(
  playerSession,
  ($session) => $session.playerInstance !== null
);

export const hasActiveQueue = derived(
  playerSession,
  ($session) => $session.activeQueue !== null && $session.activeQueue.totalTracks > 0
);

// Auto-initialize session when auth user changes
let unsubscribeAuth: () => void;

if (typeof window !== 'undefined') {
  unsubscribeAuth = djammsStore.subscribe(async (state) => {
    if (state.currentUser) {
      await sessionActions.initializeSession(state.currentUser);
    } else {
      sessionActions.clearSession();
    }
  });
}

// Cleanup subscription on module unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (unsubscribeAuth) {
      unsubscribeAuth();
    }
  });
}

// Export everything for use in components
export default {
  playerSession,
  sessionActions,
  isSessionReady,
  isUserApproved,
  isPendingApproval,
  sessionError,
  hasPlayerInstance,
  hasActiveQueue
};
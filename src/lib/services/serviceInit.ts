/**
 * Service Initialization Helper for DJAMMS v3
 * 
 * Provides easy initialization of the unified DJAMMSService
 * for use across the application.
 */

import { Client } from 'appwrite';
import { DJAMMSService } from './djammsService-v3';
import { browser } from '$app/environment';

// Get environment variables
const APPWRITE_ENDPOINT = browser 
  ? import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1'
  : process.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';

const APPWRITE_PROJECT_ID = browser 
  ? import.meta.env.VITE_APPWRITE_PROJECT_ID || ''
  : process.env.VITE_APPWRITE_PROJECT_ID || '';

const APPWRITE_DATABASE_ID = browser 
  ? import.meta.env.VITE_APPWRITE_DATABASE_ID || ''
  : process.env.VITE_APPWRITE_DATABASE_ID || '';

// Singleton pattern for shared service instance
let djammsServiceInstance: DJAMMSService | null = null;
let appwriteClient: Client | null = null;

/**
 * Initialize or get the shared Appwrite client
 */
export function getAppwriteClient(): Client {
  if (!appwriteClient) {
    appwriteClient = new Client()
      .setEndpoint(APPWRITE_ENDPOINT)
      .setProject(APPWRITE_PROJECT_ID);
  }
  return appwriteClient;
}

/**
 * Initialize or get the shared DJAMMSService instance
 */
export function getDJAMMSService(): DJAMMSService {
  if (!djammsServiceInstance) {
    const client = getAppwriteClient();
    djammsServiceInstance = new DJAMMSService(client, APPWRITE_DATABASE_ID);
  }
  return djammsServiceInstance;
}

/**
 * Reset the service instance (useful for testing or re-authentication)
 */
export function resetDJAMMSService(): void {
  djammsServiceInstance = null;
  appwriteClient = null;
}

/**
 * Initialize DJAMMSService with custom authentication (for user sessions)
 */
export function initializeDJAMMSService(userSession?: any): DJAMMSService {
  const client = getAppwriteClient();
  
  // If user session provided, set it on the client
  if (userSession) {
    // This would typically be done with session tokens
    // client.setSession(userSession);
  }
  
  return new DJAMMSService(client, APPWRITE_DATABASE_ID);
}

// Export the types for convenience
export type { 
  DJAMMSUser,
  PlayerInstance, 
  Playlist,
  ActiveQueue,
  UserActivity 
} from '../types/djamms-v3';
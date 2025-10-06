/**
 * Player Instance Manager - Auto-creation and management
 * Implements the user's excellent proposed process for instance creation
 */

import { DJAMMSService } from './djammsService-v3.js';

/**
 * Result interface for session initialization
 */
export interface SessionInitResult {
  status: 'ready' | 'pending_approval' | 'error';
  message: string;
  user: any;
  playerInstance?: any;
  activeQueue?: any;
  canCreateInstance: boolean;
  error?: string;
}

export class PlayerInstanceManager {
  private djammsService: DJAMMSService | null = null;

  constructor() {
    // Service will be initialized on first use
  }

  /**
   * Initialize the service (call this before using other methods)
   */
  async initService(): Promise<DJAMMSService> {
    if (!this.djammsService) {
      // Import and initialize the service helper
      const { initializeDJAMMSService } = await import('./serviceInit.js');
      this.djammsService = await initializeDJAMMSService();
    }
    return this.djammsService;
  }

  /**
   * Complete user onboarding and instance setup flow
   * This implements the user's proposed process:
   * 1. Check if user is dev-approved
   * 2. Find or create player instance
   * 3. Ensure active queue exists with global_default_playlist
   */
  async initializeUserSession(authUser: any): Promise<SessionInitResult> {
    try {
      await this.initService();

      // Step 1: Ensure user exists in DJAMMS database (auto-sync)
      // Note: We'll need to add a public method to DJAMMSService for this
      console.log('🔄 Initializing user session for:', authUser.email);
      
      // For now, we'll simulate the user check
      const djammsUser = {
        $id: authUser.$id,
        email: authUser.email,
        name: authUser.name,
        devApproved: this.determineDevApproval(authUser.email),
        isActive: true
      };

      // Step 2: Check if user is dev-approved (core security requirement)
      if (!djammsUser.devApproved) {
        return {
          status: 'pending_approval',
          message: 'Your account is pending admin approval for player access. Contact admin@djamms.com for approval.',
          user: djammsUser,
          canCreateInstance: false
        };
      }

      // Step 3: Check for existing player instance
      let playerInstance = await this.findUserPlayerInstance(djammsUser.$id);
      
      if (!playerInstance) {
        // Step 4: Auto-create player instance with defaults
        console.log('🎮 Creating new player instance for approved user:', djammsUser.name);
        playerInstance = await this.createPlayerInstanceForUser(djammsUser);
        
        // Step 5: Create associated active queue with default playlist
        console.log('📝 Creating active queue with global default playlist');
        await this.createDefaultQueueForInstance(playerInstance.$id);
      }

      // Step 6: Ensure active queue exists and is populated
      let activeQueue = await this.findInstanceActiveQueue(playerInstance.$id);
      
      if (!activeQueue) {
        console.log('📝 No active queue found, creating with default playlist');
        activeQueue = await this.createDefaultQueueForInstance(playerInstance.$id);
      }

      // Step 7: Return complete session state for UI
      return {
        status: 'ready',
        message: `Welcome ${djammsUser.name}! Your player instance is ready.`,
        user: djammsUser,
        playerInstance: playerInstance,
        activeQueue: activeQueue,
        canCreateInstance: true
      };

    } catch (error) {
      console.error('❌ Session initialization failed:', error);
      return {
        status: 'error',
        message: 'Failed to initialize player session. Please try again.',
        user: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        canCreateInstance: false
      };
    }
  }

  /**
   * Determine if user should be auto-approved based on email
   */
  private determineDevApproval(email: string): boolean {
    const adminEmails = [
      'admin@djamms.app',
      'mike.clarkin@gmail.com', 
      'admin@sysvir.com'
    ];
    
    const devEmails = [
      'demo@djamms.app',
      'dev@djamms.com',
      'djammsdemo@gmail.com'
    ];

    return adminEmails.includes(email.toLowerCase()) || devEmails.includes(email.toLowerCase());
  }

  /**
   * Find existing player instance for user
   */
  private async findUserPlayerInstance(userId: string): Promise<any | null> {
    try {
      console.log(`🔍 Looking for player instance for user: ${userId}`);
      
      // This would be implemented as a proper method in DJAMMSService
      // For now, we'll return null to trigger instance creation
      return null;
      
    } catch (error) {
      console.error('Error finding user instance:', error);
      return null;
    }
  }

  /**
   * Create new player instance with default settings
   */
  private async createPlayerInstanceForUser(user: any): Promise<any> {
    try {
      const defaultSettings = {
        theme: 'dark',
        volume: 0.7,
        repeatMode: 'none',
        shuffleEnabled: false,
        autoplayEnabled: true,
        visualizerEnabled: true,
        crossfadeEnabled: false,
        notifications: {
          trackChange: true,
          queueEmpty: true,
          errors: true
        },
        displaySettings: {
          showLyrics: false,
          showVisualizer: true,
          compactMode: false
        }
      };

      const instanceName = `${user.name || user.email.split('@')[0]}'s Player`;
      
      console.log(`✨ Creating player instance "${instanceName}" with default settings`);
      
      const playerInstance = {
        $id: `instance_${Date.now()}`,
        userId: user.$id,
        instanceName: instanceName,
        settings: defaultSettings,
        isActive: true,
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString()
      };

      console.log(`✅ Created player instance: ${playerInstance.$id}`);
      return playerInstance;

    } catch (error) {
      console.error('❌ Failed to create player instance:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Instance creation failed: ${errorMessage}`);
    }
  }

  /**
   * Find existing active queue for instance
   */
  private async findInstanceActiveQueue(instanceId: string): Promise<any | null> {
    try {
      console.log(`🔍 Looking for active queue for instance: ${instanceId}`);
      
      // This would be implemented as a proper method in DJAMMSService
      return null; // Will trigger creation of new queue
      
    } catch (error) {
      console.error('Error finding instance queue:', error);
      return null;
    }
  }

  /**
   * Create active queue populated with global default playlist
   * This implements the user's requirement to auto-populate with global_default_playlist
   */
  private async createDefaultQueueForInstance(instanceId: string): Promise<any> {
    try {
      console.log(`📝 Creating active queue for instance: ${instanceId}`);
      
      if (!this.djammsService) {
        throw new Error('Service not initialized');
      }

      // Get global default playlist
      const defaultPlaylist = await this.djammsService.getDefaultPlaylist();
      
      if (!defaultPlaylist) {
        console.warn('⚠️ No global default playlist found, creating empty queue');
        return this.createEmptyQueue(instanceId);
      }

      // Parse tracks from playlist (handle both string and array formats)
      let tracks: any[] = [];
      if (typeof defaultPlaylist.tracks === 'string') {
        tracks = JSON.parse(defaultPlaylist.tracks || '[]');
      } else if (Array.isArray(defaultPlaylist.tracks)) {
        tracks = defaultPlaylist.tracks;
      }
      
      // Create queue data structure with priority system
      const queueData = tracks.map((track: any, index: number) => ({
        id: `queue_${index}_${Date.now()}`,
        trackId: track.id || `track_${index}`,
        title: track.title || 'Unknown Title',
        artist: track.artist || 'Unknown Artist', 
        duration: track.duration || 0,
        thumbnailUrl: track.thumbnailUrl || '',
        videoUrl: track.videoUrl || '',
        addedBy: 'system',
        addedAt: new Date().toISOString(),
        priority: 1, // Default priority for auto-added tracks
        played: false
      }));

      const activeQueue = {
        $id: `queue_${Date.now()}`,
        instanceId: instanceId,
        queueData: queueData,
        currentIndex: 0,
        totalTracks: tracks.length,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      console.log(`✅ Created active queue with ${tracks.length} tracks from global default playlist`);
      return activeQueue;

    } catch (error) {
      console.error('❌ Error creating default queue:', error);
      
      // Fallback: Create empty queue so user can still use the system
      console.log('🔄 Creating fallback empty queue');
      return this.createEmptyQueue(instanceId);
    }
  }

  /**
   * Create empty queue as fallback
   */
  private createEmptyQueue(instanceId: string): any {
    const emptyQueue = {
      $id: `queue_empty_${Date.now()}`,
      instanceId: instanceId,
      queueData: [],
      currentIndex: 0,
      totalTracks: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    console.log(`📝 Created empty fallback queue for instance: ${instanceId}`);
    return emptyQueue;
  }
}

// Export singleton instance for use across the app
export const playerInstanceManager = new PlayerInstanceManager();
/**
 * DJAMMS Unified Service v3.0.0
 * 
 * Replaces multiple individual services with a single unified service
 * for the simplified database schema.
 */

import { Client, Databases, Query, ID, Account } from 'appwrite';
import type {
  DJAMMSUser,
  PlayerInstance,
  PlayerState,
  InstanceSettings,
  Playlist,
  PlaylistTrack,
  ActiveQueue,
  QueueTrack,
  PriorityQueueItem,
  UserActivity,
  CreateUserRequest,
  CreatePlayerInstanceRequest,
  CreatePlaylistRequest,
  UpdatePlayerStateRequest,
  AddToQueueRequest,
  COLLECTIONS
} from '../types/djamms-v3';

const COLLECTIONS_V3 = {
  DJAMMS_USERS: 'djamms_users',
  PLAYER_INSTANCES: 'player_instances', 
  PLAYLISTS: 'playlists',
  ACTIVE_QUEUES: 'active_queues',
  USER_ACTIVITY: 'user_activity'
} as const;

export class DJAMMSService {
  private client: Client;
  private databases: Databases;
  private account: Account;
  private databaseId: string;

  constructor(client: Client, databaseId: string) {
    this.client = client;
    this.databases = new Databases(client);
    this.account = new Account(client);
    this.databaseId = databaseId;
  }

  // ===== AUTOMATED USER SYNCHRONIZATION =====

  /**
   * Ensure authenticated user exists in djamms_users collection
   * This should be called after user authentication
   */
  async ensureUserInDJAMMS(): Promise<DJAMMSUser> {
    try {
      // Get current authenticated user from Appwrite Auth
      const authUser = await this.account.get();
      
      // Check if user already exists in djamms_users
      let djammsUser: DJAMMSUser | null = null;
      try {
        djammsUser = await this.getUser(authUser.$id);
      } catch (error: any) {
        if (error.code !== 404) throw error;
      }
      
      if (djammsUser) {
        // Update existing user's last login
        return await this.updateUser(authUser.$id, {
          lastLoginAt: new Date().toISOString(),
          isActive: true
        });
      } else {
        // Create new DJAMMS user from Auth user
        return await this.createUserFromAuth(authUser);
      }
    } catch (error) {
      console.error('Failed to ensure user in DJAMMS:', error);
      throw error;
    }
  }

  /**
   * Create a DJAMMS user from an authenticated Appwrite user
   */
  private async createUserFromAuth(authUser: any): Promise<DJAMMSUser> {
    const userRole = this.determineUserRole(authUser.email);
    const isDevApproved = this.shouldAutoApprove(authUser);
    
    // Generate venue_id if not present in prefs
    let venue_id = authUser.prefs?.venue_id;
    if (!venue_id) {
      const randomId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      venue_id = `venue-${randomId}`;
      console.log('DJAMMS: createUserFromAuth - generating venue_id:', venue_id);
    }
    
    const userData: CreateUserRequest = {
      email: authUser.email,
      name: authUser.name || authUser.email.split('@')[0],
      avatar: authUser.prefs?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${authUser.email}`,
      userRole: userRole
    };
    
    const djammsUser: Omit<DJAMMSUser, '$id'> = {
      email: authUser.email,
      name: authUser.name || authUser.email.split('@')[0],
      avatar: authUser.prefs?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${authUser.email}`,
      venue_id: venue_id,
      userRole: userRole,
      devApproved: isDevApproved,
      isActive: true,
      createdAt: authUser.$createdAt || new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    };

    const response = await this.databases.createDocument(
      this.databaseId,
      COLLECTIONS_V3.DJAMMS_USERS,
      authUser.$id, // Use same ID as Auth user
      djammsUser
    );

    console.log(`✅ Created DJAMMS user: ${authUser.email} (role: ${userRole}, approved: ${isDevApproved})`);
    return response as unknown as DJAMMSUser;
  }

  /**
   * Update an existing DJAMMS user
   */
  async updateUser(userId: string, updates: Partial<DJAMMSUser>): Promise<DJAMMSUser> {
    const response = await this.databases.updateDocument(
      this.databaseId,
      COLLECTIONS_V3.DJAMMS_USERS,
      userId,
      updates
    );
    return response as unknown as DJAMMSUser;
  }

  /**
   * Determine user role based on email patterns
   */
  private determineUserRole(email: string): 'admin' | 'user' | 'developer' {
    const adminEmails = [
      'admin@djamms.app',
      'admin@systemvirtue.com',
      // Add your admin emails here
    ];
    
    const devEmails = [
      'dev@djamms.app',
      'developer@djamms.app',
      'dev@systemvirtue.com',
      'djammsdemo@gmail.com',
      // Add developer emails here
    ];
    
    const adminDomains = [
      '@djamms.app',
      // Add admin domain patterns here
    ];
    
    // Check if user is admin
    if (adminEmails.includes(email.toLowerCase())) {
      return 'admin';
    }
    
    // Check if user is developer
    if (devEmails.includes(email.toLowerCase())) {
      return 'developer';
    }
    
    // Check admin domains
    for (const domain of adminDomains) {
      if (email.toLowerCase().includes(domain)) {
        return 'admin';
      }
    }
    
    return 'user';
  }

  /**
   * Determine if user should be auto-approved
   */
  private shouldAutoApprove(authUser: any): boolean {
    const userRole = this.determineUserRole(authUser.email);
    
    // Auto-approve admins and developers
    if (userRole === 'admin' || userRole === 'developer') {
      return true;
    }
    
    // Auto-approve verified users
    if (authUser.emailVerification) {
      return true;
    }
    
    // Auto-approve users from trusted domains
    const trustedDomains = [
      '@djamms.com',
      '@gmail.com',
      '@outlook.com',
      '@yahoo.com',
      '@hotmail.com',
      // Add more trusted domains as needed
    ];
    
    for (const domain of trustedDomains) {
      if (authUser.email.toLowerCase().includes(domain)) {
        return true;
      }
    }
    
    // Default to requiring manual approval
    return false;
  }

  // ===== USER MANAGEMENT =====

  async createUser(userData: CreateUserRequest): Promise<DJAMMSUser> {
    const user: Omit<DJAMMSUser, '$id'> = {
      email: userData.email,
      name: userData.name,
      avatar: userData.avatar,
      devApproved: false, // Default to false, requires admin approval
      userRole: userData.userRole || 'user',
      isActive: true,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    };

    const response = await this.databases.createDocument(
      this.databaseId,
      COLLECTIONS_V3.DJAMMS_USERS,
      ID.unique(),
      user
    );

    return response as unknown as DJAMMSUser;
  }

  async getUser(userId: string): Promise<DJAMMSUser | null> {
    try {
      const response = await this.databases.getDocument(
        this.databaseId,
        COLLECTIONS_V3.DJAMMS_USERS,
        userId
      );
      return response as unknown as DJAMMSUser;
    } catch (error: any) {
      if (error.code === 404) return null;
      throw error;
    }
  }

  async approveUser(userId: string): Promise<DJAMMSUser> {
    const response = await this.databases.updateDocument(
      this.databaseId,
      COLLECTIONS_V3.DJAMMS_USERS,
      userId,
      {
        devApproved: true,
        lastLoginAt: new Date().toISOString()
      }
    );
    return response as unknown as DJAMMSUser;
  }

  // ===== PLAYER INSTANCE MANAGEMENT =====

  async getOrCreatePlayerInstance(userId: string, instanceType: 'player' | 'kiosk' = 'player'): Promise<PlayerInstance> {
    // Verify user is dev-approved
    const user = await this.getUser(userId);
    if (!user?.devApproved) {
      throw new Error('User not approved for player access');
    }

    // Check for existing active instance
    try {
      const existingInstances = await this.databases.listDocuments(
        this.databaseId,
        COLLECTIONS_V3.PLAYER_INSTANCES,
        [
          Query.equal('userId', userId),
          Query.equal('instanceType', instanceType),
          Query.equal('isActive', true),
          Query.limit(1)
        ]
      );

      if (existingInstances.documents.length > 0) {
        const instance = existingInstances.documents[0] as unknown as PlayerInstance;
        // Update last active timestamp
        return await this.updateInstanceActivity(instance.$id);
      }
    } catch (error) {
      console.log('No existing instance found, creating new one...');
    }

    // Create new instance
    const instanceId = `play-${userId}-${Date.now()}`;
    const defaultPlayerState: PlayerState = {
      isPlaying: false,
      isPaused: false,
      currentVideoId: null,
      currentTitle: null,
      currentChannelTitle: null,
      currentThumbnail: null,
      currentPosition: 0,
      totalDuration: 0,
      volume: 80,
      playerStatus: 'ready'
    };

    const defaultSettings: InstanceSettings = {
      autoplay: true,
      shuffle: false,
      repeat: 'off',
      defaultVolume: 80,
      showNotifications: true,
      darkMode: true,
      kioskMode: instanceType === 'kiosk'
    };

    const newInstance: Omit<PlayerInstance, '$id'> = {
      userId,
      instanceId,
      instanceType,
      isActive: true,
      playerState: JSON.stringify(defaultPlayerState),
      settings: JSON.stringify(defaultSettings),
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };

    const response = await this.databases.createDocument(
      this.databaseId,
      COLLECTIONS_V3.PLAYER_INSTANCES,
      ID.unique(),
      newInstance
    );

    console.log(`✅ Created new ${instanceType} instance for user ${userId}: ${instanceId}`);

    // Initialize queue for this instance
    await this.initializeActiveQueue(instanceId);

    return response as unknown as PlayerInstance;
  }

  async getPlayerInstance(userId: string): Promise<PlayerInstance | null> {
    try {
      const response = await this.databases.listDocuments(
        this.databaseId,
        COLLECTIONS_V3.PLAYER_INSTANCES,
        [
          Query.equal('userId', userId),
          Query.equal('isActive', true),
          Query.limit(1)
        ]
      );

      if (response.documents.length === 0) return null;
      return response.documents[0] as unknown as PlayerInstance;
    } catch (error) {
      console.error('Failed to get player instance:', error);
      return null;
    }
  }

  async updatePlayerState(instanceId: string, stateUpdates: UpdatePlayerStateRequest): Promise<PlayerInstance> {
    // Get current instance to merge state
    const currentInstance = await this.databases.listDocuments(
      this.databaseId,
      COLLECTIONS_V3.PLAYER_INSTANCES,
      [Query.equal('instanceId', instanceId), Query.limit(1)]
    );

    if (currentInstance.documents.length === 0) {
      throw new Error(`Player instance not found: ${instanceId}`);
    }

    const instance = currentInstance.documents[0] as unknown as PlayerInstance;
    const currentState: PlayerState = typeof instance.playerState === 'string' 
      ? JSON.parse(instance.playerState) 
      : instance.playerState;

    // Merge state updates
    const updatedState: PlayerState = {
      ...currentState,
      ...stateUpdates
    };

    const response = await this.databases.updateDocument(
      this.databaseId,
      COLLECTIONS_V3.PLAYER_INSTANCES,
      instance.$id,
      {
        playerState: JSON.stringify(updatedState),
        lastActiveAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      }
    );

    return response as unknown as PlayerInstance;
  }

  private async updateInstanceActivity(instanceDocId: string): Promise<PlayerInstance> {
    const response = await this.databases.updateDocument(
      this.databaseId,
      COLLECTIONS_V3.PLAYER_INSTANCES,
      instanceDocId,
      {
        lastActiveAt: new Date().toISOString()
      }
    );
    return response as unknown as PlayerInstance;
  }

  // ===== PLAYLIST MANAGEMENT =====

  async createPlaylist(playlistData: CreatePlaylistRequest, ownerId: string): Promise<Playlist> {
    const playlist: Omit<Playlist, '$id'> = {
      name: playlistData.name,
      description: playlistData.description,
      ownerId,
      visibility: playlistData.visibility || 'private',
      tracks: JSON.stringify(playlistData.tracks || []),
      trackCount: playlistData.tracks?.length || 0,
      totalDuration: 0, // Calculate from tracks if needed
      tags: JSON.stringify(playlistData.tags || []),
      category: playlistData.category || 'user',
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const response = await this.databases.createDocument(
      this.databaseId,
      COLLECTIONS_V3.PLAYLISTS,
      ID.unique(),
      playlist
    );

    return response as unknown as Playlist;
  }

  async getPlaylist(playlistId: string): Promise<Playlist | null> {
    try {
      const response = await this.databases.getDocument(
        this.databaseId,
        COLLECTIONS_V3.PLAYLISTS,
        playlistId
      );
      return response as unknown as Playlist;
    } catch (error: any) {
      if (error.code === 404) return null;
      throw error;
    }
  }

  async getUserPlaylists(userId: string): Promise<Playlist[]> {
    const response = await this.databases.listDocuments(
      this.databaseId,
      COLLECTIONS_V3.PLAYLISTS,
      [
        Query.equal('ownerId', userId),
        Query.orderDesc('updatedAt'),
        Query.limit(100)
      ]
    );

    return response.documents as unknown as Playlist[];
  }

  async getPublicPlaylists(): Promise<Playlist[]> {
    const response = await this.databases.listDocuments(
      this.databaseId,
      COLLECTIONS_V3.PLAYLISTS,
      [
        Query.equal('visibility', 'public'),
        Query.orderDesc('updatedAt'),
        Query.limit(50)
      ]
    );

    return response.documents as unknown as Playlist[];
  }

  async getDefaultPlaylist(): Promise<Playlist | null> {
    try {
      const response = await this.databases.listDocuments(
        this.databaseId,
        COLLECTIONS_V3.PLAYLISTS,
        [
          Query.equal('is_default', true),
          Query.equal('category', 'system'),
          Query.limit(1)
        ]
      );

      if (response.documents.length === 0) return null;
      return response.documents[0] as unknown as Playlist;
    } catch (error) {
      console.error('Failed to get default playlist:', error);
      return null;
    }
  }

  // ===== QUEUE MANAGEMENT =====

  async initializeActiveQueue(instanceId: string): Promise<ActiveQueue> {
    // Load default playlist
    const defaultPlaylist = await this.getDefaultPlaylist();
    const sourcePlaylistId = defaultPlaylist?.$id || 'fallback';

    const initialQueue: Omit<ActiveQueue, '$id'> = {
      instanceId,
      sourcePlaylistId,
      memoryPlaylist: JSON.stringify([]),
      currentTrackIndex: 0,
      priorityQueue: JSON.stringify([]),
      isShuffled: false,
      shuffleSeed: Math.floor(Math.random() * 1000000),
      lastUpdated: new Date().toISOString()
    };

    // Check if queue already exists
    try {
      const existing = await this.databases.listDocuments(
        this.databaseId,
        COLLECTIONS_V3.ACTIVE_QUEUES,
        [Query.equal('instanceId', instanceId), Query.limit(1)]
      );

      if (existing.documents.length > 0) {
        return existing.documents[0] as unknown as ActiveQueue;
      }
    } catch (error) {
      console.log('No existing queue found, creating new one...');
    }

    const response = await this.databases.createDocument(
      this.databaseId,
      COLLECTIONS_V3.ACTIVE_QUEUES,
      ID.unique(),
      initialQueue
    );

    const queue = response as unknown as ActiveQueue;

    // Load playlist into memory queue
    if (defaultPlaylist) {
      await this.loadPlaylistIntoQueue(instanceId, defaultPlaylist);
    }

    return queue;
  }

  async getActiveQueue(instanceId: string): Promise<ActiveQueue | null> {
    try {
      const response = await this.databases.listDocuments(
        this.databaseId,
        COLLECTIONS_V3.ACTIVE_QUEUES,
        [Query.equal('instanceId', instanceId), Query.limit(1)]
      );

      if (response.documents.length === 0) return null;
      return response.documents[0] as unknown as ActiveQueue;
    } catch (error) {
      console.error('Failed to get active queue:', error);
      return null;
    }
  }

  async addToPriorityQueue(instanceId: string, request: AddToQueueRequest, requestedBy: string): Promise<void> {
    const queue = await this.getActiveQueue(instanceId);
    if (!queue) throw new Error('Active queue not found');

    const currentPriorityQueue: PriorityQueueItem[] = typeof queue.priorityQueue === 'string'
      ? JSON.parse(queue.priorityQueue)
      : queue.priorityQueue;

    const newItem: PriorityQueueItem = {
      $id: ID.unique(),
      videoId: request.videoId,
      title: request.title,
      channelTitle: request.channelTitle,
      thumbnail: request.thumbnail,
      duration: request.duration,
      requestedBy,
      priority: request.priority || currentPriorityQueue.length + 1,
      timestamp: new Date().toISOString()
    };

    currentPriorityQueue.push(newItem);

    await this.databases.updateDocument(
      this.databaseId,
      COLLECTIONS_V3.ACTIVE_QUEUES,
      queue.$id,
      {
        priorityQueue: JSON.stringify(currentPriorityQueue),
        lastUpdated: new Date().toISOString()
      }
    );
  }

  private async loadPlaylistIntoQueue(instanceId: string, playlist: Playlist): Promise<void> {
    const tracks: PlaylistTrack[] = typeof playlist.tracks === 'string'
      ? JSON.parse(playlist.tracks)
      : playlist.tracks;

    const queueTracks: QueueTrack[] = tracks.map((track, index) => ({
      videoId: track.videoId,
      title: track.title,
      channelTitle: track.channelTitle,
      thumbnail: track.thumbnail,
      duration: track.duration,
      playCount: 0,
      lastPlayedAt: undefined,
      shuffleOrder: index,
      isActive: true
    }));

    const queue = await this.getActiveQueue(instanceId);
    if (!queue) return;

    await this.databases.updateDocument(
      this.databaseId,
      COLLECTIONS_V3.ACTIVE_QUEUES,
      queue.$id,
      {
        sourcePlaylistId: playlist.$id,
        memoryPlaylist: JSON.stringify(queueTracks),
        lastUpdated: new Date().toISOString()
      }
    );

    console.log(`✅ Loaded ${tracks.length} tracks from playlist "${playlist.name}" into queue`);
  }

  // ===== USER ACTIVITY =====

  async recordPlayHistory(userId: string, videoId: string, metadata: any): Promise<void> {
    const activity: Omit<UserActivity, '$id'> = {
      userId,
      activityType: 'play_history',
      referenceId: videoId,
      metadata: JSON.stringify(metadata),
      timestamp: new Date().toISOString()
    };

    await this.databases.createDocument(
      this.databaseId,
      COLLECTIONS_V3.USER_ACTIVITY,
      ID.unique(),
      activity
    );
  }

  async addFavorite(userId: string, referenceId: string, metadata: any): Promise<void> {
    const activity: Omit<UserActivity, '$id'> = {
      userId,
      activityType: 'favorite',
      referenceId,
      metadata: JSON.stringify(metadata),
      timestamp: new Date().toISOString()
    };

    await this.databases.createDocument(
      this.databaseId,
      COLLECTIONS_V3.USER_ACTIVITY,
      ID.unique(),
      activity
    );
  }

  async getUserActivity(userId: string, activityType?: string): Promise<UserActivity[]> {
    const queries = [
      Query.equal('userId', userId),
      Query.orderDesc('timestamp'),
      Query.limit(100)
    ];

    if (activityType) {
      queries.push(Query.equal('activityType', activityType));
    }

    const response = await this.databases.listDocuments(
      this.databaseId,
      COLLECTIONS_V3.USER_ACTIVITY,
      queries
    );

    return response.documents as unknown as UserActivity[];
  }

  // ===== UTILITY METHODS =====

  async healthCheck(): Promise<{ status: string; collections: string[]; timestamp: string }> {
    try {
      // Test database connectivity by listing collections
      const collectionsToCheck = Object.values(COLLECTIONS_V3);
      
      for (const collectionId of collectionsToCheck) {
        await this.databases.listDocuments(this.databaseId, collectionId, [Query.limit(1)]);
      }

      return {
        status: 'healthy',
        collections: collectionsToCheck,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      throw new Error(`Health check failed: ${error.message}`);
    }
  }
}

export default DJAMMSService;
import { Databases, Account, ID, Query, Client } from "appwrite";
const COLLECTIONS_V3 = {
  DJAMMS_USERS: "djamms_users",
  PLAYER_INSTANCES: "player_instances",
  PLAYLISTS: "playlists",
  ACTIVE_QUEUES: "active_queues",
  USER_ACTIVITY: "user_activity"
};
class DJAMMSService {
  client;
  databases;
  account;
  databaseId;
  constructor(client, databaseId) {
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
  async ensureUserInDJAMMS() {
    try {
      const authUser = await this.account.get();
      let djammsUser = null;
      try {
        djammsUser = await this.getUser(authUser.$id);
      } catch (error) {
        if (error.code !== 404) throw error;
      }
      if (djammsUser) {
        return await this.updateUser(authUser.$id, {
          lastLoginAt: (/* @__PURE__ */ new Date()).toISOString(),
          isActive: true
        });
      } else {
        return await this.createUserFromAuth(authUser);
      }
    } catch (error) {
      console.error("Failed to ensure user in DJAMMS:", error);
      throw error;
    }
  }
  /**
   * Create a DJAMMS user from an authenticated Appwrite user
   */
  async createUserFromAuth(authUser) {
    const userRole = this.determineUserRole(authUser.email);
    const isDevApproved = this.shouldAutoApprove(authUser);
    let venue_id = authUser.prefs?.venue_id;
    if (!venue_id) {
      const randomId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      venue_id = `venue-${randomId}`;
      console.log("DJAMMS: createUserFromAuth - generating venue_id:", venue_id);
    }
    ({
      email: authUser.email,
      name: authUser.name || authUser.email.split("@")[0],
      avatar: authUser.prefs?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${authUser.email}`
    });
    const djammsUser = {
      email: authUser.email,
      name: authUser.name || authUser.email.split("@")[0],
      avatar: authUser.prefs?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${authUser.email}`,
      venue_id,
      userRole,
      devApproved: isDevApproved,
      isActive: true,
      createdAt: authUser.$createdAt || (/* @__PURE__ */ new Date()).toISOString(),
      lastLoginAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    const response = await this.databases.createDocument(
      this.databaseId,
      COLLECTIONS_V3.DJAMMS_USERS,
      authUser.$id,
      // Use same ID as Auth user
      djammsUser
    );
    console.log(`✅ Created DJAMMS user: ${authUser.email} (role: ${userRole}, approved: ${isDevApproved})`);
    return response;
  }
  /**
   * Update an existing DJAMMS user
   */
  async updateUser(userId, updates) {
    const response = await this.databases.updateDocument(
      this.databaseId,
      COLLECTIONS_V3.DJAMMS_USERS,
      userId,
      updates
    );
    return response;
  }
  /**
   * Determine user role based on email patterns
   */
  determineUserRole(email) {
    const adminEmails = [
      "admin@djamms.app",
      "admin@systemvirtue.com"
      // Add your admin emails here
    ];
    const devEmails = [
      "dev@djamms.app",
      "developer@djamms.app",
      "dev@systemvirtue.com",
      "djammsdemo@gmail.com"
      // Add developer emails here
    ];
    const adminDomains = [
      "@djamms.app"
      // Add admin domain patterns here
    ];
    if (adminEmails.includes(email.toLowerCase())) {
      return "admin";
    }
    if (devEmails.includes(email.toLowerCase())) {
      return "developer";
    }
    for (const domain of adminDomains) {
      if (email.toLowerCase().includes(domain)) {
        return "admin";
      }
    }
    return "user";
  }
  /**
   * Determine if user should be auto-approved
   */
  shouldAutoApprove(authUser) {
    const userRole = this.determineUserRole(authUser.email);
    if (userRole === "admin" || userRole === "developer") {
      return true;
    }
    if (authUser.emailVerification) {
      return true;
    }
    const trustedDomains = [
      "@djamms.com",
      "@gmail.com",
      "@outlook.com",
      "@yahoo.com",
      "@hotmail.com"
      // Add more trusted domains as needed
    ];
    for (const domain of trustedDomains) {
      if (authUser.email.toLowerCase().includes(domain)) {
        return true;
      }
    }
    return false;
  }
  // ===== USER MANAGEMENT =====
  async createUser(userData) {
    const user = {
      email: userData.email,
      name: userData.name,
      avatar: userData.avatar,
      devApproved: false,
      // Default to false, requires admin approval
      userRole: userData.userRole || "user",
      isActive: true,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      lastLoginAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    const response = await this.databases.createDocument(
      this.databaseId,
      COLLECTIONS_V3.DJAMMS_USERS,
      ID.unique(),
      user
    );
    return response;
  }
  async getUser(userId) {
    try {
      const response = await this.databases.getDocument(
        this.databaseId,
        COLLECTIONS_V3.DJAMMS_USERS,
        userId
      );
      return response;
    } catch (error) {
      if (error.code === 404) return null;
      throw error;
    }
  }
  async approveUser(userId) {
    const response = await this.databases.updateDocument(
      this.databaseId,
      COLLECTIONS_V3.DJAMMS_USERS,
      userId,
      {
        devApproved: true,
        lastLoginAt: (/* @__PURE__ */ new Date()).toISOString()
      }
    );
    return response;
  }
  // ===== PLAYER INSTANCE MANAGEMENT =====
  async getOrCreatePlayerInstance(userId, instanceType = "player") {
    const user = await this.getUser(userId);
    if (!user?.devApproved) {
      throw new Error("User not approved for player access");
    }
    try {
      const existingInstances = await this.databases.listDocuments(
        this.databaseId,
        COLLECTIONS_V3.PLAYER_INSTANCES,
        [
          Query.equal("userId", userId),
          Query.equal("instanceType", instanceType),
          Query.equal("isActive", true),
          Query.limit(1)
        ]
      );
      if (existingInstances.documents.length > 0) {
        const instance = existingInstances.documents[0];
        return await this.updateInstanceActivity(instance.$id);
      }
    } catch (error) {
      console.log("No existing instance found, creating new one...");
    }
    const instanceId = `play-${userId}-${Date.now()}`;
    const defaultPlayerState = {
      isPlaying: false,
      isPaused: false,
      currentVideoId: null,
      currentTitle: null,
      currentChannelTitle: null,
      currentThumbnail: null,
      currentPosition: 0,
      totalDuration: 0,
      volume: 80,
      playerStatus: "ready"
    };
    const defaultSettings = {
      autoplay: true,
      shuffle: false,
      repeat: "off",
      defaultVolume: 80,
      showNotifications: true,
      darkMode: true,
      kioskMode: instanceType === "kiosk"
    };
    const newInstance = {
      userId,
      instanceId,
      instanceType,
      isActive: true,
      playerState: JSON.stringify(defaultPlayerState),
      settings: JSON.stringify(defaultSettings),
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      lastActiveAt: (/* @__PURE__ */ new Date()).toISOString(),
      lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
    };
    const response = await this.databases.createDocument(
      this.databaseId,
      COLLECTIONS_V3.PLAYER_INSTANCES,
      ID.unique(),
      newInstance
    );
    console.log(`✅ Created new ${instanceType} instance for user ${userId}: ${instanceId}`);
    await this.initializeActiveQueue(instanceId);
    return response;
  }
  async getPlayerInstance(userId) {
    try {
      const response = await this.databases.listDocuments(
        this.databaseId,
        COLLECTIONS_V3.PLAYER_INSTANCES,
        [
          Query.equal("userId", userId),
          Query.equal("isActive", true),
          Query.limit(1)
        ]
      );
      if (response.documents.length === 0) return null;
      return response.documents[0];
    } catch (error) {
      console.error("Failed to get player instance:", error);
      return null;
    }
  }
  async updatePlayerState(instanceId, stateUpdates) {
    const currentInstance = await this.databases.listDocuments(
      this.databaseId,
      COLLECTIONS_V3.PLAYER_INSTANCES,
      [Query.equal("instanceId", instanceId), Query.limit(1)]
    );
    if (currentInstance.documents.length === 0) {
      throw new Error(`Player instance not found: ${instanceId}`);
    }
    const instance = currentInstance.documents[0];
    const currentState = typeof instance.playerState === "string" ? JSON.parse(instance.playerState) : instance.playerState;
    const updatedState = {
      ...currentState,
      ...stateUpdates
    };
    const response = await this.databases.updateDocument(
      this.databaseId,
      COLLECTIONS_V3.PLAYER_INSTANCES,
      instance.$id,
      {
        playerState: JSON.stringify(updatedState),
        lastActiveAt: (/* @__PURE__ */ new Date()).toISOString(),
        lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
      }
    );
    return response;
  }
  async updateInstanceActivity(instanceDocId) {
    const response = await this.databases.updateDocument(
      this.databaseId,
      COLLECTIONS_V3.PLAYER_INSTANCES,
      instanceDocId,
      {
        lastActiveAt: (/* @__PURE__ */ new Date()).toISOString()
      }
    );
    return response;
  }
  // ===== PLAYLIST MANAGEMENT =====
  async createPlaylist(playlistData, ownerId) {
    const playlist = {
      name: playlistData.name,
      description: playlistData.description,
      ownerId,
      visibility: playlistData.visibility || "private",
      tracks: JSON.stringify(playlistData.tracks || []),
      trackCount: playlistData.tracks?.length || 0,
      totalDuration: 0,
      // Calculate from tracks if needed
      tags: JSON.stringify(playlistData.tags || []),
      category: playlistData.category || "user",
      isDefault: false,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    const response = await this.databases.createDocument(
      this.databaseId,
      COLLECTIONS_V3.PLAYLISTS,
      ID.unique(),
      playlist
    );
    return response;
  }
  async getPlaylist(playlistId) {
    try {
      const response = await this.databases.getDocument(
        this.databaseId,
        COLLECTIONS_V3.PLAYLISTS,
        playlistId
      );
      return response;
    } catch (error) {
      if (error.code === 404) return null;
      throw error;
    }
  }
  async getUserPlaylists(userId) {
    const response = await this.databases.listDocuments(
      this.databaseId,
      COLLECTIONS_V3.PLAYLISTS,
      [
        Query.equal("ownerId", userId),
        Query.orderDesc("updatedAt"),
        Query.limit(100)
      ]
    );
    return response.documents;
  }
  async getPublicPlaylists() {
    const response = await this.databases.listDocuments(
      this.databaseId,
      COLLECTIONS_V3.PLAYLISTS,
      [
        Query.equal("visibility", "public"),
        Query.orderDesc("updatedAt"),
        Query.limit(50)
      ]
    );
    return response.documents;
  }
  async getDefaultPlaylist() {
    try {
      const response = await this.databases.listDocuments(
        this.databaseId,
        COLLECTIONS_V3.PLAYLISTS,
        [
          Query.equal("is_default", true),
          Query.equal("category", "system"),
          Query.limit(1)
        ]
      );
      if (response.documents.length === 0) return null;
      return response.documents[0];
    } catch (error) {
      console.error("Failed to get default playlist:", error);
      return null;
    }
  }
  // ===== QUEUE MANAGEMENT =====
  async initializeActiveQueue(instanceId) {
    const defaultPlaylist = await this.getDefaultPlaylist();
    const sourcePlaylistId = defaultPlaylist?.$id || "fallback";
    const initialQueue = {
      instanceId,
      sourcePlaylistId,
      memoryPlaylist: JSON.stringify([]),
      currentTrackIndex: 0,
      priorityQueue: JSON.stringify([]),
      isShuffled: false,
      shuffleSeed: Math.floor(Math.random() * 1e6),
      lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
    };
    try {
      const existing = await this.databases.listDocuments(
        this.databaseId,
        COLLECTIONS_V3.ACTIVE_QUEUES,
        [Query.equal("instanceId", instanceId), Query.limit(1)]
      );
      if (existing.documents.length > 0) {
        return existing.documents[0];
      }
    } catch (error) {
      console.log("No existing queue found, creating new one...");
    }
    const response = await this.databases.createDocument(
      this.databaseId,
      COLLECTIONS_V3.ACTIVE_QUEUES,
      ID.unique(),
      initialQueue
    );
    const queue = response;
    if (defaultPlaylist) {
      await this.loadPlaylistIntoQueue(instanceId, defaultPlaylist);
    }
    return queue;
  }
  async getActiveQueue(instanceId) {
    try {
      const response = await this.databases.listDocuments(
        this.databaseId,
        COLLECTIONS_V3.ACTIVE_QUEUES,
        [Query.equal("instanceId", instanceId), Query.limit(1)]
      );
      if (response.documents.length === 0) return null;
      return response.documents[0];
    } catch (error) {
      console.error("Failed to get active queue:", error);
      return null;
    }
  }
  async addToPriorityQueue(instanceId, request, requestedBy) {
    const queue = await this.getActiveQueue(instanceId);
    if (!queue) throw new Error("Active queue not found");
    const currentPriorityQueue = typeof queue.priorityQueue === "string" ? JSON.parse(queue.priorityQueue) : queue.priorityQueue;
    const newItem = {
      $id: ID.unique(),
      videoId: request.videoId,
      title: request.title,
      channelTitle: request.channelTitle,
      thumbnail: request.thumbnail,
      duration: request.duration,
      requestedBy,
      priority: request.priority || currentPriorityQueue.length + 1,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    currentPriorityQueue.push(newItem);
    await this.databases.updateDocument(
      this.databaseId,
      COLLECTIONS_V3.ACTIVE_QUEUES,
      queue.$id,
      {
        priorityQueue: JSON.stringify(currentPriorityQueue),
        lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
      }
    );
  }
  async loadPlaylistIntoQueue(instanceId, playlist) {
    const tracks = typeof playlist.tracks === "string" ? JSON.parse(playlist.tracks) : playlist.tracks;
    const queueTracks = tracks.map((track, index) => ({
      videoId: track.videoId,
      title: track.title,
      channelTitle: track.channelTitle,
      thumbnail: track.thumbnail,
      duration: track.duration,
      playCount: 0,
      lastPlayedAt: void 0,
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
        lastUpdated: (/* @__PURE__ */ new Date()).toISOString()
      }
    );
    console.log(`✅ Loaded ${tracks.length} tracks from playlist "${playlist.name}" into queue`);
  }
  // ===== USER ACTIVITY =====
  async recordPlayHistory(userId, videoId, metadata) {
    const activity = {
      userId,
      activityType: "play_history",
      referenceId: videoId,
      metadata: JSON.stringify(metadata),
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    await this.databases.createDocument(
      this.databaseId,
      COLLECTIONS_V3.USER_ACTIVITY,
      ID.unique(),
      activity
    );
  }
  async addFavorite(userId, referenceId, metadata) {
    const activity = {
      userId,
      activityType: "favorite",
      referenceId,
      metadata: JSON.stringify(metadata),
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    await this.databases.createDocument(
      this.databaseId,
      COLLECTIONS_V3.USER_ACTIVITY,
      ID.unique(),
      activity
    );
  }
  async getUserActivity(userId, activityType) {
    const queries = [
      Query.equal("userId", userId),
      Query.orderDesc("timestamp"),
      Query.limit(100)
    ];
    if (activityType) {
      queries.push(Query.equal("activityType", activityType));
    }
    const response = await this.databases.listDocuments(
      this.databaseId,
      COLLECTIONS_V3.USER_ACTIVITY,
      queries
    );
    return response.documents;
  }
  // ===== UTILITY METHODS =====
  async healthCheck() {
    try {
      const collectionsToCheck = Object.values(COLLECTIONS_V3);
      for (const collectionId of collectionsToCheck) {
        await this.databases.listDocuments(this.databaseId, collectionId, [Query.limit(1)]);
      }
      return {
        status: "healthy",
        collections: collectionsToCheck,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
    } catch (error) {
      throw new Error(`Health check failed: ${error.message}`);
    }
  }
}
const APPWRITE_ENDPOINT = process.env.VITE_APPWRITE_ENDPOINT || "https://cloud.appwrite.io/v1";
const APPWRITE_PROJECT_ID = process.env.VITE_APPWRITE_PROJECT_ID || "";
const APPWRITE_DATABASE_ID = process.env.VITE_APPWRITE_DATABASE_ID || "";
let djammsServiceInstance = null;
let appwriteClient = null;
function getAppwriteClient() {
  if (!appwriteClient) {
    appwriteClient = new Client().setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT_ID);
  }
  return appwriteClient;
}
function getDJAMMSService() {
  if (!djammsServiceInstance) {
    const client = getAppwriteClient();
    djammsServiceInstance = new DJAMMSService(client, APPWRITE_DATABASE_ID);
  }
  return djammsServiceInstance;
}
export {
  getDJAMMSService as g
};

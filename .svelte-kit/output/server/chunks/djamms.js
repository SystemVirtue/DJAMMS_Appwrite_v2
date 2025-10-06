import { d as derived, w as writable } from "./index.js";
import { d as databases, D as DATABASE_ID } from "./appwrite.js";
import { Query, ID } from "appwrite";
import { f as get_store_value } from "./ssr.js";
const initialState = {
  currentUser: null,
  isAuthenticated: false,
  currentVenue: null,
  userVenues: [],
  venueSubscription: null,
  nowPlaying: null,
  activeQueue: [],
  playerState: {
    status: "idle",
    position: 0,
    volume: 80,
    repeatMode: "off",
    shuffleMode: false
  },
  playerSettings: {
    autoPlay: true,
    showNotifications: true,
    theme: "dark",
    quality: "auto"
  },
  playlists: [],
  currentPlaylist: null,
  isLoading: false,
  connectionStatus: "disconnected",
  lastSync: null
};
function createDJAMMSStore() {
  const { subscribe, set, update } = writable(initialState);
  function sanitizePayload2(obj) {
    if (!obj || typeof obj !== "object") return obj;
    try {
      const copy = JSON.parse(JSON.stringify(obj));
      if (Object.prototype.hasOwnProperty.call(copy, "preferences")) delete copy.preferences;
      return copy;
    } catch (e) {
      if (obj && typeof obj === "object" && Object.prototype.hasOwnProperty.call(obj, "preferences")) {
        delete obj.preferences;
      }
      return obj;
    }
  }
  async function safeCreateDocument2(collectionId, documentId, payload) {
    const clean = sanitizePayload2(payload);
    if (documentId) {
      return await databases.createDocument(DATABASE_ID, collectionId, documentId, clean);
    } else {
      return await databases.createDocument(DATABASE_ID, collectionId, ID.unique(), clean);
    }
  }
  const storeMethods = {
    setUser: (user) => {
      update((state) => ({
        ...state,
        currentUser: user,
        isAuthenticated: !!user
      }));
    },
    setDemoUser: () => {
      const demoUser = {
        $id: "demo-user",
        $collectionId: "demo",
        $databaseId: "demo",
        $createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        $updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
        $permissions: [],
        user_id: "demo-user",
        email: "demo@djamms.app",
        username: "Demo User",
        venue_id: "demo-venue",
        role: "user",
        // Store prefs as stringified JSON to match collection schema
        prefs: JSON.stringify({
          theme: "dark",
          notifications_enabled: true,
          default_volume: 75,
          auto_play: true,
          quality: "high"
        }),
        avatar_url: void 0,
        is_active: true,
        is_developer: false,
        created_at: (/* @__PURE__ */ new Date()).toISOString(),
        last_login_at: (/* @__PURE__ */ new Date()).toISOString(),
        last_activity_at: (/* @__PURE__ */ new Date()).toISOString()
      };
      update((state) => ({
        ...state,
        currentUser: demoUser,
        isAuthenticated: true
      }));
    },
    setCurrentVenue: async (venueId) => {
      try {
        await storeMethods.refreshVenueState(venueId);
        await storeMethods.subscribeToVenue(venueId);
      } catch (error) {
        console.error("Failed to set current venue:", error);
      }
    },
    loadUserVenues: async (userId) => {
      try {
        const venues = await databases.listDocuments(DATABASE_ID, "venues", [
          Query.equal("owner_id", userId)
        ]);
        update((state) => ({
          ...state,
          userVenues: venues.documents.map((v) => ({
            ...v,
            venue_id: v.venue_id,
            venue_name: v.venue_name,
            owner_id: v.owner_id,
            active_player_instance_id: v.active_player_instance_id,
            now_playing: v.now_playing ? JSON.parse(v.now_playing) : null,
            state: v.state,
            current_time: v.current_time,
            volume: v.volume,
            active_queue: v.active_queue ? JSON.parse(v.active_queue) : [],
            priority_queue: v.priority_queue ? JSON.parse(v.priority_queue) : [],
            player_settings: v.player_settings ? JSON.parse(v.player_settings) : initialState.playerSettings,
            is_shuffled: v.is_shuffled,
            last_heartbeat_at: v.last_heartbeat_at,
            last_updated: v.last_updated,
            created_at: v.created_at
          }))
        }));
      } catch (error) {
        console.error("Failed to load user venues:", error);
      }
    },
    subscribeToVenue: async (venueId) => {
      try {
        storeMethods.unsubscribeFromVenue();
        await storeMethods.refreshVenueState(venueId);
        const subscriptionId = setInterval(async () => {
          try {
            await storeMethods.refreshVenueState(venueId);
          } catch (error) {
            console.error("Failed to refresh venue state:", error);
            update((state) => ({
              ...state,
              connectionStatus: "disconnected"
            }));
          }
        }, 2e3);
        update((state) => ({
          ...state,
          venueSubscription: subscriptionId,
          connectionStatus: "connected",
          lastSync: /* @__PURE__ */ new Date()
        }));
        console.log("Venue subscription established with polling");
      } catch (error) {
        console.error("Failed to subscribe to venue:", error);
        update((state) => ({
          ...state,
          connectionStatus: "disconnected"
        }));
      }
    },
    unsubscribeFromVenue: () => {
      update((state) => {
        if (state.venueSubscription) {
          clearInterval(state.venueSubscription);
        }
        return {
          ...state,
          venueSubscription: null,
          connectionStatus: "disconnected"
        };
      });
    },
    refreshVenueState: async (venueId) => {
      try {
        const venue = await databases.getDocument(DATABASE_ID, "venues", venueId);
        const parsedVenue = {
          ...venue,
          venue_id: venue.venue_id,
          venue_name: venue.venue_name,
          owner_id: venue.owner_id,
          active_player_instance_id: venue.active_player_instance_id,
          now_playing: venue.now_playing ? JSON.parse(venue.now_playing) : null,
          state: venue.state,
          current_time: venue.current_time,
          volume: venue.volume,
          active_queue: venue.active_queue ? JSON.parse(venue.active_queue) : [],
          priority_queue: venue.priority_queue ? JSON.parse(venue.priority_queue) : [],
          player_settings: venue.player_settings ? JSON.parse(venue.player_settings) : initialState.playerSettings,
          is_shuffled: venue.is_shuffled,
          last_heartbeat_at: venue.last_heartbeat_at,
          last_updated: venue.last_updated,
          created_at: venue.created_at
        };
        update((state) => ({
          ...state,
          currentVenue: parsedVenue,
          nowPlaying: parsedVenue.now_playing || null,
          activeQueue: parsedVenue.active_queue || [],
          playerSettings: {
            autoPlay: parsedVenue.player_settings?.autoPlay ?? initialState.playerSettings.autoPlay,
            showNotifications: parsedVenue.player_settings?.showNotifications ?? initialState.playerSettings.showNotifications,
            theme: parsedVenue.player_settings?.theme ?? initialState.playerSettings.theme,
            quality: parsedVenue.player_settings?.quality ?? initialState.playerSettings.quality
          },
          playerState: {
            ...state.playerState,
            status: parsedVenue.state || "idle",
            position: parsedVenue.current_time || 0,
            volume: parsedVenue.volume || 80
          },
          lastSync: /* @__PURE__ */ new Date(),
          connectionStatus: "connected"
        }));
      } catch (error) {
        console.error("Failed to refresh venue state:", error);
        update((state) => ({
          ...state,
          connectionStatus: "disconnected"
        }));
        throw error;
      }
    },
    // Player controls
    sendCommand: async (command, data) => {
      const state = get_store_value({ subscribe });
      if (!state.currentVenue) return;
      try {
        const response = await fetch("/api/ui-command", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            command,
            venueId: state.currentVenue.$id,
            userId: state.currentUser?.$id,
            data
          })
        });
        if (!response.ok) {
          throw new Error("Command failed");
        }
      } catch (error) {
        console.error("Failed to send command:", error);
      }
    },
    // Playlist management
    loadPlaylists: async () => {
      try {
        const playlists = await databases.listDocuments(DATABASE_ID, "playlists");
        update((state) => ({
          ...state,
          playlists: playlists.documents.map((p) => ({
            ...p,
            playlist_id: p.playlist_id,
            name: p.name,
            description: p.description,
            owner_id: p.owner_id,
            venue_id: p.venue_id,
            is_public: p.is_public,
            is_default: p.is_default,
            is_starred: p.is_starred,
            category: p.category,
            cover_image_url: p.cover_image_url,
            tracks: p.tracks ? JSON.parse(p.tracks) : [],
            track_count: p.track_count,
            total_duration: p.total_duration,
            tags: p.tags ? JSON.parse(p.tags) : [],
            play_count: p.play_count,
            last_played_at: p.last_played_at,
            created_at: p.created_at,
            updated_at: p.updated_at,
            // Backward compatibility
            user_id: p.owner_id,
            isPublic: p.is_public,
            $createdAt: p.created_at,
            $updatedAt: p.updated_at
          }))
        }));
      } catch (error) {
        console.error("Failed to load playlists:", error);
      }
    },
    setCurrentPlaylist: (playlist) => {
      update((state) => ({
        ...state,
        currentPlaylist: playlist
      }));
    },
    // Authentication initialization
    initializeAuth: async () => {
      return;
    },
    // Setup user profile and venue after authentication
    setupUserAndVenue: async (appwriteUser) => {
      try {
        const userId = appwriteUser.$id;
        const defaultPreferences = {
          theme: "dark",
          notifications_enabled: true,
          default_volume: 80,
          auto_play: false,
          language: "en",
          timezone: "UTC",
          min_to_tray_enabled: false,
          update_checks_enabled: true,
          telemetry_enabled: false
        };
        const determineRole = (email) => {
          if (email === "admin@djamms.app") return "admin";
          if (email === "admin@systemvirtue.com") return "admin";
          if (email === "dev@djamms.app") return "developer";
          return "user";
        };
        const isDeveloper = (email) => email === "dev@djamms.app";
        let userDoc;
        const userData = {
          user_id: userId,
          email: appwriteUser.email,
          username: appwriteUser.name || appwriteUser.email.split("@")[0],
          venue_id: "default",
          role: determineRole(appwriteUser.email),
          prefs: JSON.stringify(defaultPreferences),
          avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${appwriteUser.email}`,
          is_active: true,
          is_developer: isDeveloper(appwriteUser.email),
          created_at: (/* @__PURE__ */ new Date()).toISOString(),
          last_login_at: (/* @__PURE__ */ new Date()).toISOString(),
          last_activity_at: (/* @__PURE__ */ new Date()).toISOString()
        };
        try {
          const existingDoc = await databases.getDocument(DATABASE_ID, "users", userId);
          await databases.deleteDocument(DATABASE_ID, "users", userId);
          console.log("Deleted existing user document for recreation");
        } catch (error) {
        }
        console.log("Creating fresh user document:", userData);
        userDoc = await safeCreateDocument2("users", userId, userData);
        console.log("Created fresh user profile:", userDoc);
        let venueDoc;
        try {
          venueDoc = await databases.getDocument(DATABASE_ID, "venues", "default");
        } catch (error) {
          const defaultVenueData = {
            venue_id: "default",
            venue_name: "My DJAMMS Venue",
            owner_id: userId,
            active_player_instance_id: null,
            now_playing: null,
            state: "paused",
            current_time: 0,
            volume: 80,
            active_queue: "[]",
            priority_queue: "[]",
            player_settings: JSON.stringify({
              repeat_mode: "none",
              shuffle_enabled: false,
              shuffle_seed: null,
              crossfade_time: 3,
              master_volume: 80,
              is_muted: false,
              eq_settings: {},
              mic_volume: 0,
              dynamic_compressor_enabled: false,
              player_size: { width: 1280, height: 720 },
              player_position: { x: 100, y: 100 },
              is_fullscreen: false,
              display_sliders: { brightness: 50, contrast: 50 }
            }),
            is_shuffled: false,
            last_heartbeat_at: null,
            last_updated: (/* @__PURE__ */ new Date()).toISOString(),
            created_at: (/* @__PURE__ */ new Date()).toISOString(),
            schedule_data: "{}",
            app_name: "DJAMMS"
          };
          venueDoc = await safeCreateDocument2("venues", "default", defaultVenueData);
          console.log("Created default venue:", venueDoc);
        }
        const loginLogId = `login_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        try {
          await safeCreateDocument2("activity_log", loginLogId, {
            log_id: loginLogId,
            user_id: userId,
            venue_id: "default",
            event_type: "user_login",
            event_data: JSON.stringify({
              method: "google_oauth",
              venue_created: !venueDoc.$createdAt,
              ip_address: null,
              // Would need to get from request
              user_agent: navigator.userAgent,
              session_id: null
              // Would need session tracking
            }),
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            ip_address: null,
            user_agent: navigator.userAgent,
            session_id: null
          });
          console.log("Activity log entry created:", loginLogId);
        } catch (logError) {
          console.warn("Failed to create activity log entry:", logError);
        }
        console.log("User and venue setup complete");
      } catch (error) {
        console.error("Failed to setup user and venue:", error);
        console.error("Error details:", {
          message: error.message,
          code: error.code,
          response: error.response,
          stack: error.stack
        });
      }
    }
  };
  return {
    subscribe,
    update,
    ...storeMethods
  };
}
const djammsStore = createDJAMMSStore();
const currentTrack = derived(djammsStore, ($state) => $state.nowPlaying);
const playerControls = derived(djammsStore, ($state) => ({
  canPlay: $state.playerState.status === "paused" || $state.playerState.status === "idle",
  canPause: $state.playerState.status === "playing",
  canResume: $state.playerState.status === "paused",
  canSkip: $state.activeQueue.length > 0,
  canStop: $state.playerState.status !== "idle"
}));
derived(djammsStore, ($state) => ({
  count: $state.activeQueue.length,
  next: $state.activeQueue[0] || null,
  isEmpty: $state.activeQueue.length === 0
}));
const venueStatus = derived(djammsStore, ($state) => ({
  isConnected: $state.connectionStatus === "connected",
  currentVenue: $state.currentVenue,
  lastSync: $state.lastSync
}));
const playerStatus = derived(djammsStore, ($state) => ({
  status: $state.connectionStatus === "connected" ? `connected-local-${$state.playerState.status}` : $state.connectionStatus === "disconnected" ? "no-connected-player" : "server-error",
  playerState: $state.playerState,
  isConnected: $state.connectionStatus === "connected"
}));
export {
  playerControls as a,
  currentTrack as c,
  djammsStore as d,
  playerStatus as p,
  venueStatus as v
};

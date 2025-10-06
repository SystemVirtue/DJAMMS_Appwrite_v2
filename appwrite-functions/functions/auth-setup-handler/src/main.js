import { Client, Databases, Users, ID, Query } from 'node-appwrite';

/**
 * DJAMMS Auth & Setup Handler - Appwrite Function
 *
 * DEPRECATED: This function is no longer used in the main application flow.
 * User and venue setup is now handled automatically by the frontend store
 * in src/lib/stores/djamms.ts (setupUserAndVenue method).
 *
 * Kept as fallback for legacy compatibility.
 *
 * Core function for user and venue creation.
 * Combines user authentication handling with initial venue setup.
 *
 * Triggers:
 * - Appwrite users.onCreate event (for new users)
 * - Manual API call from UI (for login)
 *
 * Responsibilities:
 * - User Provisioning: Creates user profile in users collection on users.onCreate
 * - Venue Creation: Creates venue for users with venue_id but no venues entry
 * - Post-Login Actions: Retrieves venue_id and prefs for UI preparation
 */

export default async ({ req, res, log, error }) => {
  // Initialize Appwrite client
  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_ENDPOINT || process.env.APPWRITE_ENDPOINT || 'https://syd.cloud.appwrite.io/v1')
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID || process.env.APPWRITE_PROJECT_ID);

  // Only set API key when explicitly provided. If not provided, rely on the
  // function's built-in execution permissions (scopes) which allow DB access.
  if (process.env.APPWRITE_API_KEY && process.env.APPWRITE_API_KEY.trim()) {
    client.setKey(process.env.APPWRITE_API_KEY);
  }

  const databases = new Databases(client);
  const users = new Users(client);
  const DATABASE_ID = process.env.APPWRITE_DATABASE_ID;

  // Helper: create document but if Appwrite rejects due to unknown 'prefs'
  // attribute, retry without prefs. This makes the function tolerant of
  // schema variations across environments.
  async function safeCreateDocument(collectionId, documentId, payload) {
    try {
      return await databases.createDocument(DATABASE_ID, collectionId, documentId, payload);
    } catch (err) {
      const msg = (err && (err.message || err.response)) || String(err);
      if (msg && msg.includes('Unknown attribute') && msg.includes('prefs')) {
        // Retry without prefs
        const copy = { ...payload };
        delete copy.prefs;
        log && log('⚠️ Schema rejected "prefs" attribute; retrying without it');
        return await databases.createDocument(DATABASE_ID, collectionId, documentId, copy);
      }
      throw err;
    }
  }

  async function safeUpdateDocument(collectionId, documentId, payload) {
    try {
      return await databases.updateDocument(DATABASE_ID, collectionId, documentId, payload);
    } catch (err) {
      const msg = (err && (err.message || err.response)) || String(err);
      if (msg && msg.includes('Unknown attribute') && msg.includes('prefs')) {
        const copy = { ...payload };
        delete copy.prefs;
        log && log('⚠️ Schema rejected "prefs" attribute on update; retrying without it');
        return await databases.updateDocument(DATABASE_ID, collectionId, documentId, copy);
      }
      throw err;
    }
  }

  try {
    log('🚀 Auth & Setup Handler started');

    // Determine trigger type and extract user ID
    let userId = null;
    let isEventTrigger = false;
    let isManualCall = false;

    // Parse body early so manual callers can pass flags (forceCreateVenue, venueId, venueName)
    let manualBody = null;
    // Appwrite may send execution data in different shapes depending on how
    // the execution was created (CLI, REST API, or UI). Try multiple fallbacks.
    let parsedBody = req.body;

    // 1) If Appwrite provided a raw JSON string, parse it
    if (typeof parsedBody === 'string') {
      try {
        parsedBody = JSON.parse(parsedBody);
        log('🔧 Parsed JSON body (string)');
      } catch (e) {
        log('⚠️ Failed to parse body as JSON (string)');
      }
    }

    // 2) Some Appwrite runtimes place the payload under `payload` (base64). Try that.
    if ((!parsedBody || Object.keys(parsedBody).length === 0) && req.payload) {
      try {
        const buf = Buffer.from(req.payload, 'base64');
        const txt = buf.toString('utf8');
        parsedBody = JSON.parse(txt);
        log('🔧 Parsed JSON body from base64 payload');
      } catch (e) {
        log('⚠️ Failed to parse base64 payload');
      }
    }

    // Some execution shapes wrap the payload in `data` or `payload` keys inside req.body
    if ((!parsedBody || (Object.keys(parsedBody).length === 0)) && req.body && typeof req.body === 'object') {
      const candidate = req.body.data || req.body.payload || req.body.body || req.body.data_payload;
      if (candidate) {
        try {
          if (typeof candidate === 'string') {
            // Try JSON parse first
            try {
              parsedBody = JSON.parse(candidate);
              log('🔧 Parsed JSON from req.body.data/payload');
            } catch (e) {
              // Maybe base64
              try {
                const buf = Buffer.from(candidate, 'base64');
                parsedBody = JSON.parse(buf.toString('utf8'));
                log('🔧 Parsed JSON from base64 in req.body.data/payload');
              } catch (e2) {
                log('⚠️ Failed to parse req.body.data/payload as JSON or base64');
              }
            }
          } else if (typeof candidate === 'object') {
            parsedBody = candidate;
            log('🔧 Using object from req.body.data/payload');
          }
        } catch (e) {
          log('⚠️ Error processing req.body data/payload: ' + e.message);
        }
      }
    }

    // 3) If still empty, fall back to req.variables (some CLI executions pass as vars)
    if ((!parsedBody || Object.keys(parsedBody).length === 0) && req.variables) {
      try {
        parsedBody = req.variables;
        log('🔧 Using req.variables as manual body payload');
      } catch (e) {
        log('⚠️ Failed to use req.variables as payload');
      }
    }

    // 4) query param fallback: data or body
    if ((!parsedBody || Object.keys(parsedBody).length === 0) && req.query && (req.query.data || req.query.body)) {
      try {
        const candidate = req.query.data || req.query.body;
        parsedBody = typeof candidate === 'string' ? JSON.parse(candidate) : candidate;
        log('🔧 Parsed JSON body from query fallback');
      } catch (e) {
        log('⚠️ Failed to parse query payload');
      }
    }

    manualBody = parsedBody || {};

  // Debug: surface incoming query and headers for manual execution troubleshooting
    log && log('🔎 Incoming req.query: ' + JSON.stringify(req.query || {}));
    log && log('🔎 Incoming req.headers: ' + JSON.stringify(req.headers || {}));

  // Debug: dump raw body/payload/variables shapes (truncated)
    try {
      if (typeof req.body === 'string') {
        const s = req.body.length > 500 ? req.body.slice(0, 500) + '... (truncated)' : req.body;
        log && log('🔎 Raw req.body (string): ' + s);
      } else if (req.body) {
        log && log('🔎 Raw req.body (object keys): ' + JSON.stringify(Object.keys(req.body)));
      }
    } catch (e) {
      log && log('⚠️ Could not stringify req.body for debug: ' + e.message);
    }

    try {
      if (req.payload) {
        const p = req.payload.length > 200 ? req.payload.slice(0, 200) + '... (truncated)' : req.payload;
        log && log('🔎 req.payload present (base64 truncated): ' + p);
      }
    } catch (e) {
      log && log('⚠️ Could not read req.payload: ' + e.message);
    }

    try {
      if (req.variables) {
        log && log('🔎 req.variables keys: ' + JSON.stringify(Object.keys(req.variables)));
      }
    } catch (e) {
      log && log('⚠️ Could not read req.variables: ' + e.message);
    }

    // Fallback: try to decode the dynamic token Appwrite places in x-appwrite-key
    // Example header: "x-appwrite-key": "dynamic_eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
    let decodedDynamic = null;
    try {
      const rawKey = req.headers && (req.headers['x-appwrite-key'] || req.headers['X-Appwrite-Key']);
      if (rawKey && typeof rawKey === 'string' && rawKey.startsWith('dynamic_')) {
        const token = rawKey.replace(/^dynamic_/, '');
        const parts = token.split('.');
        if (parts.length >= 2) {
          const payload = parts[1];
          // base64url decode
          const b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
          const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
          const jsonTxt = Buffer.from(b64 + pad, 'base64').toString('utf8');
          try {
            decodedDynamic = JSON.parse(jsonTxt);
            log && log('🔧 Decoded dynamic token payload keys: ' + JSON.stringify(Object.keys(decodedDynamic)));
            // If token payload contains data or userId, merge into parsedBody/manualBody
            if (!manualBody || Object.keys(manualBody).length === 0) {
              if (decodedDynamic.data) {
                try {
                  const maybe = typeof decodedDynamic.data === 'string' ? JSON.parse(decodedDynamic.data) : decodedDynamic.data;
                  parsedBody = parsedBody && Object.keys(parsedBody).length ? parsedBody : maybe;
                  manualBody = manualBody && Object.keys(manualBody).length ? manualBody : maybe;
                } catch (e) {
                  // ignore
                }
              }
              if (!userId && (decodedDynamic.userId || decodedDynamic.user_id)) {
                userId = decodedDynamic.userId || decodedDynamic.user_id;
                isManualCall = true;
                log('🔧 Found userId in decoded dynamic token payload');
              }
            }
          } catch (e) {
            log && log('⚠️ Could not parse decoded dynamic token payload JSON: ' + e.message);
          }
        }
      }
    } catch (e) {
      log && log('⚠️ Error decoding dynamic token: ' + e.message);
    }

    // Quick debug short-circuit: if APPWRITE_FUNCTION_DATA is present or
    // the incoming parsed body contains a `debug:true` flag, return a
    // diagnostic payload so we can see exactly what the runtime received.
    try {
      const envData = process.env.APPWRITE_FUNCTION_DATA || null;
      const parsedDebugFlag = (manualBody && manualBody.debug) || (req.query && (req.query.debug === '1' || req.query.debug === 'true'));
      if (envData || parsedDebugFlag) {
        const debugOut = {
          appwrite_function_data: envData,
          env_keys: Object.keys(process.env).slice(0, 200),
          req_query: req.query || null,
          req_headers_keys: Object.keys(req.headers || {}).slice(0, 200),
          has_payload: !!req.payload,
          has_variables: !!req.variables,
          raw_body_sample: typeof req.body === 'string' ? (req.body.length > 500 ? req.body.slice(0, 500) + '... (truncated)' : req.body) : (req.body ? Object.keys(req.body) : null)
        };

        log && log('🐞 Debug short-circuit: returning runtime diagnostics');
        return res.json({ success: true, debug: debugOut });
      }
    } catch (e) {
      log && log('⚠️ Debug short-circuit failed: ' + e.message);
    }

    // Check for event trigger (users.onCreate or users.sessions.create)
    if (req.headers['x-appwrite-event'] && req.headers['x-appwrite-user-id']) {
      userId = req.headers['x-appwrite-user-id'];
      isEventTrigger = true;
      log(`📡 Event trigger: ${req.headers['x-appwrite-event']}`);
    }
    // Check for manual API call (user ID in body, query, or headers)
    else {
      if (manualBody && manualBody.userId) {
        userId = manualBody.userId;
        isManualCall = true;
        log('🔧 Manual API call detected (body)');
      } else if (req.query && req.query.userId) {
        userId = req.query.userId;
        isManualCall = true;
        log('🔧 Manual API call detected (query param)');
      } else {
        // Additional fallbacks: sometimes callers set user id in headers
        const hdrUser = req.headers && (req.headers['x-user-id'] || req.headers['user-id'] || req.headers['X-User-Id'] || req.headers['x-appwrite-user-id']);
        if (hdrUser) {
          userId = hdrUser;
          isManualCall = true;
          log('🔧 Manual API call detected (header)');
        } else if (typeof req.body === 'string' && req.body.includes('=')) {
          // Some clients send URL-encoded form bodies like "userId=...&forceCreateVenue=true"
          try {
            const params = new URLSearchParams(req.body);
            const uid = params.get('userId') || params.get('user_id') || params.get('userid');
            if (uid) {
              userId = uid;
              isManualCall = true;
              log('🔧 Manual API call detected (urlencoded body)');
            }
          } catch (e) {
            log('⚠️ Failed to parse urlencoded body for userId');
          }
        }
      }
    }

    if (!userId) {
      // Final fallback: Appwrite may inject execution data into the
      // APPWRITE_FUNCTION_DATA environment variable when executions are
      // created via the REST API/CLI. Try parsing that as JSON.
      try {
        if (process.env.APPWRITE_FUNCTION_DATA) {
          log('🔎 Found APPWRITE_FUNCTION_DATA environment variable (truncated)');
          const d = process.env.APPWRITE_FUNCTION_DATA.length > 100
            ? process.env.APPWRITE_FUNCTION_DATA.slice(0, 100) + '...'
            : process.env.APPWRITE_FUNCTION_DATA;
          log('🔎 APPWRITE_FUNCTION_DATA: ' + d);
          try {
            const parsedEnvData = JSON.parse(process.env.APPWRITE_FUNCTION_DATA);
            if (parsedEnvData.userId || parsedEnvData.user_id) {
              userId = parsedEnvData.userId || parsedEnvData.user_id;
              isManualCall = true;
              manualBody = { ...(manualBody || {}), ...parsedEnvData };
              log('🔧 Manual API call detected (APPWRITE_FUNCTION_DATA)');
            }
          } catch (e) {
            log('⚠️ Could not JSON-parse APPWRITE_FUNCTION_DATA');
          }
        }
      } catch (e) {
        log('⚠️ Error inspecting APPWRITE_FUNCTION_DATA: ' + e.message);
      }

      if (!userId) {
        log('❌ No user ID provided');
        return res.json({ success: false, message: 'No user ID provided' });
      }
    }

    log(`👤 Processing user: ${userId}`);

    // For manual API calls, skip user.get() to avoid authorization issues
    let user = null;
    if (!isManualCall) {
      // Get user details from Auth (only for event-triggered calls)
      user = await users.get(userId);
      log(`📧 User email: ${user.email}`);
    } else {
      log('🔧 Manual call - skipping user.get() to avoid auth issues');
    }

    // Check if this is a new user creation event
    const isNewUser = req.headers['x-appwrite-event'] === 'users.create';

    // 1. USER PROVISIONING (on users.onCreate or first manual call)
    let userProfile = null;
    try {
      userProfile = await databases.getDocument(DATABASE_ID, 'users', userId);
      log('✅ User profile exists');
    } catch (err) {
      log('👤 User profile not found, creating...');

      // For manual calls without user details, use defaults
      const userEmail = user?.email || `${userId}@manual.test`;
      const userName = user?.name || user?.email?.split('@')[0] || `user_${userId.slice(0, 8)}`;

      // Create user profile
      const userRole = determineUserRole(userEmail);

      // Only include fields that are commonly present in the collection schema.
      // Build a minimal, explicit payload so we never accidentally send
      // disallowed or unknown attributes (for example: last_login_at).
      const rawUserProfile = {
        user_id: userId,
        email: userEmail,
        username: userName,
        // Default to the shared 'default' venue to avoid a 2-step race where
        // venue_id exists but the venues collection entry has not been created yet.
        venue_id: 'default',
        role: userRole,
        // Ensure prefs exists as a JSON string to satisfy collection schema expectations
        prefs: JSON.stringify({}),
        // Accept incoming prefs but we'll map it to the DB's `prefs` field in sanitizer
        ...(user?.prefs ? { prefs: user.prefs } : {}),
        avatar_url: (user && user.prefs && user.prefs.avatar) || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userEmail}`,
        is_active: true,
        is_developer: userRole === 'admin' || userRole === 'developer'
      };
      // Ensure required timestamps are present for the collection schema
      rawUserProfile.created_at = new Date().toISOString();

      // Sanitize payload for the 'users' collection: allow only a whitelisted set
      // of attributes and stringify complex objects where the collection expects strings.
      const newUserProfile = sanitizeUserPayload(rawUserProfile);

      try {
        // Defensively strip any unexpected timestamp fields that may have slipped
        // into the payload from upstream sources.
        delete newUserProfile.last_login_at;
        delete newUserProfile.last_activity_at;

  log('📦 Creating sanitized user document payload: ' + JSON.stringify(newUserProfile));
  userProfile = await safeCreateDocument('users', userId, newUserProfile);
        log('✅ User profile created');
        // Ensure a shared 'default' venue exists to avoid later failures when
        // other parts of the system expect a venue with id 'default'. Create
        // it idempotently: if it already exists just continue.
        const defaultVenueId = 'default';
        try {
          await databases.getDocument(DATABASE_ID, 'venues', defaultVenueId);
          log('✅ Default venue already exists');
        } catch (venueCheckErr) {
          log('ℹ️ Default venue not found; creating default venue entry');
          const safeDefaultVenue = {
            venue_id: defaultVenueId,
            venue_name: 'Default Venue',
            // Assign initial owner to the creating user to keep ownership traceable
            owner_id: userId,
            active_player_instance_id: null,
            now_playing: null,
            state: 'ready',
            volume: 80,
            active_queue: JSON.stringify([]),
            priority_queue: JSON.stringify([]),
            player_settings: JSON.stringify({
              repeat_mode: 'off',
              shuffle_enabled: false,
              crossfade_time: 3,
              master_volume: 80,
              is_muted: false
            }),
            is_shuffled: false,
            last_heartbeat_at: new Date().toISOString(),
            last_updated: new Date().toISOString(),
            created_at: new Date().toISOString(),
            schedule_data: JSON.stringify({})
          };
          try {
            await databases.createDocument(DATABASE_ID, 'venues', defaultVenueId, safeDefaultVenue);
            log('✅ Default venue created');
            await databases.createDocument(DATABASE_ID, 'activity_log', ID.unique(), {
              log_id: ID.unique(),
              user_id: userId,
              venue_id: defaultVenueId,
              event_type: 'venue_created_default',
              event_data: JSON.stringify({ action: 'default_venue_created' }),
              timestamp: new Date().toISOString()
            });
          } catch (createDefaultErr) {
            // If concurrent creation happened, it's safe to ignore 'already exists' style failures.
            log(`⚠️ Could not create default venue: ${createDefaultErr.message}`);
          }
        }
      } catch (createErr) {
        log(`❌ Failed to create user profile: ${createErr.message}`);
        throw createErr;
      }

      // Log user provisioning activity
      await databases.createDocument(DATABASE_ID, 'activity_log', ID.unique(), {
        log_id: ID.unique(),
        user_id: userId,
        venue_id: null,
        event_type: 'user_provisioned',
        event_data: JSON.stringify({
          action: 'user_created',
          trigger: isEventTrigger ? 'event' : 'manual'
        }),
        timestamp: new Date().toISOString()
      });
    }
  // 2. VENUE CREATION (for users with venue_id but no venues entry)
    // - For event-triggered calls, create venue if userProfile.venue_id is set
    // - For manual calls, allow forcing venue creation via manualBody.forceCreateVenue
    if (!isManualCall && userProfile.venue_id) {
      log(`🏢 Checking venue for user with venue_id: ${userProfile.venue_id}`);

      try {
        // Check if venue exists
        await databases.getDocument(DATABASE_ID, 'venues', userProfile.venue_id);
        log('✅ Venue already exists');
      } catch (err) {
        log('🏢 Venue not found, creating new venue...');

        // Get global default playlist for active_queue
        let globalDefaultPlaylist = [];
        try {
          const defaultPlaylist = await databases.getDocument(DATABASE_ID, 'playlists', 'global_default_playlist');
          if (defaultPlaylist && defaultPlaylist.tracks) {
            globalDefaultPlaylist = typeof defaultPlaylist.tracks === 'string'
              ? JSON.parse(defaultPlaylist.tracks)
              : defaultPlaylist.tracks;
            log(`🎵 Loaded global default playlist with ${globalDefaultPlaylist.length} tracks`);
          }
        } catch (playlistErr) {
          log(`⚠️ Could not load global default playlist: ${playlistErr.message}`);
        }

        // Create venue
        const venue = {
          venue_id: userProfile.venue_id,
          venue_name: `${(userProfile && (userProfile.username || userProfile.email?.split('@')[0])) || (user && (user.name || (user.email && user.email.split('@')[0]))) || 'Venue'}'s Venue`,
          owner_id: userId,
          active_player_instance_id: null,
          now_playing: null, // null as specified
          state: 'ready',
          // current_time column appears to be 'processing' in the schema; omit to avoid schema mismatch
          volume: 80,
          active_queue: JSON.stringify(Array.isArray(globalDefaultPlaylist) ? globalDefaultPlaylist : []), // global_default_playlist tracks
          priority_queue: JSON.stringify([]),
          player_settings: JSON.stringify({
            repeat_mode: 'off',
            shuffle_enabled: false,
            crossfade_time: 3,
            master_volume: 80,
            is_muted: false
          }),
          is_shuffled: false,
          last_heartbeat_at: new Date().toISOString(),
          last_updated: new Date().toISOString(),
          created_at: new Date().toISOString(),
          schedule_data: JSON.stringify({})
        };

        await databases.createDocument(DATABASE_ID, 'venues', userProfile.venue_id, venue);
        log('✅ Venue created for venue owner');

        // Log venue creation activity
        await databases.createDocument(DATABASE_ID, 'activity_log', ID.unique(), {
          log_id: ID.unique(),
          user_id: userId,
          venue_id: userProfile.venue_id,
          event_type: 'venue_created',
          event_data: JSON.stringify({
            action: 'venue_auto_created',
            playlist_tracks: globalDefaultPlaylist.length
          }),
          timestamp: new Date().toISOString()
        });
      }
    } else {
      log('ℹ️ User has no venue_id, skipping venue creation');
    }

    // Manual-triggered venue creation (explicit request)
    if (isManualCall && manualBody && manualBody.forceCreateVenue) {
      // Use provided venueId or generate one
      const requestedVenueId = manualBody.venueId || `venue-${ID.unique()}`;
  const venueName = manualBody.venueName || `${(userProfile && (userProfile.username || userProfile.email?.split('@')[0])) || 'Venue'}'s Venue`;

      // NOTE: Some Appwrite deployments surface document validation errors
      // caused by unexpected attributes when calling updateDocument. To avoid
      // spamming logs with `Invalid document structure: Unknown attribute: "prefs"`
      // we'll avoid updating the user document here and instead rely on the
      // default `venue_id: 'default'` set at user creation. If you want to
      // persist the assigned venue_id on existing users, run the offline
      // migration script to normalize the `prefs` field first.
      log('ℹ️ Skipping update of user.venue_id to avoid document validation issues (prefs attribute conflict)');

      // Get global default playlist for active_queue
      let globalDefaultPlaylist = [];
      try {
        const defaultPlaylist = await databases.getDocument(DATABASE_ID, 'playlists', 'global_default_playlist');
        if (defaultPlaylist && defaultPlaylist.tracks) {
          globalDefaultPlaylist = typeof defaultPlaylist.tracks === 'string'
            ? JSON.parse(defaultPlaylist.tracks)
            : defaultPlaylist.tracks;
          log(`🎵 Loaded global default playlist with ${globalDefaultPlaylist.length} tracks`);
        }
      } catch (playlistErr) {
        log(`⚠️ Could not load global default playlist: ${playlistErr.message}`);
      }

      // Create venue object
        const manualVenue = {
        venue_id: requestedVenueId,
        venue_name: venueName,
        owner_id: userId,
        active_player_instance_id: null,
        now_playing: null,
        state: 'ready',
        volume: 80,
          active_queue: JSON.stringify(Array.isArray(globalDefaultPlaylist) ? globalDefaultPlaylist : []),
        priority_queue: JSON.stringify([]),
        player_settings: JSON.stringify({
          repeat_mode: 'off',
          shuffle_enabled: false,
          crossfade_time: 3,
          master_volume: 80,
          is_muted: false
        }),
        is_shuffled: false,
        last_heartbeat_at: new Date().toISOString(),
        last_updated: new Date().toISOString(),
        created_at: new Date().toISOString(),
        schedule_data: JSON.stringify({})
      };

      try {
        await databases.createDocument(DATABASE_ID, 'venues', requestedVenueId, manualVenue);
        log('✅ Venue created (manual request)');

        await databases.createDocument(DATABASE_ID, 'activity_log', ID.unique(), {
          log_id: ID.unique(),
          user_id: userId,
          venue_id: requestedVenueId,
          event_type: 'venue_created_manual',
          event_data: JSON.stringify({ action: 'venue_created_manual', playlist_tracks: globalDefaultPlaylist.length }),
          timestamp: new Date().toISOString()
        });
      } catch (venueErr) {
        log(`❌ Failed to create manual venue: ${venueErr.message}`);
      }
    }

    // 3. POST-LOGIN ACTIONS (update timestamps and prepare response)
    if (!isNewUser) {
      // Update login timestamps (some collections don't have these fields). Wrap in try/catch.
      // NOTE: Skipping timestamp updates to users to avoid document validation
      // errors caused by unexpected attributes that may be present in the
      // collection. These timestamps are optional for UI; consider running
      // the migration to normalize user `prefs` then re-enable updates.
      log('ℹ️ Skipping update of user timestamps to avoid document validation issues');

      // Log login activity (activity_log should exist per schema)
      try {
        await databases.createDocument(DATABASE_ID, 'activity_log', ID.unique(), {
          log_id: ID.unique(),
          user_id: userId,
          venue_id: userProfile?.venue_id || null,
          event_type: 'user_login',
          event_data: JSON.stringify({
            action: 'user_logged_in',
            trigger: isEventTrigger ? 'event' : 'manual'
          }),
          timestamp: new Date().toISOString()
        });
      } catch (logErr) {
        log(`⚠️ Could not write login activity log: ${logErr.message}`);
      }
    }

    // 4. PREPARE RESPONSE (return user data for UI)
    // Safely parse prefs stored as JSON string
    let parsedPreferences = {};
    try {
      if (userProfile && userProfile.prefs) {
        parsedPreferences = typeof userProfile.prefs === 'string' ? JSON.parse(userProfile.prefs) : userProfile.prefs;
      }
    } catch (e) {
      log(`⚠️ Failed to parse prefs JSON: ${e.message}`);
      parsedPreferences = {};
    }

    const response = {
      success: true,
      message: isNewUser ? 'User provisioned successfully' : 'Login processed successfully',
      data: {
        userId: userId,
        email: user?.email || userProfile?.email || null,
        name: user?.name || userProfile?.username || null,
        venue_id: userProfile?.venue_id || null,
        role: userProfile?.role || 'user',
        prefs: parsedPreferences,
        isNewUser: isNewUser,
        trigger: isEventTrigger ? 'event' : 'manual'
      }
    };

    log(`🎉 Auth & Setup Handler completed: ${isNewUser ? 'user created' : 'login processed'}`);
    return res.json(response);

  } catch (err) {
    error(`❌ Auth & Setup Handler failed: ${err.message}`);
    error(`Stack trace: ${err.stack}`);

    return res.json({
      success: false,
      message: err.message,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};

/**
 * Determine user role based on email patterns
 */
function determineUserRole(email) {
  const emailLower = email.toLowerCase();
  
  // Admin users
  const adminEmails = [
    'admin@djamms.app',
    'mike.clarkin@gmail.com',
    'admin@sysvir.com'
  ];
  
  // Developer users  
  const developerEmails = [
    'demo@djamms.app',
    'dev@djamms.app',
    'test@djamms.app'
  ];
  
  if (adminEmails.includes(emailLower)) {
    return 'admin';
  } else if (developerEmails.includes(emailLower)) {
    return 'developer';
  } else {
    return 'user';
  }
}

/**
 * Sanitize a raw user payload to ensure only allowed attributes are sent to the
 * Appwrite 'users' collection. Return a new object with stringified complex
 * fields where appropriate.
 */
function sanitizeUserPayload(raw) {
  // Whitelist of allowed attributes in the users collection.
  const allowed = new Set([
    'user_id',
    'email',
    'username',
    'venue_id',
    'role',
    'created_at',
    'prefs',
    'avatar_url',
    'is_active',
    'is_developer'
  ]);

  const out = {};
  for (const key of Object.keys(raw)) {
    // Disallow any 'last_*at' timestamp keys in create payloads to avoid schema mismatches
    if (/^last_.*at$/.test(key)) continue;
    if (!allowed.has(key)) continue;

    let val = raw[key];

    // If prefs is an object (incoming key 'prefs'), stringify it (collections store prefs as JSON string)
    if (key === 'prefs' && typeof val === 'object') {
      try {
        val = JSON.stringify(val);
        out['prefs'] = val;
        continue;
      } catch (e) {
        out['prefs'] = '{}';
        continue;
      }
    }

    // Ensure boolean/number values are preserved; Appwrite will coerce where possible
    out[key] = val;
  }

  // Enforce Appwrite string size limit for prefs (safe margin)
  if (out.prefs && typeof out.prefs === 'string') {
    const maxBytes = 65535; // Appwrite 64kB limit for string attribute
    const byteLen = Buffer.byteLength(out.prefs, 'utf8');
    if (byteLen > maxBytes) {
      // Truncate safely to maxBytes by slicing the string down to bytes
      log && log(`⚠️ prefs JSON too large (${byteLen} bytes). Truncating to ${maxBytes} bytes.`);
      // Truncate by converting to Buffer and slicing
      const buf = Buffer.from(out.prefs, 'utf8').slice(0, maxBytes - 4); // leave small room
      // Attempt to close JSON safely by removing trailing incomplete chars and appending '...'
      let truncated = buf.toString('utf8');
      // Attempt to ensure valid JSON: try to parse, if fails, fallback to '{}'
      try {
        JSON.parse(truncated);
        out.prefs = truncated;
      } catch (e) {
        // As a last resort, store an informative small JSON
        out.prefs = JSON.stringify({ truncated: true });
      }
    }
  }

  return out;
}
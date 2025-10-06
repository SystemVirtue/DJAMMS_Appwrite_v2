import { error, json } from "@sveltejs/kit";
import { Client, Users, Databases } from "node-appwrite";
import { ID } from "appwrite";
import { b as private_env } from "../../../../../chunks/shared-server.js";
function determineUserRole(email) {
  const adminEmails = [
    "admin@djamms.app",
    "admin@systemvirtue.com",
    "mike.clarkin@gmail.com"
    // Add specific admin emails here
  ];
  const devEmails = [
    "dev@djamms.app",
    "developer@djamms.app",
    "dev@systemvirtue.com",
    // Add specific developer emails here
    "djammsdemo@gmail.com"
    // Add developer emails here
  ];
  const adminDomains = [
    "@djamms.com",
    "@sysvir.com",
    "@ysystemvirtue.com"
    // Add admin domains here
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
const POST = async ({ request }) => {
  try {
    let sanitizePayload = function(obj) {
      if (!obj || typeof obj !== "object") return obj;
      try {
        const copy = JSON.parse(JSON.stringify(obj));
        (function recurse(o) {
          if (!o || typeof o !== "object") return;
          if (Object.prototype.hasOwnProperty.call(o, "preferences")) delete o.preferences;
          for (const k of Object.keys(o)) {
            if (o[k] && typeof o[k] === "object") recurse(o[k]);
          }
        })(copy);
        return copy;
      } catch (e) {
        if (obj && typeof obj === "object" && Object.prototype.hasOwnProperty.call(obj, "preferences")) {
          const shallow = { ...obj };
          delete shallow.preferences;
          return shallow;
        }
        return obj;
      }
    };
    console.log("🚀 User sync API called");
    const { userId, userEmail } = await request.json();
    console.log("📥 Request data:", { userId, userEmail: userEmail ? userEmail.substring(0, 10) + "..." : "NOT SET" });
    if (!userId || !userEmail) {
      throw error(400, "Missing userId or userEmail");
    }
    const userRole = determineUserRole(userEmail);
    console.log("🔐 User role determined:", userRole, "for email:", userEmail);
    if (userRole !== "admin" && userRole !== "developer") {
      throw error(403, "Access denied. Admin privileges required.");
    }
    const serverClient = new Client().setEndpoint("https://syd.cloud.appwrite.io/v1").setProject("68cc86c3002b27e13947").setKey(private_env.APPWRITE_API_KEY || private_env.VITE_APPWRITE_API_KEY || "standard_25289fad1759542a75506309bd927c04928587ec211c9da1b7ab1817d5fb4a67e2aee4fcd29c36738d9fb2e2e8fe0379f7da761f150940a6d0fe6e89a08cc2d1e5cc95720132db4ed19a13396c9c779c467223c754acbc57abfb48469b866bfccce774903a8de9a93b55f65d2b30254447cb6664661d378b3722a979d9d71f92");
    const users = new Users(serverClient);
    const rawDatabases = new Databases(serverClient);
    const databases = new Proxy(rawDatabases, {
      get(target, prop, receiver) {
        if (prop === "createDocument" || prop === "updateDocument") {
          const orig = target[prop];
          return function(...args) {
            if (args.length >= 4 && args[3] && typeof args[3] === "object") {
              args[3] = sanitizePayload(args[3]);
            }
            return orig.apply(target, args);
          };
        }
        if (prop === "getDocument") {
          const orig = target[prop];
          return async function(...args) {
            return await orig.apply(target, args);
          };
        }
        if (prop === "listDocuments" || prop === "list") {
          const orig = target[prop];
          return async function(...args) {
            return await orig.apply(target, args);
          };
        }
        const value = target[prop];
        if (typeof value === "function") return value.bind(target);
        return value;
      }
    });
    const DATABASE_ID = "68cc92d30024e1b6eeb6";
    async function safeCreateDocument(collectionId, documentId, payload) {
      const clean = sanitizePayload(payload);
      if (documentId) {
        return await databases.createDocument(DATABASE_ID, collectionId, documentId, clean);
      } else {
        return await databases.createDocument(DATABASE_ID, collectionId, ID.unique(), clean);
      }
    }
    async function safeUpdateDocument(collectionId, documentId, payload) {
      const clean = sanitizePayload(payload);
      return await databases.updateDocument(DATABASE_ID, collectionId, documentId, clean);
    }
    async function createActivityLog(params) {
      const { event_type, event_data, user_id = null, venue_id = null } = params;
      const payloadBase = {
        log_id: void 0,
        event_type,
        event_data,
        user_id,
        venue_id,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      };
      for (let attempt = 0; attempt < 3; attempt++) {
        const attemptId = ID.unique();
        const payload = { ...payloadBase, log_id: attemptId };
        try {
          await databases.createDocument(DATABASE_ID, "activity_log", attemptId, payload);
          return;
        } catch (e) {
          if (e && e.code === 409) {
            console.log(`ℹ️ activity_log id collision, retrying (attempt ${attempt + 1})`);
            continue;
          }
          throw e;
        }
      }
      console.warn("⚠️ Failed to create activity_log after retries - logging to console instead", { event_type, user_id, venue_id });
      return;
    }
    console.log("🔄 Starting bulk user synchronization...");
    let authUsers;
    try {
      authUsers = await users.list();
      console.log(`📊 Found ${authUsers.users.length} auth users`);
    } catch (usersError) {
      console.error("❌ Failed to list users:", usersError);
      console.error("❌ Error details:", {
        message: usersError.message,
        code: usersError.code,
        response: usersError.response
      });
      if (usersError.code === 401) {
        throw error(500, `Failed to access user list: ${usersError.message}. Ensure APPWRITE_API_KEY is a service/admin key with permission to list users, and that the endpoint/project ID match your Appwrite instance.`);
      }
      throw error(500, `Failed to access user list: ${usersError.message}`);
    }
    console.log("✅ User list retrieved successfully");
    let processed = 0;
    let created = 0;
    let updated = 0;
    let errors = 0;
    for (const authUser of authUsers.users) {
      try {
        const userEmail2 = authUser.email;
        const userId2 = authUser.$id;
        console.log(`🔄 Processing user: ${userEmail2} (${userId2})`);
        let userDoc;
        try {
          userDoc = await databases.getDocument(DATABASE_ID, "users", userId2);
          console.log(`✅ User document exists for ${userEmail2}`);
          console.log(`🔄 Performing delete+recreate migration for ${userEmail2} to ensure clean document`);
          const preserved = {
            user_id: userDoc.user_id || userId2,
            email: userDoc.email || userEmail2,
            username: userDoc.username || (userEmail2 ? userEmail2.split("@")[0] : userId2),
            venue_id: userDoc.venue_id || "default",
            role: userDoc.role || determineUserRole(userEmail2),
            prefs: userDoc.prefs || userDoc.preferences ? typeof (userDoc.prefs || userDoc.preferences) === "string" ? userDoc.prefs || userDoc.preferences : JSON.stringify(userDoc.prefs || userDoc.preferences) : JSON.stringify({
              theme: "dark",
              notifications: true,
              autoPlay: true,
              quality: "auto"
            }),
            avatar_url: userDoc.avatar_url || null,
            is_active: typeof userDoc.is_active === "boolean" ? userDoc.is_active : true,
            is_developer: typeof userDoc.is_developer === "boolean" ? userDoc.is_developer : false,
            created_at: userDoc.created_at || (/* @__PURE__ */ new Date()).toISOString(),
            last_login_at: userDoc.last_login_at || (/* @__PURE__ */ new Date()).toISOString(),
            last_activity_at: userDoc.last_activity_at || (/* @__PURE__ */ new Date()).toISOString()
          };
          try {
            await databases.deleteDocument(DATABASE_ID, "users", userId2);
            console.log(`🗑️ Deleted user document for ${userEmail2}`);
          } catch (delErr) {
            console.log(`ℹ️ Delete of user doc for ${userEmail2} returned:`, delErr.message || delErr);
          }
          try {
            userDoc = await databases.createDocument(DATABASE_ID, "users", userId2, preserved);
            console.log(`✅ Recreated clean user document for ${userEmail2}`);
          } catch (createErr) {
            if (createErr.code === 409) {
              console.log(`ℹ️ Recreate race: user document already exists for ${userEmail2}, fetching existing document`);
              userDoc = await databases.getDocument(DATABASE_ID, "users", userId2);
            } else {
              throw createErr;
            }
          }
          console.log(`✅ Completed delete+recreate migration for ${userEmail2}`);
        } catch (err) {
          console.log(`📝 Creating user document for ${userEmail2}`);
          const userRole2 = determineUserRole(userEmail2);
          const newUserPayload = {
            user_id: userId2,
            email: userEmail2,
            username: userEmail2.split("@")[0],
            role: userRole2,
            prefs: JSON.stringify({
              theme: "dark",
              notifications: true,
              autoPlay: true,
              quality: "auto"
            }),
            is_active: true,
            is_developer: userRole2 === "developer",
            avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userEmail2}`,
            created_at: (/* @__PURE__ */ new Date()).toISOString()
          };
          try {
            userDoc = await safeCreateDocument("users", userId2, newUserPayload);
            console.log(`✅ Created user document for ${userEmail2}`);
            created++;
          } catch (createErr) {
            if (createErr.code === 409) {
              console.log(`ℹ️ User document already exists for ${userEmail2} (race). Fetching existing document.`);
              userDoc = await databases.getDocument(DATABASE_ID, "users", userId2);
            } else {
              throw createErr;
            }
          }
        }
        let venueDoc;
        try {
          venueDoc = await databases.getDocument(DATABASE_ID, "venues", "default");
          console.log(`✅ Default venue exists`);
        } catch (err) {
          console.log(`🏢 Creating default venue`);
          const venuePayload = {
            venue_id: "default",
            venue_name: "Default Venue",
            owner_id: userId2,
            active_player_instance_id: null,
            now_playing: null,
            state: "idle",
            // note: some earlier schemas included `current_time` which may not be present now — avoid sending it
            volume: 80,
            active_queue: JSON.stringify([]),
            priority_queue: JSON.stringify([]),
            player_settings: JSON.stringify({
              autoPlay: true,
              showNotifications: true,
              theme: "dark",
              quality: "auto"
            }),
            is_shuffled: false,
            schedule_data: JSON.stringify({}),
            last_heartbeat_at: (/* @__PURE__ */ new Date()).toISOString(),
            last_updated: (/* @__PURE__ */ new Date()).toISOString(),
            created_at: (/* @__PURE__ */ new Date()).toISOString()
          };
          try {
            venueDoc = await safeCreateDocument("venues", "default", venuePayload);
            console.log(`✅ Created default venue`);
          } catch (venueCreateErr) {
            if (venueCreateErr.code === 409) {
              console.log(`ℹ️ Default venue already exists (race). Fetching existing document.`);
              try {
                venueDoc = await databases.getDocument(DATABASE_ID, "venues", "default");
                console.log(`✅ Retrieved existing default venue`);
              } catch (getVenueErr) {
                console.log(`⚠️ Failed to retrieve default venue after 409:`, getVenueErr);
                throw getVenueErr;
              }
            } else {
              console.log(`⚠️ Failed to create default venue:`, venueCreateErr);
              throw venueCreateErr;
            }
          }
        }
        await safeUpdateDocument("users", userId2, {
          venue_id: "default",
          updated_at: (/* @__PURE__ */ new Date()).toISOString()
        });
        console.log(`🔗 Linked user ${userEmail2} to default venue`);
        try {
          await createActivityLog({
            event_type: "user_sync_processed",
            event_data: JSON.stringify({
              user_id: userId2,
              email: userEmail2,
              action: "created",
              timestamp: (/* @__PURE__ */ new Date()).toISOString(),
              triggered_by: userId2
            }),
            user_id: userId2,
            venue_id: "default"
          });
          console.log(`📝 Logged activity for ${userEmail2}`);
        } catch (logErr) {
          if (logErr.code === 409 || logErr.response && logErr.response.includes("already exists")) {
            console.log(`ℹ️ Activity log already exists for ${userEmail2}, skipping`);
          } else {
            console.log(`⚠️ Failed to log activity for ${userEmail2}:`, logErr);
          }
        }
        processed++;
      } catch (userErr) {
        console.error(`❌ Error processing user ${authUser.email}:`, userErr);
        errors++;
        try {
          await createActivityLog({
            event_type: "user_sync_error",
            event_data: JSON.stringify({
              user_id: authUser.$id,
              email: authUser.email,
              error: userErr.message,
              timestamp: (/* @__PURE__ */ new Date()).toISOString(),
              triggered_by: userId
            }),
            user_id: authUser.$id,
            venue_id: null
          });
        } catch (logErr) {
          console.log(`⚠️ Failed to log error for ${authUser.email}:`, logErr);
        }
      }
    }
    console.log("✅ Bulk user synchronization completed");
    console.log(`📊 Summary: ${processed} processed, ${created} created, ${updated} updated, ${errors} errors`);
    return json({
      success: true,
      summary: {
        totalUsers: authUsers.users.length,
        processed,
        created,
        updated,
        errors
      },
      message: `User synchronization completed. Processed ${processed} users (${created} created, ${updated} updated, ${errors} errors)`
    });
  } catch (err) {
    console.error("User sync API error:", err);
    console.error("Error message:", err.message);
    console.error("Error code:", err.code);
    console.error("Error response:", err.response);
    throw error(500, err.message || "Failed to perform user synchronization");
  }
};
export {
  POST
};

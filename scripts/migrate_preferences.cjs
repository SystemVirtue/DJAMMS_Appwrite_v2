#!/usr/bin/env node
// Small migration script to stringify/truncate `preferences` on users collection
// Usage: node migrate_preferences.cjs

const { Client, Databases } = require('node-appwrite');
const DB_ID = '68cc92d30024e1b6eeb6';
const COLLECTION_ID = 'users';

const client = new Client();
client
  .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://syd.cloud.appwrite.io/v1')
  .setProject(process.env.APPWRITE_PROJECT_ID || '68cc86c3002b27e13947')
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
// Try to load ESM wrapper if present (for local script sanitization)
try {
  const { default: wrap } = await import(new URL('./wrapDatabases.mjs', import.meta.url));
  module.exports = module.exports || {};
  // Replace databases with wrapped proxy
  databases = wrap(databases);
} catch (e) {
  // Not critical; continue with raw databases
}

async function run() {
  try {
    const list = await databases.listDocuments(DB_ID, COLLECTION_ID);
    const docs = list.documents || [];
    console.log(`Found ${docs.length} documents`);
    for (const doc of docs) {
      const id = doc.$id;
        let prefs = doc.prefs ?? doc.preferences;
        if (prefs == null) {
          prefs = '{}';
      } else {
        prefs = JSON.stringify(prefs);
      }
      if (prefs.length > 65535) prefs = prefs.slice(0, 65535);
        if (String(doc.prefs) !== prefs) {
          console.log(`Updating ${id}: migrating 'preferences' -> 'prefs' (len ${prefs.length})`);
          try {
            await databases.updateDocument(DB_ID, COLLECTION_ID, id, { prefs });
          } catch (updateErr) {
            // If the update fails because the stored document contains unknown/legacy attributes
            // (Appwrite returns 400 "Invalid document structure: Unknown attribute: 'preferences'"),
            // attempt a safer delete + recreate using a whitelist of allowed fields.
                try {
                  const isBadStructure = updateErr && (updateErr.code === 400 || updateErr.type === 'document_invalid_structure');
                  if (isBadStructure) {
                    console.log(`⚠️ Update failed due to legacy attributes for ${id}, attempting delete+recreate fallback`);
                    // Minimal safe whitelist for recreating a user document. Keep this small to avoid unknown attribute errors.
                    const preserved = {
                      user_id: doc.user_id || id,
                      email: doc.email || null,
                      username: doc.username || (doc.email ? doc.email.split('@')[0] : id),
                      venue_id: doc.venue_id || 'default',
                      role: doc.role || 'user',
                      prefs,
                      avatar_url: doc.avatar_url || null,
                      is_active: typeof doc.is_active === 'boolean' ? doc.is_active : true,
                      is_developer: typeof doc.is_developer === 'boolean' ? doc.is_developer : false,
                      // created_at is required by schema; provide fallback
                      created_at: doc.created_at || new Date().toISOString()
                    };

                try {
                  await databases.deleteDocument(DB_ID, COLLECTION_ID, id);
                  console.log(`🗑️ Deleted legacy document ${id}`);
                } catch (delErr) {
                  console.log(`ℹ️ Delete returned for ${id}:`, delErr.message || delErr);
                }

                try {
                  // Only include attributes that exist in the collection schema
                  const candidateKeys = Object.keys(preserved);
                  const safePayload = {};
                  for (const key of candidateKeys) {
                    try {
                      await databases.getAttribute(DB_ID, COLLECTION_ID, key);
                      safePayload[key] = preserved[key];
                    } catch (attrErr) {
                      // attribute doesn't exist on collection - skip it
                      console.log(`  ⚠️ Skipping unknown attribute on recreate: ${key}`);
                    }
                  }

                  await databases.createDocument(DB_ID, COLLECTION_ID, id, safePayload);
                  console.log(`✅ Recreated document ${id} without legacy 'preferences'`);
                } catch (createErr) {
                  if (createErr && createErr.code === 409) {
                    console.log(`ℹ️ Recreate race for ${id}: document already exists, fetching existing doc`);
                    // try to fetch existing doc and continue
                    try {
                      const fetched = await databases.getDocument(DB_ID, COLLECTION_ID, id);
                      console.log(`ℹ️ Fetched existing document ${id} after race`);
                    } catch (fetchErr) {
                      console.log(`⚠️ Failed to fetch document ${id} after recreate race:`, fetchErr.message || fetchErr);
                    }
                  } else {
                    console.log(`❌ Failed to recreate document ${id}:`, createErr.message || createErr);
                  }
                }
              } else {
                throw updateErr;
              }
            } catch (fallbackErr) {
              console.error(`Migration error for ${id}`, fallbackErr);
              throw fallbackErr;
            }
          }
      } else {
        console.log(`No change needed for ${id}`);
      }
    }
    console.log('Migration batch complete');
  } catch (err) {
    console.error('Migration error', err);
    process.exit(1);
  }
}

run();

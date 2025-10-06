#!/usr/bin/env node
// Small migration script to stringify/truncate `preferences` on users collection
// Usage: node migrate_preferences.js [batchSize]

import { Client, Databases } from 'node-appwrite';
import wrapDatabases from './wrapDatabases.mjs';
const DB_ID = '68cc92d30024e1b6eeb6';
const COLLECTION_ID = 'users';

const client = new Client();
client
  .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://syd.cloud.appwrite.io/v1')
  .setProject(process.env.APPWRITE_PROJECT_ID || '68cc86c3002b27e13947')
  .setKey(process.env.APPWRITE_API_KEY);

const databases = wrapDatabases(new Databases(client));

async function run() {
  try {
    const list = await databases.listDocuments(DB_ID, COLLECTION_ID, [], 0, 100);
    const docs = list.documents || [];
    console.log(`Found ${docs.length} documents`);
    for (const doc of docs) {
      const id = doc.$id;
       let prefs = doc.prefs ?? doc.preferences;
      if (prefs == null || typeof prefs === 'string') {
        // already ok or null -> set to '{}' if null
        if (prefs == null) prefs = '{}';
      } else {
        // stringify object/array
        prefs = JSON.stringify(prefs);
      }
      // Truncate to 65535 chars
      if (prefs.length > 65535) prefs = prefs.slice(0, 65535);
      // Only update if changed
       if (String(doc.prefs) !== prefs) {
        console.log(`Updating ${id}: preferences length ${String(doc.preferences).length || 0} -> ${prefs.length}`);
         await databases.updateDocument(DB_ID, COLLECTION_ID, id, { prefs });
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

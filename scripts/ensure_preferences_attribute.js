#!/usr/bin/env node
// Ensure the `preferences` string attribute exists on the users collection (temporary)
import dotenv from 'dotenv';
dotenv.config();
import { Client, Databases } from 'node-appwrite';
import wrapDatabases from './wrapDatabases.mjs';

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT || process.env.VITE_APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID || process.env.VITE_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY || process.env.VITE_APPWRITE_API_KEY);

const databases = wrapDatabases(new Databases(client));
const DB = process.env.APPWRITE_DATABASE_ID || process.env.VITE_APPWRITE_DATABASE_ID;

(async function () {
  try {
    try {
      await databases.getAttribute(DB, 'users', 'preferences');
      console.log('Attribute `preferences` already exists on users collection');
      console.log('⚠️ Note: It is recommended to migrate documents to `prefs` and then remove `preferences` attribute.');
    } catch (e) {
      console.log('Attribute `preferences` missing. This script will NOT recreate it to avoid reintroducing legacy schema.');
      console.log('Run scripts/migrate_preferences.js or scripts/force_cleanup_users.js to migrate documents and then remove the legacy attribute if needed.');
    }
  } catch (err) {
    console.error('Failed to ensure attribute preferences:', err);
    process.exit(1);
  }
})();

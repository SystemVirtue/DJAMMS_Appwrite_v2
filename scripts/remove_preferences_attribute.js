#!/usr/bin/env node
// Remove `preferences` attribute from users collection (destructive to the attribute only)
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
      await databases.deleteAttribute(DB, 'users', 'preferences');
      console.log('Deleted attribute `preferences` from users collection');
    } catch (e) {
      console.log('Failed to delete attribute (might not exist):', e.message || e);
    }

    // Wait briefly and then list one sample doc
    await new Promise(r => setTimeout(r, 1000));
    try {
      const list = await databases.listDocuments(DB, 'users');
      console.log('Sample after deletion, first doc keys:', Object.keys((list.documents||[])[0]||{}));
    } catch (e) {
      console.log('Could not list docs after attribute delete:', e.message || e);
    }
  } catch (err) {
    console.error('Error removing attribute:', err);
    process.exit(1);
  }
})();

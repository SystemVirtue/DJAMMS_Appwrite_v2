#!/usr/bin/env node
// Recreate users documents from Appwrite auth users using a minimal safe payload
import dotenv from 'dotenv';
dotenv.config();
import { Client, Users, Databases } from 'node-appwrite';
import wrapDatabases from './wrapDatabases.mjs';

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT || process.env.VITE_APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID || process.env.VITE_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY || process.env.VITE_APPWRITE_API_KEY);

const usersService = new Users(client);
const databases = wrapDatabases(new Databases(client));
const DB = process.env.APPWRITE_DATABASE_ID || process.env.VITE_APPWRITE_DATABASE_ID;

(async function () {
  try {
    const authList = await usersService.list();
    const authUsers = authList.users || [];
    console.log(`Auth users to process: ${authUsers.length}`);

    let created = 0, failed = 0;

    for (const au of authUsers) {
      const userId = au.$id;
      const email = au.email;
      console.log(`\nProcessing auth user: ${email} (${userId})`);

      // Delete existing DB doc if present
      try {
        await databases.deleteDocument(DB, 'users', userId);
        console.log('  Deleted existing users document (if present)');
      } catch (delErr) {
        // ignore not found
        if (delErr && delErr.code && delErr.code === 404) {
          console.log('  No existing users document to delete');
        } else {
          console.log('  Delete returned:', delErr.message || delErr);
        }
      }

      // Minimal safe payload
      const defaultPrefs = {
        theme: 'dark',
        notifications: true,
        autoPlay: true,
        quality: 'auto'
      };

      const payload = {
        user_id: userId,
        email: email,
        username: email ? email.split('@')[0] : userId,
        role: 'user',
        prefs: JSON.stringify(defaultPrefs),
        is_active: true,
        is_developer: false,
        avatar_url: au.photo || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(email || userId)}`,
        created_at: new Date().toISOString()
      };

      try {
        await databases.createDocument(DB, 'users', userId, payload);
        console.log('  ✅ Created user document without legacy preferences');
        created++;
      } catch (createErr) {
        if (createErr && createErr.code === 409) {
          console.log('  ℹ️ Document already exists after delete attempt (race)');
        } else {
          console.log('  ❌ Failed to create user document:', createErr.message || createErr);
          failed++;
        }
      }
    }

    console.log(`\nRecreate complete: ${created} created, ${failed} failed`);
  } catch (e) {
    console.error('Failed to recreate users from auth:', e);
    process.exit(1);
  }
})();

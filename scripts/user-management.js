#!/usr/bin/env node

/**
 * DJAMMS User Management Script
 * Consolidated user operations with subcommands
 *
 * Usage:
 *   node scripts/user-management.js list
 *   node scripts/user-management.js verify
 *   node scripts/user-management.js cleanup
 *   node scripts/user-management.js check-prefs
 */

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

const COLLECTIONS_V3 = {
  USERS: 'users'
};

const command = process.argv[2];

if (!command) {
  console.log('Usage: node scripts/user-management.js <command>');
  console.log('Commands:');
  console.log('  list        - List all users and check attributes');
  console.log('  verify      - Verify users in djamms_users collection');
  console.log('  cleanup     - Force cleanup and recreate user documents');
  console.log('  check-prefs - Check prefs vs preferences attributes');
  process.exit(1);
}

async function listUsers() {
  console.log('📋 Listing users and checking attributes...\n');

  try {
    const list = await databases.listDocuments(DB, 'users');
    const docs = list.documents || [];
    console.log(`Found ${docs.length} documents\n`);

    for (const d of docs) {
      console.log('─'.repeat(50));
      console.log('ID:', d.$id);
      console.log('Keys:', Object.keys(d).join(', '));
      console.log('Has prefs:', Object.prototype.hasOwnProperty.call(d, 'prefs'));
      console.log('Has preferences:', Object.prototype.hasOwnProperty.call(d, 'preferences'));

      if (Object.prototype.hasOwnProperty.call(d, 'prefs')) {
        console.log('Prefs length:', String(d.prefs).length);
      }
      console.log('');
    }
  } catch (e) {
    console.error('❌ Error listing users:', e);
    process.exit(1);
  }
}

async function verifyUsers() {
  console.log('📊 Verifying DJAMMS Users Database...\n');

  try {
    // Get all users from users collection
    const response = await databases.listDocuments(
      DB,
      COLLECTIONS_V3.USERS
    );

    console.log(`✅ Total users in users collection: ${response.total}\n`);

    if (response.total === 0) {
      console.log('⚠️ No users found in users collection');
      return;
    }

    console.log('👥 User Details:');
    console.log('═'.repeat(80));

    response.documents.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email || 'No email'} (${user.$id})`);
      console.log(`   Role: ${user.role || 'Not set'}`);
      console.log(`   Venue: ${user.venue_id || 'Not assigned'}`);
      console.log(`   Created: ${user.created_at || 'Unknown'}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error verifying users:', error.message);
    process.exit(1);
  }
}

async function cleanupUsers() {
  console.log('🧹 Force cleaning users: deleting preferences attribute and recreating documents...\n');

  try {
    // Remove preferences attribute if present
    try {
      await databases.deleteAttribute(DB, 'users', 'preferences');
      console.log('✅ Deleted preferences attribute (if it existed)');
    } catch (e) {
      console.log('ℹ️ Preferences attribute deletion attempt:', e.message || e);
    }

    const authList = await usersService.list();
    const authUsers = authList.users || [];
    console.log(`👥 Auth users to process: ${authUsers.length}\n`);

    for (const au of authUsers) {
      const userId = au.$id;
      const email = au.email;
      console.log(`🔄 Processing auth user: ${email} (${userId})`);

      // Delete existing db doc
      try {
        await databases.deleteDocument(DB, 'users', userId);
        console.log('  ✅ Deleted existing users doc');
      } catch (delErr) {
        console.log('  ℹ️ Delete returned (ok to ignore):', delErr.message || delErr);
      }

      // Create with minimal payload
      const payload = {
        user_id: userId,
        email: email,
        username: email ? email.split('@')[0] : userId,
        role: 'user',
        prefs: JSON.stringify({ theme: 'dark' }),
        is_active: true,
        is_developer: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      try {
        await databases.createDocument(DB, 'users', userId, payload);
        console.log('  ✅ Created new users doc');
      } catch (createErr) {
        console.log('  ❌ Failed to create users doc:', createErr.message || createErr);
      }
    }

    console.log('\n✅ User cleanup completed');
  } catch (e) {
    console.error('❌ Error during cleanup:', e);
    process.exit(1);
  }
}

async function checkPrefs() {
  console.log('🔍 Checking prefs vs preferences attributes...\n');

  try {
    const list = await databases.listDocuments(DB, 'users');
    const docs = list.documents || [];

    let prefsCount = 0;
    let preferencesCount = 0;

    for (const d of docs) {
      if (Object.prototype.hasOwnProperty.call(d, 'prefs')) prefsCount++;
      if (Object.prototype.hasOwnProperty.call(d, 'preferences')) preferencesCount++;
    }

    console.log(`📊 Analysis Results:`);
    console.log(`   Documents with 'prefs': ${prefsCount}`);
    console.log(`   Documents with 'preferences': ${preferencesCount}`);
    console.log(`   Total documents: ${docs.length}`);

    if (preferencesCount > 0) {
      console.log('\n⚠️ Found documents with deprecated "preferences" attribute');
      console.log('   Consider running: node scripts/user-management.js cleanup');
    }

  } catch (e) {
    console.error('❌ Error checking preferences:', e);
    process.exit(1);
  }
}

// Execute the requested command
switch (command) {
  case 'list':
    await listUsers();
    break;
  case 'verify':
    await verifyUsers();
    break;
  case 'cleanup':
    await cleanupUsers();
    break;
  case 'check-prefs':
    await checkPrefs();
    break;
  default:
    console.log(`❌ Unknown command: ${command}`);
    console.log('Available commands: list, verify, cleanup, check-prefs');
    process.exit(1);
}
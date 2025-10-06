#!/usr/bin/env node

/**
 * DJAMMS User Document Migration Script
 * Cleans up existing user documents by setting proper prefs field
 * Uses REST API to bypass SDK validation issues
 */

import https from 'https';
import dotenv from 'dotenv';
import { Client, Databases } from 'node-appwrite';
import wrapDatabases from './wrapDatabases.mjs';

// Load environment variables
dotenv.config();

const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID || '';
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY || '';
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || '68cc92d30024e1b6eeb6';

// Helper function to make HTTP requests
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(response);
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${response.message || body}`));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function migrateUserDocuments() {
  console.log('🔄 Starting user document cleanup and prefs migration...');

  try {
    // Parse endpoint URL
    const url = new URL(APPWRITE_ENDPOINT);
    const hostname = url.hostname;
    const basePath = url.pathname.replace(/\/$/, ''); // Remove trailing slash

    // First, get all user documents using REST API
    const listOptions = {
      hostname: hostname,
      path: `${basePath}/databases/${DATABASE_ID}/collections/users/documents?limit=1000`,
      method: 'GET',
      headers: {
        'X-Appwrite-Project': APPWRITE_PROJECT_ID,
        'X-Appwrite-Key': APPWRITE_API_KEY,
        'Content-Type': 'application/json'
      }
    };

    const usersResponse = await makeRequest(listOptions);
    const users = usersResponse.documents || [];

    console.log(`📊 Found ${users.length} user documents to check`);

    let migratedCount = 0;
    let skippedCount = 0;

    for (const user of users) {
      // Check if document needs prefs migration
      if (user.prefs === null || user.prefs === undefined) {
        console.log(`🔄 Setting default prefs for user ${user.email} (${user.$id})`);

        // Set default prefs
        const defaultPrefs = JSON.stringify({
          theme: 'dark',
          notifications: true,
          autoPlay: true,
          quality: 'auto'
        });

        // Update document using REST API PUT to replace the entire document
        const updateOptions = {
          hostname: hostname,
          path: `${basePath}/databases/${DATABASE_ID}/collections/users/documents/${user.$id}`,
          method: 'PUT',
          headers: {
            'X-Appwrite-Project': APPWRITE_PROJECT_ID,
            'X-Appwrite-Key': APPWRITE_API_KEY,
            'Content-Type': 'application/json'
          }
        };

        const updateData = {
          data: {
            user_id: user.user_id,
            email: user.email,
            username: user.username,
            venue_id: user.venue_id || '',
            role: user.role || 'user',
            prefs: defaultPrefs,
            avatar_url: user.avatar_url,
            is_active: user.is_active,
            is_developer: user.is_developer,
            created_at: user.created_at,
            last_login_at: user.last_login_at,
            last_activity_at: user.last_activity_at,
            updated_at: new Date().toISOString()
          }
        };

        await makeRequest(updateOptions, updateData);

        console.log(`✅ Set prefs for user ${user.email}`);
        migratedCount++;
      } else {
        console.log(`⏭️ User ${user.email} already has prefs set`);
        skippedCount++;
      }
    }

    console.log(`\n🎉 Migration complete!`);
    console.log(`📈 Migrated: ${migratedCount} users`);
    console.log(`⏭️ Skipped: ${skippedCount} users`);

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Run the migration
migrateUserDocuments();
#!/usr/bin/env node
/**
 * Add venue_id attribute to djamms_users collection
 */

import { Client, Databases } from 'node-appwrite';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Appwrite client
const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
  .setProject(process.env.APPWRITE_PROJECT_ID || '')
  .setKey(process.env.APPWRITE_API_KEY || '');

const databases = new Databases(client);
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || 'djamms_db';

async function addVenueIdAttribute() {
  console.log('🎵 Adding venue_id attribute to djamms_users collection...');

  try {
    // Add venue_id string attribute
    await databases.createStringAttribute(
      DATABASE_ID,
      'djamms_users',
      'venue_id',
      255, // size
      false, // required
      '' // default
    );

    console.log('✅ Successfully added venue_id attribute to djamms_users collection');
  } catch (error) {
    console.error('❌ Failed to add venue_id attribute:', error.message);
    throw error;
  }
}

addVenueIdAttribute().catch(console.error);
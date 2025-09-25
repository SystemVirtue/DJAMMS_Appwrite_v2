#!/usr/bin/env node

/**
 * Script to list all collections and their attributes in the DJAMMS database
 */

import { Client, Databases } from 'node-appwrite';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize the client
const client = new Client();
client
    .setEndpoint(process.env.APPWRITE_ENDPOINT || process.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
    .setProject(process.env.APPWRITE_PROJECT_ID || process.env.VITE_APPWRITE_PROJECT_ID || '')
    .setKey(process.env.APPWRITE_API_KEY || process.env.VITE_APPWRITE_API_KEY || '');

const databases = new Databases(client);
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || process.env.VITE_APPWRITE_DATABASE_ID || 'djamms_db';

async function listCollectionsAndAttributes() {
    console.log('🔍 Retrieving DJAMMS database structure...');
    console.log(`Database ID: ${DATABASE_ID}`);
    console.log(`Endpoint: ${process.env.APPWRITE_ENDPOINT}`);
    console.log(`Project: ${process.env.APPWRITE_PROJECT_ID}`);
    console.log('');

    try {
        // List all collections in the database
        const collectionsResponse = await databases.listCollections(DATABASE_ID);
        const collections = collectionsResponse.collections;

        console.log(`📊 Found ${collections.length} collections:`);
        console.log('');

        for (const collection of collections) {
            console.log(`🎯 Collection: ${collection.name} (${collection.$id})`);
            console.log(`   Description: ${collection.description || 'No description'}`);
            console.log(`   Created: ${collection.$createdAt}`);
            console.log(`   Updated: ${collection.$updatedAt}`);
            console.log('');

            try {
                // List attributes for this collection
                const attributesResponse = await databases.listAttributes(DATABASE_ID, collection.$id);
                const attributes = attributesResponse.attributes;

                console.log(`   📋 Attributes (${attributes.length}):`);
                attributes.forEach(attr => {
                    console.log(`      • ${attr.key}: ${attr.type}${attr.required ? ' (required)' : ''}${attr.default ? ` (default: ${attr.default})` : ''}`);
                    if (attr.type === 'string' && attr.size) {
                        console.log(`        Size: ${attr.size}`);
                    }
                    if (attr.type === 'integer' && (attr.min || attr.max)) {
                        console.log(`        Range: ${attr.min || 'no min'} - ${attr.max || 'no max'}`);
                    }
                    if (attr.type === 'enum' && attr.elements) {
                        console.log(`        Elements: [${attr.elements.join(', ')}]`);
                    }
                });
                console.log('');

                // List indexes for this collection
                try {
                    const indexesResponse = await databases.listIndexes(DATABASE_ID, collection.$id);
                    const indexes = indexesResponse.indexes;

                    if (indexes.length > 0) {
                        console.log(`   🔍 Indexes (${indexes.length}):`);
                        indexes.forEach(index => {
                            console.log(`      • ${index.key}: ${index.type} on [${index.attributes.join(', ')}]`);
                        });
                        console.log('');
                    }
                } catch (indexError) {
                    console.log(`   ⚠️  Could not retrieve indexes: ${indexError.message}`);
                    console.log('');
                }

            } catch (attrError) {
                console.log(`   ❌ Could not retrieve attributes: ${attrError.message}`);
                console.log('');
            }

            console.log('─'.repeat(80));
            console.log('');
        }

    } catch (error) {
        console.error('❌ Error listing collections:', error.message);
        if (error.code) {
            console.error(`   Error code: ${error.code}`);
        }
        if (error.response) {
            console.error(`   Response:`, error.response);
        }
    }
}

listCollectionsAndAttributes().catch(console.error);
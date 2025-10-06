/**
 * DJAMMS User Synchronization Script
 * 
 * This script synchronizes users from Appwrite's built-in Auth system
 * to the djamms_users collection in our simplified database schema.
 * 
 * Features:
 * - Syncs existing authenticated users to djamms_users
 * - Sets up automatic sync hooks (webhook concept)
 * - Handles user profile updates and new registrations
 * - Maintains user approval workflow (devApproved field)
 */

import { Client, Databases, Users, Query, ID } from 'node-appwrite';
import dotenv from 'dotenv';
import wrapDatabases from './wrapDatabases.mjs';

// Load environment variables
dotenv.config();

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
  .setProject(process.env.APPWRITE_PROJECT_ID || '')
  .setKey(process.env.APPWRITE_API_KEY || ''); // Server API key required

const databases = wrapDatabases(new Databases(client));
const users = new Users(client);
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || '';

class UserSynchronization {
    constructor() {
        this.syncLog = [];
        this.startTime = new Date();
    }

    log(message, type = 'info') {
        const timestamp = new Date().toISOString();
        const logEntry = { timestamp, message, type };
        this.syncLog.push(logEntry);
        
        const icon = type === 'error' ? '❌' : type === 'success' ? '✅' : type === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`${icon} [${timestamp}] ${message}`);
    }

    async syncAllUsers() {
        try {
            this.log('🔄 Starting user synchronization from Auth to djamms_users');
            
            // Get all users from Appwrite Auth system
            const authUsers = await this.getAllAuthUsers();
            this.log(`📊 Found ${authUsers.length} users in Auth system`);
            
            // Get existing DJAMMS users
            const existingDjammsUsers = await this.getExistingDjammsUsers();
            this.log(`📊 Found ${existingDjammsUsers.length} existing users in djamms_users`);
            
            let syncedCount = 0;
            let skippedCount = 0;
            let errorCount = 0;
            
            for (const authUser of authUsers) {
                try {
                    // Check if user already exists in djamms_users
                    const existingUser = existingDjammsUsers.find(u => u.email === authUser.email);
                    
                    if (existingUser) {
                        this.log(`↪ User already exists: ${authUser.email}`, 'warning');
                        skippedCount++;
                        continue;
                    }
                    
                    // Create new DJAMMS user
                    await this.createDjammsUser(authUser);
                    syncedCount++;
                    
                } catch (error) {
                    this.log(`❌ Failed to sync user ${authUser.email}: ${error.message}`, 'error');
                    errorCount++;
                }
            }
            
            this.log(`✅ Synchronization complete! Synced: ${syncedCount}, Skipped: ${skippedCount}, Errors: ${errorCount}`, 'success');
            
            return {
                total: authUsers.length,
                synced: syncedCount,
                skipped: skippedCount,
                errors: errorCount
            };
            
        } catch (error) {
            this.log(`💥 Synchronization failed: ${error.message}`, 'error');
            throw error;
        }
    }

    async getAllAuthUsers() {
        try {
            let allUsers = [];
            let lastUserId = null;
            
            while (true) {
                const queries = lastUserId ? [Query.cursorAfter(lastUserId)] : [];
                const response = await users.list(queries.concat([Query.limit(100)]));
                
                if (response.users.length === 0) break;
                
                allUsers = allUsers.concat(response.users);
                lastUserId = response.users[response.users.length - 1].$id;
                
                this.log(`📥 Fetched ${allUsers.length} users so far...`);
            }
            
            return allUsers;
        } catch (error) {
            this.log(`❌ Failed to fetch Auth users: ${error.message}`, 'error');
            throw error;
        }
    }

    async getExistingDjammsUsers() {
        try {
            const response = await databases.listDocuments(
                DATABASE_ID,
                'djamms_users',
                [Query.limit(1000)] // Adjust if you have more than 1000 users
            );
            return response.documents;
        } catch (error) {
            this.log(`❌ Failed to fetch existing DJAMMS users: ${error.message}`, 'error');
            throw error;
        }
    }

    async createDjammsUser(authUser) {
        try {
            // Determine user role based on email or other criteria
            const userRole = this.determineUserRole(authUser);
            const isDevApproved = this.shouldAutoApprove(authUser);
            
            const djammsUserData = {
                email: authUser.email,
                name: authUser.name || authUser.email.split('@')[0], // Use email prefix if no name
                avatar: authUser.prefs?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${authUser.email}`,
                devApproved: isDevApproved,
                userRole: userRole,
                isActive: true, // All synced users are active by default
                createdAt: authUser.$createdAt,
                lastLoginAt: authUser.accessedAt || new Date().toISOString()
            };
            
            await databases.createDocument(
                DATABASE_ID,
                'djamms_users',
                authUser.$id, // Use the same ID as Auth user for consistency
                djammsUserData
            );
            
            this.log(`✅ Created DJAMMS user: ${authUser.email} (role: ${userRole})`, 'success');
            
        } catch (error) {
            this.log(`❌ Failed to create DJAMMS user for ${authUser.email}: ${error.message}`, 'error');
            throw error;
        }
    }

    determineUserRole(authUser) {
        const adminEmails = [
            'admin@djamms.com',
            'admin@djamms.app',
            'mike@djamms.com',
            'mike.clarkin@gmail.com',
            'admin@sysvir.com'
        ];
        
        const devEmails = [
            'dev@djamms.com',
            'dev@djamms.app',
            'developer@djamms.com',
            'demo@djamms.app',
            'djammsdemo@gmail.com'
        ];
        
        const adminDomains = [
            '@djamms.com'
        ];
        
        const email = authUser.email.toLowerCase();
        
        // Check if user is admin
        if (adminEmails.includes(email)) {
            return 'admin';
        }
        
        // Check if user is developer  
        if (devEmails.includes(email)) {
            return 'developer';
        }
        
        // Check admin domains
        for (const domain of adminDomains) {
            if (email.includes(domain)) {
                return 'admin';
            }
        }
        
        // Default to regular user
        return 'user';
    }

    shouldAutoApprove(authUser) {
        const userRole = this.determineUserRole(authUser);
        
        // Auto-approve admins and developers
        if (userRole === 'admin' || userRole === 'developer') {
            return true;
        }
        
        // Auto-approve verified users
        if (authUser.emailVerification) {
            return true;
        }
        
        // Auto-approve users from trusted domains
        const trustedDomains = [
            '@djamms.com',
            '@gmail.com',
            '@outlook.com',
            // Add trusted domains here
        ];
        
        for (const domain of trustedDomains) {
            if (authUser.email.toLowerCase().includes(domain)) {
                return true;
            }
        }
        
        // Default to requiring manual approval
        return false;
    }

    async syncSingleUser(authUserId) {
        try {
            this.log(`🔄 Syncing single user: ${authUserId}`);
            
            // Get user from Auth
            const authUser = await users.get(authUserId);
            
            // Check if user already exists
            let existingUser = null;
            try {
                existingUser = await databases.getDocument(DATABASE_ID, 'djamms_users', authUserId);
            } catch (error) {
                if (error.code !== 404) throw error;
            }
            
            if (existingUser) {
                // Update existing user
                await this.updateDjammsUser(authUser, existingUser);
            } else {
                // Create new user
                await this.createDjammsUser(authUser);
            }
            
            this.log(`✅ Successfully synced user: ${authUser.email}`, 'success');
            
        } catch (error) {
            this.log(`❌ Failed to sync user ${authUserId}: ${error.message}`, 'error');
            throw error;
        }
    }

    async updateDjammsUser(authUser, existingDjammsUser) {
        try {
            const updateData = {
                email: authUser.email,
                name: authUser.name || existingDjammsUser.name,
                avatar: authUser.prefs?.avatar || existingDjammsUser.avatar,
                isActive: !authUser.status,
                lastLoginAt: authUser.accessedAt || existingDjammsUser.lastLoginAt
            };
            
            await databases.updateDocument(
                DATABASE_ID,
                'djamms_users',
                authUser.$id,
                updateData
            );
            
            this.log(`✅ Updated DJAMMS user: ${authUser.email}`, 'success');
            
        } catch (error) {
            this.log(`❌ Failed to update DJAMMS user ${authUser.email}: ${error.message}`, 'error');
            throw error;
        }
    }

    async generateSyncReport() {
        const endTime = new Date();
        const duration = ((endTime - this.startTime) / 1000).toFixed(2);
        
        const report = {
            startTime: this.startTime.toISOString(),
            endTime: endTime.toISOString(),
            duration: `${duration} seconds`,
            logs: this.syncLog,
            summary: {
                totalOperations: this.syncLog.length,
                successes: this.syncLog.filter(l => l.type === 'success').length,
                warnings: this.syncLog.filter(l => l.type === 'warning').length,
                errors: this.syncLog.filter(l => l.type === 'error').length
            }
        };
        
        this.log(`⏱️ Total sync time: ${duration} seconds`, 'info');
        return report;
    }
}

// CLI Interface
async function main() {
    const args = process.argv.slice(2);
    const command = args[0] || 'sync-all';
    
    const userSync = new UserSynchronization();
    
    try {
        switch (command) {
            case 'sync-all':
                console.log('🚀 Starting full user synchronization...');
                const result = await userSync.syncAllUsers();
                console.log('\n📊 Final Results:', result);
                break;
                
            case 'sync-user':
                const userId = args[1];
                if (!userId) {
                    console.error('❌ Please provide a user ID: node sync-users.js sync-user <USER_ID>');
                    process.exit(1);
                }
                await userSync.syncSingleUser(userId);
                break;
                
            default:
                console.log('Usage:');
                console.log('  node sync-users.js sync-all     # Sync all users from Auth');
                console.log('  node sync-users.js sync-user <USER_ID>  # Sync specific user');
        }
        
        const report = await userSync.generateSyncReport();
        console.log('\n✅ Synchronization completed successfully!');
        
    } catch (error) {
        console.error('\n💥 Synchronization failed:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}

export { UserSynchronization };
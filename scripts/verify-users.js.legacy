/**
 * Verify Users - Check djamms_users collection data
 */

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

// Appwrite SDK imports  
import { Client, Databases, Account, ID } from 'node-appwrite';

// Initialize Appwrite client
const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const account = new Account(client);

// Collection IDs (from simplified schema)
const COLLECTIONS_V3 = {
  USERS: 'djamms_users',
  JUKEBOX_STATE: 'jukebox_state',
  USER_QUEUES: 'user_queues',
  PLAYLISTS: 'playlists',
  USER_SETTINGS: 'user_settings'
};

async function verifyUsers() {
  try {
    console.log('📊 Verifying DJAMMS Users Database...\n');
    
    // Get all users from djamms_users collection
    const response = await databases.listDocuments(
      process.env.APPWRITE_DATABASE_ID,
      COLLECTIONS_V3.USERS
    );
    
    console.log(`✅ Total users in djamms_users: ${response.total}\n`);
    
    if (response.total === 0) {
      console.log('⚠️ No users found in djamms_users collection');
      return;
    }
    
    console.log('👥 User Details:');
    console.log('═'.repeat(80));
    
    response.documents.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name}`);
      console.log(`   📧 Email: ${user.email}`);
      console.log(`   👤 Role: ${user.userRole}`);
      console.log(`   ✅ Approved: ${user.devApproved ? 'Yes' : 'No'}`);
      console.log(`   🟢 Active: ${user.isActive ? 'Yes' : 'No'}`);
      console.log(`   📅 Created: ${new Date(user.createdAt).toLocaleDateString()}`);
      console.log('');
    });
    
    // Count by role
    const roleCounts = {
      admin: 0,
      developer: 0,
      user: 0
    };
    
    response.documents.forEach(user => {
      roleCounts[user.userRole] = (roleCounts[user.userRole] || 0) + 1;
    });
    
    console.log('📊 Role Distribution:');
    console.log('═'.repeat(30));
    console.log(`👑 Admins: ${roleCounts.admin}`);
    console.log(`💻 Developers: ${roleCounts.developer}`);  
    console.log(`👤 Users: ${roleCounts.user}`);
    
    // Count approved vs pending
    const approvedCount = response.documents.filter(user => user.devApproved).length;
    const pendingCount = response.total - approvedCount;
    
    console.log('\n🔐 Approval Status:');
    console.log('═'.repeat(30));
    console.log(`✅ Approved: ${approvedCount}`);
    console.log(`⏳ Pending: ${pendingCount}`);
    
    console.log('\n✅ User verification completed!');
    
  } catch (error) {
    console.error('❌ Error verifying users:', error.message);
  }
}

// Run verification
verifyUsers();
#!/usr/bin/env node

// Test script for DJAMMS consolidated functions
import https from 'https';

const PROJECT_ID = '68cc86c3002b27e13947';
const API_KEY = 'standard_451b7a70d97754000ffab451c2a59b4442ce00dcb6d97e97aa7e9d7fcd180c54a3fc8553a4befb34d44797587fb423204dbbccef1fab5d096e9656fb8486c16cbe25f4d76a9e26228ad2ad2be1a286509e0760f299e0476416add867b15902dc0d927e33ea440806ad82899e1ac36cc155c06cf402ef719b7d53d59468035a0';

function executeFunction(functionId, data = {}) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);

    const options = {
      hostname: 'syd.cloud.appwrite.io',
      port: 443,
      path: `/v1/functions/${functionId}/executions`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'X-Appwrite-Project': PROJECT_ID,
        'X-Appwrite-Key': API_KEY
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve(response);
        } catch (e) {
          resolve(body);
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(postData);
    req.end();
  });
}

async function testFunctions() {
  console.log('🧪 Testing DJAMMS Consolidated Functions\n');

  // Test 1: UI Command & Sync Hub - Play command
  console.log('1️⃣ Testing UI Command & Sync Hub (Play Command)...');
  try {
    const playCommand = {
      command: 'play',
      venue_id: 'test-venue-123',
      user_id: 'test-user-123'
    };
    const result1 = await executeFunction('ui-command-sync-hub', playCommand);
    console.log('✅ UI Command & Sync Hub Response:', result1);
  } catch (error) {
    console.log('❌ UI Command & Sync Hub Error:', error.message);
  }

  // Test 2: Playlist & Content Manager - Get playlists
  console.log('\n2️⃣ Testing Playlist & Content Manager (Get Playlists)...');
  try {
    const playlistRequest = {
      action: 'getPlaylists',
      venue_id: 'test-venue-123',
      user_id: 'test-user-123'
    };
    const result2 = await executeFunction('playlist-content-manager', playlistRequest);
    console.log('✅ Playlist & Content Manager Response:', result2);
  } catch (error) {
    console.log('❌ Playlist & Content Manager Error:', error.message);
  }

  // Test 3: Player & Venue State Manager - Heartbeat
  console.log('\n3️⃣ Testing Player & Venue State Manager (Heartbeat)...');
  try {
    const heartbeatData = {
      event: 'heartbeat',
      venue_id: 'test-venue-123',
      player_connected: true,
      current_track: {
        videoId: 'test-video',
        title: 'Test Track',
        duration: 180
      }
    };
    const result3 = await executeFunction('player-venue-state-manager', heartbeatData);
    console.log('✅ Player & Venue State Manager Response:', result3);
  } catch (error) {
    console.log('❌ Player & Venue State Manager Error:', error.message);
  }

  // Test 4: Scheduler & Maintenance Agent (should work automatically, but let's test manual trigger)
  console.log('\n4️⃣ Testing Scheduler & Maintenance Agent (Manual Trigger)...');
  try {
    const result4 = await executeFunction('scheduler-maintenance-agent', {});
    console.log('✅ Scheduler & Maintenance Agent Response:', result4);
  } catch (error) {
    console.log('❌ Scheduler & Maintenance Agent Error:', error.message);
  }

  console.log('\n🎉 Function testing completed!');
  console.log('📊 Check the Appwrite console for function execution logs and activity logs.');
}

testFunctions().catch(console.error);
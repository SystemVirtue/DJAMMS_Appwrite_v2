#!/usr/bin/env node
import dotenv from 'dotenv';
dotenv.config();
import { Client, Users } from 'node-appwrite';

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT || process.env.VITE_APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID || process.env.VITE_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY || process.env.VITE_APPWRITE_API_KEY);

const users = new Users(client);

(async function () {
  try {
    const list = await users.list();
    console.log('auth users count:', list.users.length);
    for (const u of list.users) {
      console.log('-', u.email, u.$id);
    }
  } catch (e) {
    console.error('Failed to list auth users:', e);
    process.exit(1);
  }
})();

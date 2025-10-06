#!/usr/bin/env node
// Dump all documents from the users collection to a timestamped JSON file
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { Client, Databases } from 'node-appwrite';
import wrapDatabases from './wrapDatabases.mjs';

dotenv.config();

const client = new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT || process.env.VITE_APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID || process.env.VITE_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY || process.env.VITE_APPWRITE_API_KEY);

const databases = wrapDatabases(new Databases(client));
const DB = process.env.APPWRITE_DATABASE_ID || process.env.VITE_APPWRITE_DATABASE_ID;

(async function () {
  try {
    const list = await databases.listDocuments(DB, 'users');
    const docs = list.documents || [];
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const outDir = path.resolve(process.cwd(), 'backups');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
    const outPath = path.join(outDir, `users-backup-${ts}.json`);
    fs.writeFileSync(outPath, JSON.stringify(docs, null, 2), 'utf-8');
    console.log(`Wrote backup: ${outPath} (${docs.length} documents)`);
    if (docs.length > 0) {
      console.log('Sample document keys:', Object.keys(docs[0] || {}).join(', '));
    }
  } catch (e) {
    console.error('Failed to dump users:', e);
    process.exit(1);
  }
})();

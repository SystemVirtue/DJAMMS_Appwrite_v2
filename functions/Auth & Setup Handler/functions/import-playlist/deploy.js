#!/usr/bin/env node
/**
 * deploy.js
 *
 * Deploy the import-playlist Appwrite Function using the Appwrite Node SDK.
 *
 * Required environment variables:
 * - APPWRITE_ENDPOINT
 * - APPWRITE_PROJECT_ID
 * - APPWRITE_API_KEY (service key)
 * - APPWRITE_RUNTIME (e.g. "node-18.0")
 * - APPWRITE_FUNCTION_ID (optional, default: import-playlist)
 *
 * Usage:
 *   npm install
 *   APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1 \
 *   APPWRITE_PROJECT_ID=<projectId> \
 *   APPWRITE_API_KEY=<key> \
 *   APPWRITE_RUNTIME=node-18.0 \
 *   node deploy.js
 */

const path = require('path');
const fs = require('fs');
const { Client, Functions } = require('node-appwrite');
const archiver = require('archiver');

const FUNCTION_ID = process.env.APPWRITE_FUNCTION_ID || 'import-playlist';
const RUNTIME = process.env.APPWRITE_RUNTIME || 'node-18.0';

function zipSource(folderPath, outPath) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => resolve());
    archive.on('error', err => reject(err));

    archive.pipe(output);
    archive.directory(folderPath, false);
    archive.finalize();
  });
}

async function main() {
  const endpoint = process.env.APPWRITE_ENDPOINT;
  const project = process.env.APPWRITE_PROJECT_ID;
  const apiKey = process.env.APPWRITE_API_KEY;

  if (!endpoint || !project || !apiKey) {
    console.error('Missing APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, or APPWRITE_API_KEY environment variables.');
    process.exit(1);
  }

  const client = new Client();
  client.setEndpoint(endpoint).setProject(project).setKey(apiKey);
  const functions = new Functions(client);

  const srcDir = path.resolve(__dirname);
  const zipPath = path.join(__dirname, 'import-playlist.zip');

  console.log('Zipping function source to', zipPath);
  await zipSource(srcDir, zipPath);

  // Create or update function
  try {
    console.log('Ensuring function exists (id:', FUNCTION_ID, ')');
    // Try to get the function first
    let exists = true;
    try {
      await functions.get(FUNCTION_ID);
    } catch (e) {
      exists = false;
    }

    if (!exists) {
      console.log('Creating function...');
      // The SDK expects `execute` to be an array of strings (roles). Provide an empty array
      // which means no client-side roles are granted to execute the function.
      await functions.create(FUNCTION_ID, 'import-playlist', RUNTIME, [] , []);
      console.log('Function created.');
    } else {
      console.log('Function already exists. Will create a new deployment.');
    }

    // Create deployment
  console.log('Creating deployment...');
  const fileStream = fs.createReadStream(zipPath);

  // The SDK's createDeployment signature is (functionId, code, activate, entrypoint, commands)
  const deployment = await functions.createDeployment(FUNCTION_ID, fileStream, true);
    console.log('Deployment created:', deployment.$id || deployment);

    // Optionally activate the new deployment
    // Some Appwrite versions require an explicit update to activate a deployment
    try {
      // Some SDK versions expose updateFunctionDeployment, others expect update
      if (functions.updateFunctionDeployment) {
        await functions.updateFunctionDeployment(FUNCTION_ID, deployment.$id);
      } else if (functions.update) {
        // Fallback: call update with the deployment id to switch active deployment
        await functions.update(FUNCTION_ID, 'import-playlist', RUNTIME, [], [], '');
      }
      console.log('Deployment activated.');
    } catch (e) {
      // Not all SDK versions require or support explicit activation via SDK; ignore if not supported
    }

    console.log('Deployment finished. Remove the zip if you wish:', zipPath);

  } catch (err) {
    console.error('Failed to deploy function using SDK:');
    try {
      console.error('Error message:', err.message);
      if (err.response) {
        console.error('Error response:', err.response);
      }
      if (err.response && err.response.data) {
        console.error('Error response data:', err.response.data);
      }
    } catch (ee) {
      console.error('Failed to parse SDK error object:', ee);
      console.error(err);
    }
    console.error('As a fallback, see the README for curl-based deployment steps.');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Unexpected error deploying function:', err);
  process.exit(1);
});

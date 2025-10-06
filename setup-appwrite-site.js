#!/usr/bin/env node

// Appwrite Sites Setup Script for DJAMMS
import https from 'https';

const PROJECT_ID = '68cc86c3002b27e13947';
const API_KEY = 'standard_451b7a70d97754000ffab451c2a59b4442ce00dcb6d97e97aa7e9d7fcd180c54a3fc8553a4befb34d44797587fb423204dbbccef1fab5d096e9656fb8486c16cbe25f4d76a9e26228ad2ad2be1a286509e0760f299e0476416add867b15902dc0d927e33ea440806ad82899e1ac36cc155c06cf402ef719b7d53d59468035a0';
const GITHUB_REPO = 'SystemVirtue/DJAMMS_Appwrite_v2';
const SITE_NAME = 'DJAMMS Web App';
const SITE_ID = 'djamms-web-app';

function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const postData = data ? JSON.stringify(data) : '';

    const options = {
      hostname: 'syd.cloud.appwrite.io',
      port: 443,
      path: `/v1${path}`,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'X-Appwrite-Project': PROJECT_ID,
        'X-Appwrite-Key': API_KEY
      }
    };

    if (postData) {
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

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

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function setupAppwriteSite() {
  console.log('🚀 Setting up DJAMMS Appwrite Site Deployment\n');

  try {
    // Step 1: Check if site already exists
    console.log('1️⃣ Checking if site already exists...');
    const existingSites = await makeRequest('GET', '/sites');
    const existingSite = existingSites.sites?.find(site => site.$id === SITE_ID || site.name === SITE_NAME);

    if (existingSite) {
      console.log(`✅ Site already exists: ${existingSite.name} (${existingSite.$id})`);
      console.log(`🔗 Site URL: https://${existingSite.$id}.appwrite.global`);
      return existingSite;
    }

    // Step 2: Get available frameworks
    console.log('\n2️⃣ Getting available frameworks...');
    const frameworks = await makeRequest('GET', '/sites/frameworks');
    console.log('Frameworks response:', JSON.stringify(frameworks, null, 2));
    const sveltekitFramework = frameworks.frameworks?.find(f =>
      f.name.toLowerCase().includes('svelte') ||
      f.name.toLowerCase().includes('sveltekit')
    );

    if (!sveltekitFramework) {
      console.log('⚠️ SvelteKit framework not found, using default...');
    }

    // Step 3: Create the site
    console.log('\n3️⃣ Creating Appwrite Site...');
    const siteData = {
      siteId: SITE_ID,
      name: SITE_NAME,
      framework: sveltekitFramework?.id || 'sveltekit', // Use SvelteKit if available
      url: `https://${SITE_ID}.appwrite.global`,
      enabled: true,
      buildCommands: [
        'npm install',
        'npm run build'
      ],
      outputDirectory: 'build', // SvelteKit static adapter output
      sourceDirectory: '.', // Root directory
      providerRepositoryUrl: `https://github.com/${GITHUB_REPO}`,
      providerBranch: 'main',
      providerRootDirectory: '',
      providerSilentMode: false
    };

    const newSite = await makeRequest('POST', '/sites', siteData);
    console.log('Site creation response:', JSON.stringify(newSite, null, 2));
    console.log(`✅ Site created: ${newSite.name || 'Unknown'}`);
    console.log(`🔗 Site URL: https://${newSite.$id || 'unknown'}.appwrite.global`);

    // Step 4: Set up environment variables
    console.log('\n4️⃣ Setting up environment variables...');
    const envVars = [
      { key: 'VITE_APPWRITE_ENDPOINT', value: 'https://syd.cloud.appwrite.io/v1' },
      { key: 'VITE_APPWRITE_PROJECT_ID', value: PROJECT_ID },
      { key: 'VITE_APPWRITE_DATABASE_ID', value: '68cc92d30024e1b6eeb6' }
    ];

    for (const envVar of envVars) {
      try {
        await makeRequest('POST', `/sites/${newSite.$id}/variables`, envVar);
        console.log(`✅ Set ${envVar.key}`);
      } catch (error) {
        console.log(`⚠️ Failed to set ${envVar.key}: ${error.message}`);
      }
    }

    // Step 5: Create initial deployment
    console.log('\n5️⃣ Creating initial deployment...');
    const deploymentData = {
      source: 'vcs',
      branch: 'main',
      commit: '', // Let Appwrite detect the latest commit
      activate: true
    };

    const deployment = await makeRequest('POST', `/sites/${newSite.$id}/deployments/vcs`, deploymentData);
    console.log(`✅ Initial deployment created: ${deployment.$id}`);

    console.log('\n🎉 Appwrite Site setup completed!');
    console.log(`\n📋 Site Details:`);
    console.log(`Name: ${newSite.name}`);
    console.log(`ID: ${newSite.$id}`);
    console.log(`URL: https://${newSite.$id}.appwrite.global`);
    console.log(`Framework: ${newSite.framework}`);
    console.log(`Repository: https://github.com/${GITHUB_REPO}`);
    console.log(`Branch: main`);

    console.log('\n📝 Next Steps:');
    console.log('1. Push this code to GitHub repository');
    console.log('2. Appwrite will automatically deploy on pushes to main branch');
    console.log('3. Check deployment status in Appwrite Console');
    console.log('4. Access your site at the URL above');

    return newSite;

  } catch (error) {
    console.error('❌ Error setting up Appwrite Site:', error.message);
    if (error.message.includes('framework')) {
      console.log('\n💡 Available frameworks:');
      try {
        const frameworks = await makeRequest('GET', '/sites/frameworks');
        frameworks.frameworks?.forEach(f => {
          console.log(`  - ${f.name} (${f.id})`);
        });
      } catch (e) {
        console.log('  Could not fetch frameworks');
      }
    }
    throw error;
  }
}

setupAppwriteSite().catch(console.error);
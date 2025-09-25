# Collection Creation Setup Guide

## 🔐 Environment Configuration

### Step 1: Copy Environment Template
```bash
cp .env.example .env
```

### Step 2: Get Your Appwrite Credentials

1. **Go to Appwrite Console** → Your Project

2. **Get Project ID:**
   - Found in the top-left or Overview section
   - Copy and paste into `APPWRITE_PROJECT_ID`

3. **Get Database ID:**
   - Go to Databases section
   - Your database is likely called `djamms_db`
   - Copy the ID and paste into `APPWRITE_DATABASE_ID`

4. **Create API Key:**
   - Go to **Overview** → **Integrate with your server**
   - Click **API Keys** → **Create API Key**
   - Set the following permissions:
     - ✅ Database: Read, Write, Create, Update, Delete
     - ✅ Collections: Read, Write, Create, Update, Delete
   - Copy the generated key to `APPWRITE_API_KEY`

### Step 3: Update .env File

Your `.env` should look like:
```env
# Appwrite Configuration (Client-side)
VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=64a7b2c8d9e1f23456789
VITE_APPWRITE_DATABASE_ID=djamms_db

# Appwrite Configuration (Server-side for collection creation)
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=64a7b2c8d9e1f23456789
APPWRITE_DATABASE_ID=djamms_db
APPWRITE_API_KEY=standard_a1b2c3d4e5f6789...

# YouTube API
VITE_YOUTUBE_API_KEY=your_youtube_api_key_here

# Environment
NODE_ENV=development
```

## 🚀 Running the Collection Creation Script

### Install dotenv (if not already installed):
```bash
npm install dotenv
```

### Run the script:
```bash
node scripts/create-collections.js
```

### What the script does:
- ✅ Creates 5 new collections with proper attributes
- ✅ Sets up indexes for optimal performance
- ✅ Handles enum types for dropdowns
- ✅ Configures proper data types and constraints
- ✅ Provides detailed progress feedback

## 🔍 Verification

After running the script:

1. **Check Appwrite Console**
   - Go to Databases → djamms_db
   - Verify all 5 collections are created
   - Check that attributes and indexes are properly configured

2. **Collections Created:**
   - `user_queues` - Queue management
   - `user_instance_settings` - User preferences
   - `enhanced_playlists` - Rich playlist data
   - `user_play_history` - Analytics tracking
   - `user_playlist_favorites` - Favorites system

## 🛠️ Troubleshooting

**Permission Error:**
- Ensure your API key has Database and Collections permissions

**Collection Already Exists:**
- Script will attempt to add missing attributes and indexes
- Safe to re-run

**Attribute Creation Fails:**
- Check database limits and constraints
- Verify attribute names don't conflict with reserved words

## 🎯 Next Steps

Once collections are created:
1. Verify in Appwrite Console
2. Configure collection permissions
3. Update TypeScript interfaces
4. Integrate with DJAMMS services
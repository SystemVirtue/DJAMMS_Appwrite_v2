# DJAMMS Appwrite Setup Guide

## Quick Start - Setting up Appwrite for DJAMMS

### Step 1: Create Appwrite Account
1. Go to [https://appwrite.io/](https://appwrite.io/)
2. Sign up for a free account
3. Choose "Cloud" for hosted solution (recommended)

### Step 2: Create a New Project
1. Click "Create Project" in your Appwrite console
2. Name your project (e.g., "DJAMMS")
3. Copy the **Project ID** - you'll need this

### Step 3: Configure Authentication
1. Go to **Auth** section in your project
2. Click **Settings** tab
3. Add these URLs to **Success URLs**:
   ```
   http://localhost:5173/dashboard
   http://localhost:5174/dashboard
   ```
4. Add these URLs to **Failure URLs**:
   ```
   http://localhost:5173/auth/error  
   http://localhost:5174/auth/error
   ```

### Step 4: Enable Google OAuth
1. In **Auth** section, go to **Providers** tab
2. Find "Google" and click the settings icon
3. Toggle "Enabled" to ON
4. You need Google OAuth credentials:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing
   - Enable Google+ API
   - Create OAuth 2.0 credentials
   - Add these redirect URIs:
     ```
     https://cloud.appwrite.io/v1/account/sessions/oauth2/callback/google/YOUR_PROJECT_ID
     ```
   - Copy **Client ID** and **Client Secret** to Appwrite

### Step 5: Create Database and Collections
1. Go to **Databases** section
2. Click "Create Database"
3. Name it "djamms_db" and copy the **Database ID**
4. Create these collections:

#### Collection: `media_instances`
```javascript
// Attributes to add:
{
  "type": { type: "string", required: true },
  "user_id": { type: "string", required: true },
  "name": { type: "string", required: true },
  "description": { type: "string", required: false },
  "settings": { type: "string", required: false }, // JSON string
  "status": { type: "string", required: true },
  "last_active": { type: "datetime", required: false }
}
```

#### Collection: `instance_states`
```javascript
// Attributes to add:
{
  "instance_id": { type: "string", required: true },
  "current_track": { type: "string", required: false }, // JSON string
  "queue": { type: "string", required: false }, // JSON string
  "playback_state": { type: "string", required: false }, // JSON string
  "modes": { type: "string", required: false }, // JSON string
  "user_id": { type: "string", required: true }
}
```

#### Collection: `playlists`
```javascript
// Attributes to add:
{
  "user_id": { type: "string", required: true },
  "name": { type: "string", required: true },
  "description": { type: "string", required: false },
  "is_public": { type: "boolean", required: true },
  "tracks": { type: "string", required: false }, // JSON string
  "thumbnail": { type: "string", required: false }
}
```

### Step 6: Set Collection Permissions
For each collection, set these permissions:
- **Create**: `role:member` (authenticated users)
- **Read**: `role:member` 
- **Update**: `role:member`
- **Delete**: `role:member`

### Step 7: Update Your Environment Variables
Edit your `.env` file:
```env
VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=your_actual_project_id_here
VITE_APPWRITE_DATABASE_ID=your_actual_database_id_here
```

### Step 8: Restart Development Server
```bash
npm run dev
```

## Testing the Setup

1. Open http://localhost:5173 (or 5174)
2. Click "Continue with Google"
3. You should be redirected to Google OAuth
4. After successful login, you'll be redirected to /dashboard

## Troubleshooting

### Common Issues:

1. **412 Precondition Failed**
   - Project ID is missing or incorrect
   - Check your .env file

2. **CORS Errors**
   - Add your localhost URLs to Appwrite platform settings
   - Go to Settings → Platforms → Add Platform → Web App
   - Add: http://localhost:5173 and http://localhost:5174

3. **OAuth Redirect Errors**
   - Verify success/failure URLs in Auth settings
   - Check Google OAuth redirect URIs

4. **Database Connection Errors**
   - Verify database ID in .env
   - Check collection names match exactly
   - Ensure proper permissions are set

## Security Notes

- Never commit your actual .env file to version control
- Use .env.example for sharing configuration template
- In production, use proper environment variable management
- Consider using Appwrite API keys for server-side operations

## Next Steps

Once Appwrite is configured:
1. Test user authentication
2. Implement instance creation
3. Add playlist management
4. Set up real-time subscriptions for multi-window sync

For more help, check the [Appwrite Documentation](https://appwrite.io/docs)
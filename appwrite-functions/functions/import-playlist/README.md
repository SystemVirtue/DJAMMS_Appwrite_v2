import-playlist Appwrite Function

Purpose
- Fetch tracks from a public YouTube playlist and store them into the `tracks` field of a playlist document in Appwrite.

Payload
- The function expects a JSON payload:
  {
    "playlistId": "<playlist document id in Appwrite>",
    "playlistUrl": "https://www.youtube.com/playlist?list=..."
  }

Environment variables (set in the Appwrite Function settings):
- APPWRITE_ENDPOINT: Appwrite endpoint (e.g. https://cloud.appwrite.io/v1)
- APPWRITE_PROJECT_ID: Appwrite project id
- APPWRITE_API_KEY: Appwrite service key (with permissions to update the playlists collection)
- APPWRITE_DATABASE_ID: Database id used by the project
- APPWRITE_PLAYLISTS_COLLECTION_ID: Collection id for playlists (e.g. 'playlists')
- YOUTUBE_API_KEY: YouTube Data API key

Usage
- Deploy this function to Appwrite and give it the name `import-playlist`.
- When creating the global playlist (in the web app), the code will call this function with the playlist doc id and playlist URL to import tracks in the background.

Notes
- This function paginates through YouTube playlistItems and stores simplified Track objects.
- Duration is left as 0 in this scaffold; you may fetch video details to populate durations if needed.

Deploy using SDK (optional)
1. From this folder, install deps and run the deploy helper script (it zips the folder and uses Appwrite SDK):

```bash
npm install
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1 \
APPWRITE_PROJECT_ID=<PROJECT_ID> \
APPWRITE_API_KEY=<SERVICE_KEY> \
APPWRITE_RUNTIME=node-18.0 \
node deploy.js
```

2. The helper expects the Appwrite SDK environment variables to be set. It will create the function (id `import-playlist`) if it doesn't exist and create a deployment from the zipped folder.

Manual curl-based deployment
- You can also deploy manually using Appwrite's REST API — see Appwrite docs for function deployment endpoints.

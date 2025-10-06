const { Client, Databases } = require('node-appwrite');

const DB_ID = process.env.APPWRITE_DATABASE_ID || '68cc92d30024e1b6eeb6';
const COLLECTION_ID = 'users';

const client = new Client()
  .setEndpoint(process.env.APPWRITE_FUNCTION_ENDPOINT || process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID || process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY);

const databases = new Databases(client);

async function handler(req, res) {
  try {
    const list = await databases.listDocuments(DB_ID, COLLECTION_ID);
    const docs = list.documents || [];
    console.log(`Found ${docs.length} documents`);
    for (const doc of docs) {
      const id = doc.$id;
      let prefs = doc.prefs;
      if (prefs == null || typeof prefs === 'string') {
        if (prefs == null) prefs = '{}';
      } else {
        prefs = JSON.stringify(prefs);
      }
      if (prefs.length > 65535) prefs = prefs.slice(0, 65535);
      if (String(doc.prefs) !== prefs) {
        console.log(`Updating ${id}: prefs length ${String(doc.prefs).length || 0} -> ${prefs.length}`);
        await databases.updateDocument(DB_ID, COLLECTION_ID, id, { prefs: prefs });
      } else {
        console.log(`No change needed for ${id}`);
      }
    }
    res.json({ success: true, migrated: docs.length });
  } catch (err) {
    console.error('Migration error', err);
    res.json({ success: false, error: String(err) });
  }
}

module.exports = handler;

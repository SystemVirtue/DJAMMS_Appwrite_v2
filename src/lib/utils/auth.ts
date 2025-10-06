/**
 * Temporary auth utilities
 * - Centralizes extraction of owner/admin context from incoming requests.
 * - Intended as a stop-gap until full JWT validation and auth middleware are implemented.
 */

// Using `any` for Request in this lightweight helper to avoid tight coupling with SvelteKit types.
export interface AuthContext {
  ownerId?: string | null;
  bearer?: string | null;
}

export function getAuthContext(request: any): AuthContext {
  // Prefer Authorization Bearer token if present
  const authHeader = request.headers.get('authorization');
  const bearer = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  // Temporary owner header support
  const ownerId = request.headers.get('x-owner-id');

  return {
    ownerId: ownerId || null,
    bearer: bearer || null
  };
}

/**
 * Rudimentary permission check: returns true if auth context indicates owner or admin.
 * NOTE: This is a stop-gap. Replace with JWT verification and permission checks.
 */
// Verify Appwrite JWT by calling the Appwrite account endpoint.
// Simple in-memory cache for verified JWTs
const jwtCache: Map<string, { payload: any; expiresAt: number }> = new Map();
const JWT_CACHE_TTL_MS = Number(process.env.TEST_JWT_CACHE_TTL_MS || 60000); // default 60s

export async function verifyAppwriteJWT(token: string | null): Promise<any | null> {
  if (!token) return null;
  const now = Date.now();
  const cached = jwtCache.get(token);
  if (cached && cached.expiresAt > now) return cached.payload;

  try {
    const endpoint = (typeof process !== 'undefined' && (process.env.APPWRITE_ENDPOINT as string)) || (import.meta.env?.VITE_APPWRITE_ENDPOINT as string) || 'https://cloud.appwrite.io/v1';
    const project = (typeof process !== 'undefined' && (process.env.APPWRITE_PROJECT_ID as string)) || (import.meta.env?.VITE_APPWRITE_PROJECT_ID as string) || '';
    // Call Appwrite account endpoint (/v1/account)
    const res = await fetch(`${endpoint.replace(/\/$/, '')}/v1/account`, {
      method: 'GET',
      headers: {
        'X-Appwrite-JWT': token,
        'X-Appwrite-Project': project,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) return null;
    const data = await res.json();

    jwtCache.set(token, { payload: data, expiresAt: now + JWT_CACHE_TTL_MS });
    // Best-effort cleanup to avoid unbounded growth
    if (jwtCache.size > 1000) {
      for (const [k, v] of jwtCache.entries()) if (v.expiresAt <= now) jwtCache.delete(k);
    }

    return data;
  } catch (err) {
    console.warn('verifyAppwriteJWT error:', err);
    return null;
  }
}

export async function isOwnerOrAdmin(auth: AuthContext, venue: any): Promise<boolean> {
  if (!auth) return false;

  // If an ownerId header was provided and matches the venue.owner_id, allow.
  if (auth.ownerId && venue && (auth.ownerId === venue.owner_id || auth.ownerId === venue.ownerId)) return true;

  // If bearer token exists, verify with Appwrite and compare account id to venue owner.
  if (auth.bearer) {
    const account = await verifyAppwriteJWT(auth.bearer);
    if (account && venue) {
      // Appwrite account returns $id
      if (account.$id && (account.$id === venue.owner_id || account.$id === venue.ownerId)) return true;
      // Allow email-based admin overrides if configured (simple fallback)
      const adminEmails = (typeof process !== 'undefined' && (process.env.DJAMMS_ADMIN_EMAILS as string)) || '';
      const admins = adminEmails ? adminEmails.split(',').map((s: string) => s.trim()) : [];
      if (account.email && admins.includes(account.email)) return true;
    }
  }

  return false;
}

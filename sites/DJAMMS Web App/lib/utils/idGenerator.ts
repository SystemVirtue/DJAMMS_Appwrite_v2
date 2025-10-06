/**
 * Generates Appwrite-compatible document IDs
 * 
 * Appwrite document ID constraints:
 * - Maximum 36 characters
 * - Valid chars: a-z, A-Z, 0-9, period, hyphen, underscore
 * - Cannot start with special character
 * 
 * @param prefix Short prefix for the ID type (e.g., "dash", "player", "queue")
 * @param maxLength Maximum total length (default: 36)
 * @returns A valid Appwrite document ID
 */
export function generateAppwriteId(prefix: string = "", maxLength: number = 36): string {
    // Use last 8 digits of timestamp for uniqueness while keeping it short
    const timestamp = Date.now().toString().slice(-8);
    
    // Generate shorter random string
    const randomStr = Math.random().toString(36).substr(2, 6);
    
    // Combine with prefix, ensuring we don't exceed maxLength
    const baseId = prefix ? `${prefix}-${timestamp}-${randomStr}` : `${timestamp}-${randomStr}`;
    
    // Truncate if necessary (shouldn't happen with our short format)
    return baseId.length > maxLength ? baseId.substring(0, maxLength) : baseId;
}

/**
 * Generate instance IDs for different component types
 */
export const InstanceIds = {
    dashboard: () => generateAppwriteId("dash"),
    player: () => generateAppwriteId("play"),
    queue: () => generateAppwriteId("queue"),
    playlist: () => generateAppwriteId("list"),
    admin: () => generateAppwriteId("admin"),
    tab: () => generateAppwriteId("tab"),
    window: () => generateAppwriteId("win"),
    session: () => generateAppwriteId("sess"),
    background: () => generateAppwriteId("bg"),
    user: () => generateAppwriteId("usr"),
    queueManagerTab: () => generateAppwriteId("qtab")
};
# DJAMMS - Copilot Instructions

## Project Overview
DJAMMS (Digital Jukebox and Media Management System) is a comprehensive YouTube music video player and media manager built with SvelteKit, TypeScript, and Appwrite backend. Currently undergoing migration to a simplified architecture consolidating state management and reducing complexity.

## Architecture
- **Multi-window application** with real-time synchronization
- **Venue-centric architecture** where each venue serves as the central hub for player instances and state
- **SvelteKit frontend** with TypeScript and Tailwind CSS
- **Appwrite backend** for authentication, database, functions, and real-time features

## Simplified Architecture (Migration Target)
**Consolidate from 5 to 4 collections with venue-centric state management:**
- **venues**: Central hub for player state, queues, and settings (consolidates media_instances + active_queues + instance_states)
- **users**: User profiles and preferences
- **playlists**: Playlist collections with tracks as JSON arrays
- **activity_log**: Immutable audit trail of all system events

**5 Core Appwrite Functions:**
1. Auth & Setup Handler - User provisioning and venue creation
2. Player & Venue State Manager - Real-time player state updates and queue management
3. Playlist & Content Manager - Playlist CRUD and content operations
4. UI Command & Sync Hub - UI commands with real-time broadcasting
5. Scheduler & Maintenance Agent - Background tasks and cleanup

## Key Components
- `/` - Homepage with Google OAuth authentication
- `/dashboard` - Main interface with navigation cards
- `/videoplayer` - YouTube video player window
- `/queuemanager` - Playlist and queue management
- `/playlistlibrary` - Playlist CRUD operations
- `/adminconsole` - Player preferences and customization

## Tech Stack
- **Frontend**: SvelteKit v2.x, TypeScript, Tailwind CSS, Skeleton UI
- **Backend**: Appwrite Cloud (auth, database, functions, realtime)
- **Icons**: Lucide Svelte
- **Testing**: Playwright

## Database Schema (Simplified)
- `venues` - Central hub: now_playing (JSON), active_queue (JSON array), player_settings (JSON), heartbeat monitoring
- `users` - Profiles: email, role, preferences (JSON), venue association
- `playlists` - Collections: tracks (JSON array), metadata, sharing controls
- `activity_log` - Audit: event_type, event_data (JSON), timestamps

## Development Patterns
- Use unified DJAMMS store for venue-centric state management (replacing multiple stores)
- Follow SvelteKit file-based routing with venue-aware components
- Implement reactive UI with Appwrite real-time subscriptions per venue
- Use TypeScript interfaces for type safety, especially for JSON structures
- Apply glass-morphism design with dark theme
- Direct Appwrite SDK calls from stores (eliminate service layers)
- Venue-based real-time broadcasting for multi-window sync

## Environment Setup
- Requires Node.js 18+
- Appwrite project configuration needed
- Google OAuth setup for authentication
- Migration scripts in `/scripts/` for database transitions

## Player Status States
- CONNECTED (LOCAL/REMOTE), PLAYING/PAUSED
- NO CONNECTED PLAYER
- SERVER ERROR

When working on this project, focus on the venue-centric architecture, real-time synchronization, and YouTube Music-inspired design. During migration, maintain backward compatibility while implementing the simplified schema.
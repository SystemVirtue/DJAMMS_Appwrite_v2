# DJAMMS Tech Stack & Codebase Structure

## Table of Contents
- [Tech Stack Overview](#tech-stack-overview)
- [Project Structure](#project-structure)
- [Directory Breakdown](#directory-breakdown)
- [Key File Descriptions](#key-file-descriptions)
- [Architecture Patterns](#architecture-patterns)

## Tech Stack Overview

### Frontend Framework
- **SvelteKit 2.x**: Full-stack web framework
- **TypeScript**: Static type checking and enhanced developer experience
- **Vite**: Build tool and development server

### Styling & UI
- **Tailwind CSS**: Utility-first CSS framework
- **Skeleton UI**: Pre-built Svelte components
- **Lucide Svelte**: Icon library

### Backend & Database
- **Appwrite Cloud**: Backend-as-a-Service platform
  - Authentication (Google OAuth)
  - Database (NoSQL collections)
  - Real-time subscriptions
  - Cloud functions

### Development & Testing
- **Playwright**: End-to-end testing framework
- **TypeScript Compiler**: Type checking
- **Svelte Check**: Svelte-specific type checking
- **ESLint + Prettier**: Code formatting and linting

## Project Structure

```
DJAMMS_Appwrite_v2/
├── .github/
│   └── copilot-instructions.md        # GitHub Copilot configuration
├── Documentation/                      # Project documentation
├── scripts/                           # Database and utility scripts
├── src/                              # Source code
│   ├── app.html                      # HTML template
│   ├── app.postcss                   # Global styles
│   ├── lib/                          # Shared libraries
│   │   ├── components/               # Reusable Svelte components
│   │   ├── services/                 # Business logic services
│   │   ├── stores/                   # Svelte stores for state management
│   │   ├── types/                    # TypeScript type definitions
│   │   └── utils/                    # Utility functions
│   └── routes/                       # SvelteKit routes (pages)
├── static/                           # Static assets
├── tests/                            # Playwright test files
├── package.json                      # Node.js dependencies and scripts
├── playwright.config.ts              # Playwright configuration
├── svelte.config.js                  # Svelte/SvelteKit configuration
├── tailwind.config.js                # Tailwind CSS configuration
├── tsconfig.json                     # TypeScript configuration
└── vite.config.js                    # Vite configuration
```

## Directory Breakdown

### `/src/lib/components/`
```
components/
├── EnhancedFeaturesDemo.svelte       # Advanced features demonstration
├── PlaylistManager.svelte            # Playlist management interface
├── QueueDisplay.svelte              # Priority queue visualization
└── VolumeControl.svelte             # Volume control widget
```

### `/src/lib/services/`
```
services/
├── BackgroundQueueManager.ts        # Automated queue progression
├── enhancedPlaylistService.ts       # Advanced playlist operations
├── index.ts                         # Service exports
├── jukeboxService.ts               # Core jukebox functionality
├── playlistMigrationService.ts      # Data migration utilities
├── playlistService.ts              # Basic playlist operations
├── playerSync.ts                   # Multi-window synchronization
├── userPlayHistoryService.ts       # User interaction tracking
├── userPlaylistFavoritesService.ts # User preferences
└── windowManager.ts                # Window management utilities
```

### `/src/lib/stores/`
```
stores/
├── auth.ts                         # Authentication state
├── jukebox.ts                      # Core jukebox state management
├── player.ts                       # Player status and sync
└── playlist.ts                     # Playlist state management
```

### `/src/lib/types/`
```
types/
├── index.ts                        # Type exports
└── jukebox.ts                      # Core type definitions
```

### `/src/lib/utils/`
```
utils/
└── appwrite.ts                     # Appwrite client configuration
```

### `/src/routes/`
```
routes/
├── +layout.svelte                  # Application layout
├── +layout.ts                      # Layout data loading
├── +page.svelte                    # Homepage (authentication)
├── +page.ts                        # Homepage data loading
├── adminconsole/                   # Admin interface
├── background-queue-test/          # Queue testing interface
├── dashboard/                      # Main dashboard
├── dashboard-enhanced/             # Enhanced dashboard features
├── playlistlibrary/               # Playlist management
├── queuemanager/                  # Queue management interface
├── queuemanager-enhanced/         # Enhanced queue features
├── test-debug/                    # Debug utilities
├── test-jukebox/                  # Jukebox testing
├── videoplayer/                   # Basic video player
└── videoplayer-enhanced/          # Enhanced video player
```

### `/scripts/`
```
scripts/
├── create-minimal-collections.js   # Database collection creation
├── delete-and-recreate-collections.js # Database reset utility
└── create-missing-collections.js   # Collection verification and creation
```

### `/tests/`
```
tests/
├── console-monitor.spec.ts         # Console error monitoring
├── enhanced-collections.spec.ts    # Database testing
├── global-setup.ts                # Test environment setup
├── global-teardown.ts             # Test cleanup
├── multi-window.spec.ts           # Multi-window functionality
├── player-sync.spec.ts            # Player synchronization tests
├── real-time-sync.spec.ts         # Real-time feature tests
└── test-helpers.ts                # Testing utilities
```

## Key File Descriptions

### Core Application Files

#### `src/app.html`
HTML template that wraps the entire SvelteKit application. Contains meta tags, title, and the root div where the app mounts.

#### `src/app.postcss`
Global CSS file that imports Tailwind CSS utilities and defines custom styles for the glass-morphism dark theme.

#### `src/routes/+layout.svelte`
Root layout component that provides:
- Authentication state management
- Global navigation structure
- Consistent styling and theme
- Error boundary handling

### Service Layer

#### `src/lib/services/jukeboxService.ts`
Core service managing all jukebox functionality:
- Jukebox state CRUD operations
- Priority queue management
- Memory playlist handling
- Real-time subscription management

#### `src/lib/services/BackgroundQueueManager.ts`
Automated queue progression system:
- Monitors video end events
- Automatically advances queue
- Manages playlist cycling
- Handles error recovery

#### `src/lib/services/playerSync.ts`
Multi-window synchronization:
- Cross-window communication
- Player state broadcasting
- Instance coordination
- Real-time updates

### State Management

#### `src/lib/stores/jukebox.ts`
Central state store for jukebox functionality:
- Current track information
- Player controls state
- Queue status
- Volume and position

#### `src/lib/stores/auth.ts`
Authentication state management:
- User session handling
- Google OAuth integration
- Authentication status
- User profile data

### Configuration Files

#### `svelte.config.js`
SvelteKit configuration:
- Adapter settings (auto)
- Preprocessing options
- TypeScript integration
- Build optimizations

#### `playwright.config.ts`
End-to-end testing configuration:
- Browser settings
- Test environment setup
- Global setup/teardown
- Reporter configuration

#### `tailwind.config.js`
Tailwind CSS customization:
- Custom color palette
- Dark theme configuration
- Glass-morphism utilities
- Responsive breakpoints

## Architecture Patterns

### Multi-Window Architecture
- Each player window has unique instance ID
- Real-time synchronization across all instances
- Central state coordination through Appwrite
- Event-driven communication between windows

### Service-Oriented Design
- Business logic separated into focused services
- Dependency injection for testability
- Clear separation of concerns
- Modular and maintainable architecture

### Reactive State Management
- Svelte stores for reactive updates
- Derived stores for computed values
- Real-time database synchronization
- Event-driven state changes

### Type-Safe Development
- Comprehensive TypeScript interfaces
- Strict type checking enabled
- Runtime type validation
- IDE support with IntelliSense

### Component-Based UI
- Reusable Svelte components
- Props-based communication
- Event dispatching pattern
- Slot-based composition
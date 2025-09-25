# DJAMMS Playwright Test Suite

This directory contains comprehensive end-to-end tests for DJAMMS (Digital Jukebox and Media Management System) using Playwright.

## Test Coverage

### 1. Enhanced Database Collections (`enhanced-collections.spec.ts`)
- **User Queue Management**: Tests queue operations, shuffle/repeat controls, and persistence
- **User Instance Settings**: Tests user preferences, theme settings, volume controls
- **Enhanced Playlists**: Tests playlist creation with metadata, categories, and search
- **User Play History**: Tests playback tracking and analytics
- **User Playlist Favorites**: Tests favoriting system and ratings

### 2. Multi-Window Functionality (`multi-window.spec.ts`)
- **Video Player Window**: Tests opening and controlling the video player
- **Playlist Library Window**: Tests playlist management interface
- **Queue Manager Window**: Tests queue operations and controls
- **Multiple Windows**: Tests simultaneous operation of all windows
- **Instance Synchronization**: Tests data consistency across windows
- **Navigation**: Tests window navigation between different sections

### 3. Playlist Migration System (`playlist-migration.spec.ts`)
- **Legacy Detection**: Tests detection of legacy playlists
- **Auto-Categorization**: Tests smart categorization of playlists
- **Individual Migration**: Tests single playlist migration with metadata
- **Batch Migration**: Tests bulk migration operations
- **Data Preservation**: Tests that playlist data is preserved during migration
- **Error Handling**: Tests graceful error handling during migration
- **Progress Tracking**: Tests migration status and progress reporting
- **Rollback**: Tests migration rollback functionality

### 4. Real-time Synchronization (`real-time-sync.spec.ts`)
- **Queue Sync**: Tests queue changes synchronized between windows
- **Playback State**: Tests playback state consistency across windows
- **Playlist Changes**: Tests playlist modifications synchronized
- **User Settings**: Tests settings changes reflected everywhere
- **Connection Recovery**: Tests handling of network interruptions
- **Instance States**: Tests instance state synchronization
- **Multiple Users**: Tests multi-user scenarios
- **Rapid Changes**: Tests sync during rapid UI interactions

## Setup and Configuration

### Prerequisites
- Node.js 18+
- Playwright installed (`@playwright/test` in devDependencies)
- DJAMMS development server running on localhost:5173

### Environment Variables
- `PUBLIC_APPWRITE_ENDPOINT`: Appwrite server endpoint
- `PUBLIC_APPWRITE_PROJECT_ID`: Appwrite project ID
- `TEST_USER_EMAIL`: Test user email for authentication
- `TEST_USER_PASSWORD`: Test user password

### Running Tests

```bash
# Run all tests
npm run test

# Run specific test file
npx playwright test enhanced-collections.spec.ts

# Run tests in headed mode (visible browser)
npx playwright test --headed

# Run tests with debug mode
npx playwright test --debug

# Generate test report
npx playwright show-report
```

## Test Helper Functions

The `test-helpers.ts` file provides utility functions:

- `authenticateWithGoogle()`: Handles Google OAuth authentication flow
- `setupAppwriteSession()`: Sets up mock Appwrite session for testing
- `openNewWindow()`: Opens new browser windows for multi-window testing
- `waitForPageLoad()`: Ensures pages are fully loaded before testing
- `createTestPlaylist()`: Creates test playlists for testing
- `addTrackToPlaylist()`: Adds tracks to playlists
- `generateTestVideoId()`: Generates test YouTube video IDs
- `cleanupTestData()`: Cleans up test data after each test

## Test Architecture

### Global Setup (`global-setup.ts`)
- Initializes test environment
- Sets up Appwrite client for test operations
- Prepares test user credentials

### Global Teardown (`global-teardown.ts`)
- Cleans up test data from Appwrite collections
- Ensures clean state after test runs

### Multi-Window Testing Strategy
- Uses browser contexts to simulate multiple windows/tabs
- Tests real-time synchronization between windows
- Verifies data consistency across the DJAMMS instance

## Browser Support

Tests run on:
- Chromium (Chrome/Edge)
- Firefox
- WebKit (Safari)

## Continuous Integration

The test suite is configured for CI environments:
- Automatic retry on failures
- HTML report generation
- Screenshot and video capture on failures
- Parallel test execution where safe

## Mock Data and Test Scenarios

### Test Playlists
- Generated with realistic metadata
- Include various categories (rock, pop, jazz, etc.)
- Test different moods and descriptions

### Test Tracks
- Uses generated YouTube video IDs
- Includes various track metadata
- Tests different video formats and lengths

### User Scenarios
- Single user with multiple windows
- Multiple users with shared instances
- Offline/online connectivity scenarios
- Rapid interaction scenarios

## Troubleshooting

### Common Issues

1. **Authentication Failures**
   - Ensure test user credentials are configured
   - Check Appwrite project settings
   - Verify Google OAuth configuration

2. **Real-time Sync Issues**
   - Check Appwrite realtime subscriptions
   - Verify network connectivity
   - Increase timeout values for slow networks

3. **Multi-Window Issues**
   - Ensure popup blockers are disabled
   - Check browser context isolation
   - Verify localStorage/sessionStorage handling

### Debug Tips

- Use `--headed` flag to see tests running
- Add `page.pause()` in tests to inspect state
- Check browser console for JavaScript errors
- Use Playwright trace viewer for detailed debugging

## Contributing to Tests

When adding new features to DJAMMS:

1. Add corresponding tests to relevant spec files
2. Update test helpers if new utilities are needed
3. Ensure tests cover both positive and negative scenarios
4. Test multi-window scenarios for new features
5. Verify real-time synchronization for shared data

## Performance Considerations

- Tests use `waitForTimeout()` sparingly and prefer event-based waits
- Network requests are optimized to avoid unnecessary delays
- Parallel execution is used where tests don't interfere
- Test data cleanup prevents accumulation of test artifacts
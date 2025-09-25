# DJAMMS - Digital Jukebox and Media Management System v2

A comprehensive YouTube music video player and media manager built with SvelteKit, TypeScript, Tailwind CSS, and Appwrite backend. DJAMMS features a multi-window architecture with real-time synchronization for the ultimate music management experience.

## 🎵 Features

### Multi-Window Architecture
- **Homepage** - Google OAuth authentication and welcome interface
- **Dashboard** - Central control panel with 4 main interface cards
- **Video Player** - Fullscreen YouTube video player with custom controls
- **Queue Manager** - Playlist and queue management interface
- **Playlist Library** - CRUD operations for playlist management
- **Admin Console** - Player preferences and customization settings

### Core Functionality
- **Instance-based Management** - Each player has a unique identifier
- **Real-time Synchronization** - Instant updates across all windows
- **Google OAuth Authentication** - Secure login via Appwrite
- **YouTube Integration** - Full YouTube video playback support
- **Player Status Tracking** - Real-time connection status across windows
- **Responsive Design** - Dark theme with glass-morphism effects

### Player Status States
- `CONNECTED (LOCAL), PLAYING/PAUSED` - Local player window active
- `CONNECTED (REMOTE), PLAYING/PAUSED` - Remote player window active
- `NO CONNECTED PLAYER` - No player window currently open
- `SERVER ERROR` - Unable to determine player status

## 🛠️ Tech Stack

### Frontend
- **Framework**: SvelteKit v2.x with Svelte 4.2.7
- **Language**: TypeScript
- **Styling**: Tailwind CSS + PostCSS
- **UI Components**: Skeleton UI
- **Icons**: Lucide Svelte
- **Build Tool**: Vite
- **Testing**: Playwright

### Backend
- **Platform**: Appwrite Cloud
- **Authentication**: Appwrite Sessions (Google OAuth)
- **Database**: Appwrite Databases (NoSQL)
- **Real-time**: Appwrite Realtime (WebSocket)
- **Functions**: Appwrite Functions (Node.js serverless)

### Database Collections
- `media_instances` - Instance management and settings
- `instance_states` - Real-time playback state
- `playlists` - User playlist data

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Appwrite Cloud account
- Google OAuth application (for authentication)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd DJAMMS_Appwrite_v2
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env
   ```
   
   Update `.env` with your configuration:
   ```env
   VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
   VITE_APPWRITE_PROJECT_ID=your_project_id
   VITE_APPWRITE_DATABASE_ID=your_database_id
   VITE_YOUTUBE_API_KEY=your_youtube_api_key
   ```

4. **Appwrite Setup**
   - Create a new Appwrite project
   - Set up Google OAuth provider
   - Create database with required collections:
     - `media_instances`
     - `instance_states`
     - `playlists`
   - Configure collection permissions for authenticated users

5. **Run Development Server**
   ```bash
   npm run dev
   ```
   
   Open [http://localhost:5173](http://localhost:5173) in your browser.

## 🏗️ Project Structure

```
DJAMMS_Appwrite_v2/
├── src/
│   ├── lib/
│   │   ├── components/     # Reusable Svelte components
│   │   ├── stores/         # Svelte stores for state management
│   │   ├── utils/          # Utility functions and Appwrite config
│   │   └── types.ts        # TypeScript interfaces
│   ├── routes/
│   │   ├── +layout.svelte  # Main application layout
│   │   ├── +page.svelte    # Homepage with authentication
│   │   ├── dashboard/      # Dashboard interface
│   │   ├── videoplayer/    # YouTube video player
│   │   ├── queuemanager/   # Queue management interface
│   │   ├── playlistlibrary/# Playlist management
│   │   └── adminconsole/   # Admin settings
│   ├── app.html           # HTML template
│   ├── app.d.ts           # TypeScript declarations
│   └── app.postcss       # Global styles
├── static/                # Static assets
├── .github/              # GitHub configuration
├── package.json          # Dependencies and scripts
├── tailwind.config.js    # Tailwind CSS configuration
├── svelte.config.js      # SvelteKit configuration
└── vite.config.ts        # Vite configuration
```

## 🎮 Usage

### Authentication
1. Visit the homepage
2. Click "Continue with Google"
3. Complete OAuth flow
4. Redirected to dashboard

### Multi-Window Management
1. **Start Video Player** - Opens fullscreen YouTube player
2. **Open Queue Manager** - Manage current playlist and queue
3. **Playlist Library** - Create and organize playlists  
4. **Admin Console** - Configure player settings

### Keyboard Shortcuts (Video Player)
- `Space` - Play/Pause
- `←/→` - Skip backward/forward 10 seconds
- `↑/↓` - Volume up/down
- `F` - Toggle fullscreen

## 🔧 Development

### Available Scripts
```bash
npm run dev         # Start development server
npm run build       # Build for production
npm run preview     # Preview production build
npm run check       # Run Svelte type checking
npm run lint        # Run ESLint
npm run format      # Format code with Prettier
npm run test        # Run Playwright tests
```

### Code Style
- TypeScript for type safety
- ESLint + Prettier for code formatting
- Conventional commits for git history
- Component-based architecture with Svelte stores

## 📊 Database Schema

### Media Instances
```typescript
interface MediaInstance {
  $id: string;
  type: 'video_player' | 'queue_manager' | 'jukebox_kiosk';
  user_id: string;
  name: string;
  settings: InstanceSettings;
  status: 'active' | 'inactive' | 'archived';
  // ... additional fields
}
```

### Instance States
```typescript
interface InstanceState {
  $id: string;
  instance_id: string;
  current_track?: Track;
  queue: QueueItem[];
  playback_state: PlaybackState;
  // ... additional fields
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Review the codebase for examples

## 🎯 Roadmap

- [ ] Mobile responsive improvements
- [ ] Spotify integration
- [ ] Collaborative playlists
- [ ] Advanced queue algorithms
- [ ] Chromecast support
- [ ] Voice controls
- [ ] Analytics dashboard

---

**DJAMMS v2.0** - Built with ❤️ using SvelteKit and Appwrite
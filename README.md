# MyAniWatch Mobile App (Expo / React Native)

Official mobile application for MyAniWatch anime streaming platform, built with Expo & React Native.

## 🚀 Features
- **OLED Dark Design System**: Matches website aesthetics (#090A0F, #8B5CF6 purple accent, surface cards).
- **Authentication**: Sign In & Register using backend API with persistent AsyncStore session.
- **Home Feed**: Trending hero banner, Popular anime list, Continue Watching carousel.
- **Search & Browse**: Real-time search bar & interactive genre pills.
- **Anime Details & Episode Selector**: Synopsis, rating badges, watchlist toggle, episode list.
- **Video Player**: HLS stream playback (`react-native-webview`), server switching (HD Main, Backup, Anizone), episode navigation.
- **Watch2Gether**: Public room list, Room creation modal, live synced room chat.
- **Watch History & Watchlist**: Continue Watching list with progress bars & pagination, watchlist sync.
- **Community Feed**: Category discussion threads, post creation, upvotes.
- **User Profile & Leaderboard**: Otaku level, XP stats, global leaderboard ranking.

## 📦 How to Run

1. Open a terminal in `mobile-app` directory:
```bash
cd mobile-app
npm install
```

2. Start the Expo development server:
```bash
npx expo start
```

3. Scan the QR code with **Expo Go** on Android or iOS to run on physical device!

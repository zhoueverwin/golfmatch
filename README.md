# GolfMatch App 🏌️‍♀️

A modern golf dating app for Japan, built with React Native and Expo.

## Features

- **Search & Discovery**: Browse golf partners with advanced filtering
- **Matching System**: Like and match with compatible golfers
- **Real-time Chat**: Communicate with your matches
- **Profile Management**: Complete profiles with golf-specific information
- **Social Feed**: Share golf experiences and photos
- **Japanese Localization**: Fully localized for Japanese users

## Tech Stack

- **Frontend**: React Native (Expo managed workflow)
- **Backend**: Supabase (Database, Auth, Real-time)
- **Storage**: AWS Amplify (Media files)
- **Language**: TypeScript
- **Styling**: React Native StyleSheet with design system

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Expo CLI (`npm install -g @expo/cli`)
- iOS Simulator (for iOS development) or Android Studio (for Android)

### Installation

1. Clone the repository:
```bash
cd golfmatch-app
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Run on your preferred platform:
```bash
# iOS
npm run ios

# Android
npm run android

# Web (for testing)
npm run web
```

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ProfileCard.tsx
│   └── FilterModal.tsx
├── constants/           # Design system constants
│   ├── colors.ts
│   ├── spacing.ts
│   └── typography.ts
├── navigation/          # Navigation configuration
│   └── AppNavigator.tsx
├── screens/            # Screen components
│   ├── SearchScreen.tsx
│   ├── LikesScreen.tsx
│   ├── MatchingScreen.tsx
│   ├── MessagesScreen.tsx
│   └── MyPageScreen.tsx
├── services/           # API and external services
│   └── supabase.ts
└── types/              # TypeScript type definitions
    └── index.ts
```

## Configuration

### Supabase Setup

1. Create a new Supabase project
2. Update `src/services/supabase.ts` with your project URL and anon key
3. Set up the database schema (see Database Schema section)

### Environment Variables

Create a `.env` file in the root directory:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Database Schema

The app uses the following main tables:

- `profiles` - User profile information
- `likes` - Like relationships between users
- `matches` - Mutual matches
- `chat_messages` - Real-time chat messages
- `posts` - Social feed posts
- `post_likes` - Post likes
- `post_comments` - Post comments

## Design System

The app follows a consistent design system with:

- **Colors**: Teal primary color (#20B2AA) with golf-themed greens
- **Typography**: Clear hierarchy with Japanese text support
- **Spacing**: Consistent 4px grid system
- **Components**: Reusable UI components following the design mockups

## Development Status

### ✅ Completed
- Project setup with React Native + Expo
- Navigation structure with 5 main tabs
- UI components matching the design mockups
- TypeScript configuration
- Basic screen layouts

### 🚧 In Progress
- Supabase integration
- Authentication system
- Real-time chat functionality
- Profile management

### 📋 TODO
- Push notifications
- In-app purchases
- Social feed implementation
- Advanced filtering
- Image upload and storage

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is private and proprietary.

## Support

For questions or support, please contact the development team.

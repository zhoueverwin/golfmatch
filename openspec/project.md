# Project Context

## Purpose

**GolfMatch** is a mobile dating and social networking app for golfers in Japan. The app connects golf enthusiasts based on their skill level, location, and availability to play together. Users can create profiles, match with other golfers, chat, share posts about their golf experiences, and coordinate rounds.

**Key Features:**
- Profile-based matching system with likes/super likes
- Real-time chat messaging with image/video support
- Golf-specific profile attributes (handicap, skill level, favorite courses)
- Availability calendar for scheduling rounds
- Social feed for sharing golf-related posts
- Match congratulations popup for new connections
- Profile footprints (who viewed your profile)
- Push notifications for matches, messages, and interactions

**Target Users:** Japanese golfers looking to connect with playing partners

## Tech Stack

### Frontend
- **React Native** (0.81.4) - Cross-platform mobile framework
- **Expo** (~54.0.10) - Development and build toolchain
- **TypeScript** (~5.9.2) - Type-safe JavaScript
- **React Navigation** (v7) - Navigation library (Stack + Bottom Tabs)
- **React** (19.1.0) - UI framework

### Backend & Services
- **Supabase** - Backend-as-a-Service (BaaS)
  - PostgreSQL database with RLS (Row Level Security)
  - Real-time subscriptions via WebSockets
  - Authentication (email, Google OAuth, Apple Sign-In)
  - Storage for media files (images, videos)
- **Expo Notifications** - Push notifications via APNs/FCM

### Key Libraries
- `@supabase/supabase-js` (^2.58.0) - Supabase client
- `expo-notifications` - Push notification handling
- `expo-image-picker` - Media selection
- `expo-av` / `expo-video` - Video playback
- `expo-location` - Geolocation services
- `@react-native-async-storage/async-storage` - Persistent storage
- `@react-native-google-signin/google-signin` - Google OAuth
- `expo-apple-authentication` - Apple Sign-In

### Testing
- **Jest** (^29.7.0) - Test framework
- **React Native Testing Library** (^12.6.1) - Component testing
- **ts-jest** (^29.2.5) - TypeScript support for Jest

### Development Tools
- **ESLint** (^8.57.0) - Linting with TypeScript plugin
- **OpenSpec** - Spec-driven development workflow
- **expo-mcp** (^0.1.13) - MCP integration for Supabase

## Project Conventions

### Code Style

#### File Naming
- **Components:** PascalCase (e.g., `MatchCelebrationModal.tsx`, `ProfileCard.tsx`)
- **Screens:** PascalCase with "Screen" suffix (e.g., `HomeScreen.tsx`, `ChatScreen.tsx`)
- **Services:** camelCase with ".service" suffix (e.g., `matches.service.ts`, `notificationService.ts`)
- **Contexts:** PascalCase with "Context" suffix (e.g., `AuthContext.tsx`, `MatchContext.tsx`)
- **Types:** camelCase for files (e.g., `dataModels.ts`, `notifications.ts`)
- **Constants:** camelCase for files (e.g., `colors.ts`, `spacing.ts`)

#### Naming Conventions
- **Components/Screens:** PascalCase (e.g., `ProfileCard`, `HomeScreen`)
- **Functions/Variables:** camelCase (e.g., `handleLike`, `userId`)
- **Constants:** UPPER_SNAKE_CASE or camelCase objects (e.g., `MAX_MATCHES_PER_SESSION`, `Colors.primary`)
- **Types/Interfaces:** PascalCase (e.g., `User`, `Match`, `ServiceResponse<T>`)
- **Props Interfaces:** PascalCase with "Props" suffix (e.g., `MatchCelebrationModalProps`)

#### TypeScript
- **Strict mode enabled** in `tsconfig.json`
- Prefer explicit types over `any` (but relaxed in dev with ESLint off)
- Use type inference when obvious
- Define interfaces for component props and service responses
- Use `ServiceResponse<T>` pattern for all service methods:
  ```typescript
  interface ServiceResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
  }
  ```

#### React Native Patterns
- Use **functional components** with hooks (no class components)
- Use **StyleSheet.create()** for styles (defined at bottom of file)
- Prefer **TouchableOpacity** for buttons (visual feedback)
- Use **FlatList/SectionList** for lists (performance)
- Always provide **loading, empty, and error states**
- Extract reusable components to `/components`
- Extract screen-specific components inline or to separate files if large

#### Import Order
1. React imports
2. React Native imports
3. Third-party libraries
4. Navigation imports
5. Local contexts/hooks
6. Local components
7. Local services/utils
8. Local types
9. Local constants
10. Assets (images, etc.)

Example:
```typescript
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/Button';
import { DataProvider } from '../services';
import { User } from '../types';
import { Colors, Spacing } from '../constants';
```

#### Console Logging
- Use structured logging with context tags: `console.log('[ScreenName] Message:', data)`
- Keep logs for debugging but remove excessive logs before commit
- Use error logs: `console.error('[Context] Error:', error)`
- Use warn logs: `console.warn('[Context] Warning:', message)`

#### Comments
- Add JSDoc comments for complex functions and services
- Use inline comments sparingly for non-obvious logic
- Prefer self-documenting code over excessive comments

### Architecture Patterns

#### Project Structure
```
src/
├── __tests__/          # Test files (*.test.tsx)
├── components/         # Reusable UI components
├── constants/          # App-wide constants (colors, spacing, typography)
├── contexts/           # React Context providers (Auth, Notifications, Match)
├── hooks/              # Custom React hooks
├── navigation/         # React Navigation setup
├── screens/            # Screen components (one per route)
├── services/           # Business logic and API calls
│   └── supabase/       # Supabase-specific services
├── types/              # TypeScript type definitions
└── utils/              # Helper functions and utilities
```

#### Service Layer Pattern
- All backend interactions go through services (e.g., `MatchesService`, `MessagesService`)
- Services return `ServiceResponse<T>` for consistency
- Services handle errors and return user-friendly messages
- Use `DataProvider` as a facade for switching between mock/real data
- Use `CacheService` for optimizing data retrieval
- Use `withRetry` utility for robust API calls

Example:
```typescript
export class MatchesService {
  async getMatches(userId: string): Promise<ServiceResponse<Match[]>> {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('*, user1:profiles!matches_user1_id_fkey(*), user2:profiles!matches_user2_id_fkey(*)')
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
        .eq('is_active', true);

      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch matches', data: [] };
    }
  }
}
```

#### Context Pattern
- Use React Context for global state (Auth, Notifications, Match)
- Contexts provide state + actions via custom hooks
- Keep context focused (single responsibility)
- Use refs for non-reactive state (e.g., `shownMatchIds` in MatchContext)

Example:
```typescript
export const MatchProvider: React.FC<MatchProviderProps> = ({ children }) => {
  const [currentMatch, setCurrentMatch] = useState<Match | null>(null);
  const [isShowingMatch, setIsShowingMatch] = useState(false);

  const value = { currentMatch, isShowingMatch };

  return (
    <MatchContext.Provider value={value}>
      {children}
      <MatchCelebrationModal {...matchProps} />
    </MatchContext.Provider>
  );
};

export const useMatch = () => {
  const context = useContext(MatchContext);
  if (!context) throw new Error('useMatch must be used within MatchProvider');
  return context;
};
```

#### Real-time Pattern
- Use Supabase real-time subscriptions for live updates
- Subscribe in `useEffect` and clean up on unmount
- Use channel names with context (e.g., `match-popup-${userId}`)
- Handle connection status and errors gracefully

Example:
```typescript
useEffect(() => {
  const channel = supabase
    .channel(`matches-${userId}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'matches' },
      (payload) => {
        // Handle new match
      }
    )
    .subscribe();

  return () => { channel.unsubscribe(); };
}, [userId]);
```

#### Component Pattern
- Keep components small and focused
- Extract complex logic to custom hooks
- Use composition over inheritance
- Prefer controlled components
- Lift state up when shared between siblings

#### Navigation Pattern
- Use Stack Navigator for hierarchical screens
- Use Bottom Tab Navigator for main sections
- Pass minimal data via route params (prefer IDs over full objects)
- Fetch data in screens using `useEffect`

#### Error Handling
- Services catch errors and return `{ success: false, error: message }`
- Screens display user-friendly error messages via Toast/Alert
- Use try-catch in async functions
- Log errors to console with context

#### State Management
- Local state: `useState` for component-specific state
- Global state: React Context for cross-cutting concerns
- Server state: Fetch in screens, cache in services
- Form state: Controlled components with local state

### Testing Strategy

#### Test Coverage
- **Unit Tests:** Services, utilities, hooks
- **Integration Tests:** Component + service interactions
- **Component Tests:** UI components with React Native Testing Library
- **E2E Tests:** Not currently implemented (future consideration)

#### Testing Patterns
- Use `jest.mock()` for mocking services and dependencies
- Use `@testing-library/react-native` for component testing
- Test user interactions with `fireEvent` and `userEvent`
- Test async operations with `waitFor`
- Use `jest.setup.ts` for global test configuration

#### Test File Naming
- Place tests in `src/__tests__/` directory
- Name test files with `.test.tsx` suffix
- Match test file names to component/screen names

Example:
```typescript
describe('MatchCelebrationModal', () => {
  it('displays both user profile images', () => {
    const { getByTestId } = render(<MatchCelebrationModal {...props} />);
    expect(getByTestId('current-user-image')).toBeTruthy();
    expect(getByTestId('other-user-image')).toBeTruthy();
  });

  it('calls onSendMessage when button pressed', async () => {
    const onSendMessage = jest.fn();
    const { getByText } = render(<MatchCelebrationModal {...props} onSendMessage={onSendMessage} />);
    fireEvent.press(getByText('メッセージを送る'));
    await waitFor(() => expect(onSendMessage).toHaveBeenCalled());
  });
});
```

#### Running Tests
```bash
npm test              # Run all tests
npm test -- --watch   # Watch mode
npm test MyComponent  # Run specific test
```

### Git Workflow

#### Branching Strategy
- **Main branch:** `master` (production-ready code)
- **Feature branches:** Not strictly enforced (small team, rapid iteration)
- Direct commits to `master` allowed for small fixes
- Larger features may use feature branches (optional)

#### Commit Conventions
- Use descriptive commit messages (imperative mood)
- Include context: what changed and why
- Group related changes in single commits
- Reference related issues/docs when applicable

**Commit Message Format:**
```
<type>: <short description>

<detailed description>

<list of key changes>
```

**Example:**
```
Fix match congratulations popup and add user deletion scripts

- Fix match popup to appear immediately via real-time subscription
- Remove app foreground listener that caused duplicate popups
- Add session tracking (shownMatchIds) to prevent re-showing matches
- Fix persistence: popup only shows once per match per user
- Add comprehensive user deletion scripts with verification

Key changes:
- MatchContext: Real-time subscription now shows popup instantly
- MatchContext: Removed AppState listener causing persistence bug
- MatchContext: Added shownMatchIds Set for session tracking
```

#### Before Committing
- Run linter: `npm run lint`
- Run TypeScript check: `npm run tsc`
- Run tests: `npm test`
- Remove debug code and excessive console logs
- Ensure no sensitive data (API keys, tokens) is committed

## Domain Context

### Golf-Specific Terminology
- **Skill Level:** ビギナー (Beginner), 中級者 (Intermediate), 上級者 (Advanced), プロ (Professional)
- **Handicap/Average Score:** User's typical 18-hole score
- **Round Fee:** Expected cost per round (e.g., ¥5,000-¥10,000)
- **Available Days:** When user can play (weekdays, weekends, holidays)
- **Prefecture:** User's location in Japan (used for matching)

### Matching System
- **Like:** Express interest in playing with someone
- **Super Like:** (Currently implemented but may be deprecated)
- **Pass:** Skip a profile
- **Match:** Mutual like between two users
- **Match Popup:** Celebratory modal shown when match occurs

### User Interactions
- **Profile Views (Footprints):** Track who viewed your profile
- **Past Likes:** View users you've liked previously
- **Connections:** Users who liked you back (mutual interest)
- **Messages:** Real-time chat between matched users

### Post/Feed System
- Users share golf-related content (text, images, videos)
- Support for reactions (thumbs-up: nice, good_job, helpful, inspiring)
- Comments on posts
- Home feed displays posts from all users

### Notifications
- **Types:** message, like, match, post_reaction
- Push notifications via Expo (FCM/APNs)
- In-app notification history
- Notification preferences (enable/disable by type)

### Calendar/Availability
- Users set available dates and times for playing golf
- Used for matching/scheduling purposes
- Displayed on profile

## Important Constraints

### Technical Constraints
- **Expo Managed Workflow:** Must use Expo-compatible libraries (no native modules without custom dev client)
- **Supabase RLS:** All database queries respect Row Level Security policies
- **Real-time Limitations:** Supabase real-time has connection limits (monitor usage)
- **Storage Limits:** Supabase free tier has storage quotas (optimize media uploads)
- **React Native Performance:** Large lists must use FlatList; optimize re-renders

### Business Constraints
- **Japanese Market:** UI text and UX tailored for Japanese users
- **Golf Focus:** Features specific to golf/sports social networking
- **Mobile-First:** No web version currently (React Native only)

### Regulatory Constraints
- **Data Privacy:** Handle user data per Japanese privacy laws
- **Authentication:** Secure auth required (Supabase handles this)
- **Media Moderation:** User-uploaded content must comply with community standards (manual moderation currently)

### UI/UX Constraints
- **Follow UI.md:** All UI must adhere to design principles in `/UI.md`
- **Backend Impact Verification:** Every UI change must include "Backend impact: none" or "Backend impact: yes - requires X" (per `uichange.mdc` rule)
- **Responsive Design:** Support various screen sizes (iOS/Android, different phones)
- **Accessibility:** Readable contrast, semantic components where possible

## External Dependencies

### Supabase Services
- **Database:** PostgreSQL with UUID primary keys
- **Authentication:** Email, Google OAuth, Apple Sign-In
- **Storage:** Media files (profile pictures, post media, message attachments)
  - Buckets: `profile-pictures`, `post-media`, `message-media`
- **Real-time:** WebSocket subscriptions for live updates
- **Edge Functions:** (Not currently used but available)

### Third-Party Services
- **Expo Push Notifications:** APNs (iOS) and FCM (Android) via Expo
- **Google OAuth:** `@react-native-google-signin/google-signin`
- **Apple Sign-In:** `expo-apple-authentication`

### APIs and Endpoints
- Supabase REST API (via `@supabase/supabase-js`)
- Supabase Realtime (WebSocket subscriptions)

### Development Tools
- **OpenSpec:** Spec-driven development workflow (see `openspec/AGENTS.md`)
- **Expo Go:** Development app for testing (some features require custom dev client)
- **Expo Dev Client:** Custom development client for native modules

### Environment Variables
- `EXPO_PUBLIC_SUPABASE_URL` - Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `EXPO_PUBLIC_TEST_USER_ID` - Test user ID for development

## Notes for AI Assistants

### Always Check Before Changes
1. Read relevant specs in `openspec/specs/` if making architectural changes
2. Check `UI.md` for UI/UX guidelines
3. Verify backend impact with `uichange.mdc` rule
4. Follow OpenSpec workflow for major features (see `openspec/AGENTS.md`)

### Common Patterns
- Service methods return `ServiceResponse<T>`
- Real-time subscriptions clean up on unmount
- Contexts provide state + actions via custom hooks
- Components use StyleSheet at bottom of file
- Screens fetch data in `useEffect`, handle loading/error states

### Documentation Location
- **UI Guidelines:** `/UI.md`
- **OpenSpec Instructions:** `openspec/AGENTS.md`
- **Match Popup Docs:** `/MATCH_POPUP_IMPLEMENTATION_COMPLETE.md`, `/MATCH_POPUP_TESTING_GUIDE.md`
- **User Deletion:** `/USER_DELETION_GUIDE.md`
- **Notification System:** `/NOTIFICATION_SYSTEM_IMPLEMENTATION.md`
- **Profile Footprints:** `/PROFILE_FOOTPRINTS_IMPLEMENTATION.md`
- **Real-time Chat:** `/REALTIME_CHAT_FIX_SUMMARY.md`

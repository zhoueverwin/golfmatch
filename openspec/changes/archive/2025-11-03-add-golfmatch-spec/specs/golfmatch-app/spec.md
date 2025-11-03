## ADDED Requirements

### Requirement: GolfMatch Application Overview
The GolfMatch application SHALL be a mobile dating and social networking app for golfers in Japan that connects golf enthusiasts based on their skill level, location, and availability to play together.

#### Scenario: Application Purpose
- **WHEN** a Japanese golfer uses the app
- **THEN** they can find and connect with other golfers to play rounds together

### Requirement: Tech Stack
The application SHALL use the following technology stack:
- Frontend: React Native with Expo managed workflow
- Backend: Supabase (PostgreSQL database, authentication, real-time)
- Language: TypeScript
- State Management: React Context API
- Navigation: React Navigation (stack and bottom tabs)
- Storage: Supabase Storage for media files
- Testing: Jest with React Native Testing Library

#### Scenario: Tech Stack Implementation
- **WHEN** developers work on the application
- **THEN** they use React Native with Expo for cross-platform development
- **AND** Supabase for backend services
- **AND** TypeScript for type safety

### Requirement: Core Features
The application SHALL provide the following core features:
1. Profile-based matching system with likes/super likes
2. Real-time chat messaging with image/video support
3. Golf-specific profile attributes (handicap, skill level, favorite courses)
4. Availability calendar for scheduling rounds
5. Social feed for sharing golf-related posts
6. Match congratulations popup for new connections
7. Profile footprints (who viewed your profile)
8. Push notifications for matches, messages, and interactions

#### Scenario: Core Features Access
- **WHEN** a user opens the app
- **THEN** they can access all core features through the main navigation tabs

### Requirement: User Authentication
The application SHALL support multiple authentication methods:
1. Phone number with SMS OTP
2. Email/password
3. Google Sign-In
4. Apple Sign-In

#### Scenario: User Authentication
- **WHEN** a new user opens the app
- **THEN** they can register using phone, email, Google, or Apple
- **AND** existing users can log in with their credentials

### Requirement: Data Models
The application SHALL use the following core data models:
1. User: Profile information including golf-specific attributes
2. Post: Social feed posts with text, images, and videos
3. Message: Chat messages between users
4. Chat: Conversation containers between matched users
5. Match: Mutual connections between users
6. Like: User interest expressions
7. Availability: Calendar data for scheduling

#### Scenario: Data Model Usage
- **WHEN** users interact with the app
- **THEN** their actions are stored in the appropriate data models
- **AND** relationships between entities are maintained

### Requirement: Real-time Communication
The application SHALL provide real-time updates for:
1. Chat messages
2. Match notifications
3. Social feed updates
4. Profile changes

#### Scenario: Real-time Updates
- **WHEN** one user sends a message to another
- **THEN** the recipient receives it instantly without refreshing
- **AND** when a match occurs, both users are notified immediately

### Requirement: Navigation Structure
The application SHALL use a bottom tab navigation with five main sections:
1. Home: Main feed and discovery
2. Search: User search with filters
3. Connections: Likes and matches
4. Messages: Chat conversations
5. MyPage: User profile and settings

#### Scenario: Navigation Access
- **WHEN** a user wants to access different features
- **THEN** they can switch between tabs at the bottom of the screen
- **AND** each tab provides access to its specific functionality

### Requirement: Japanese Localization
The application SHALL be fully localized for Japanese users:
1. All UI text in Japanese
2. Japanese font support (Noto Sans JP)
3. Localized permission prompts
4. Japanese-specific features and terminology

#### Scenario: Japanese Localization
- **WHEN** a Japanese user uses the app
- **THEN** all text is displayed in Japanese
- **AND** the UI follows Japanese design conventions
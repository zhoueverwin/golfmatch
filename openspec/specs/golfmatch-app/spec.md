# GolfMatch App Specification

## Purpose
GolfMatch is a mobile dating and social networking application specifically designed for golf enthusiasts in Japan. The app connects golfers based on their skill level, location, and availability to facilitate golf rounds and build a community around the sport. Users can create detailed profiles showcasing their golfing abilities, discover compatible playing partners, engage in real-time communication, and share their golf experiences through a social feed.

## Scope
The application targets Japanese golfers seeking to connect with playing partners. It provides a complete social networking experience with dating app features tailored to golfers' specific needs, including skill-based matching, availability coordination, and golf-specific profile information.

## Architecture Overview
The application follows a client-server architecture with a React Native frontend and Supabase backend:

### Frontend Architecture
- **Framework**: React Native with Expo managed workflow for cross-platform compatibility
- **State Management**: React Context API for global state management
- **Navigation**: React Navigation with bottom tab navigator and stack navigator
- **UI Components**: Custom component library with reusable UI elements
- **Styling**: StyleSheet-based styling with design system constants

### Backend Architecture
- **Platform**: Supabase as Backend-as-a-Service
- **Database**: PostgreSQL with Row Level Security (RLS)
- **Authentication**: Supabase Auth with multiple providers
- **Real-time**: WebSocket subscriptions for live updates
- **Storage**: Supabase Storage for media files
- **API**: RESTful API through Supabase client

### Data Flow
1. UI components interact with service layer through DataProvider
2. Services communicate with Supabase backend
3. Real-time subscriptions push updates to UI
4. Context providers manage global state
5. Navigation routes users between screens

## Requirements
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

### Requirement: Profile Management
The application SHALL allow users to create and manage detailed golf-specific profiles including:
1. Basic information (name, age, gender, location, blood type, height, body type, smoking habits)
2. Golf-specific information (skill level, experience, average score, best score, transportation, play fee, available days, round fee)
3. Personal bio and profile pictures
4. Verification status and activity timestamps

#### Scenario: Profile Creation
- **WHEN** a new user registers
- **THEN** they are prompted to complete their profile with golf-specific information
- **AND** they can add multiple profile pictures

#### Scenario: Profile Editing
- **WHEN** a user accesses their profile
- **THEN** they can update all profile information
- **AND** changes are saved to the backend

### Requirement: Search and Discovery
The application SHALL provide advanced search and filtering capabilities:
1. Age filtering by decade (e.g., 20代, 30代)
2. Prefecture selection
3. Golf skill level filtering
4. Average score filtering (maximum score)
5. Last login filtering (within X days)

#### Scenario: User Search
- **WHEN** a user accesses the search feature
- **THEN** they can apply multiple filters to find compatible golfers
- **AND** search results are displayed in a card-based layout

### Requirement: Matching System
The application SHALL implement a like-based matching system:
1. Users can like, super-like, or pass on other users' profiles
2. Mutual likes create matches
3. Match notifications are sent to both users
4. Match celebration popup is displayed for new matches

#### Scenario: Matching Process
- **WHEN** User A likes User B
- **AND** User B likes User A
- **THEN** a match is created
- **AND** both users receive match notifications
- **AND** a celebration popup is displayed

### Requirement: Real-time Chat
The application SHALL provide real-time messaging between matched users:
1. Text messaging with real-time delivery
2. Image and video sharing
3. Message read status tracking
4. Unread message counters
5. Message history retention

#### Scenario: Chat Messaging
- **WHEN** matched users send messages to each other
- **THEN** messages are delivered instantly
- **AND** message read status is updated
- **AND** unread counters are maintained

### Requirement: Social Feed
The application SHALL provide a social feed for sharing golf experiences:
1. Users can create posts with text, images, and videos
2. Posts can be liked by other users
3. Posts can be commented on
4. Feed displays posts from all users

#### Scenario: Social Posting
- **WHEN** a user creates a post
- **THEN** it appears in the social feed
- **AND** other users can like and comment on it

### Requirement: Availability Calendar
The application SHALL allow users to set and view availability:
1. Users can mark dates as available or unavailable
2. Time slots can be specified for available dates
3. Notes can be added to availability entries
4. Calendar view shows availability for planning

#### Scenario: Availability Setting
- **WHEN** a user sets their availability
- **THEN** it is stored in the system
- **AND** can be viewed by other users for scheduling

### Requirement: Notifications
The application SHALL provide push notifications for:
1. New matches
2. New messages
3. Profile views
4. Post reactions
5. Comment notifications

#### Scenario: Notification Delivery
- **WHEN** a match occurs
- **THEN** both users receive push notifications
- **AND** notifications are stored in the app's notification history

### Requirement: User Privacy and Security
The application SHALL protect user privacy and data:
1. Secure authentication with multiple providers
2. Row Level Security (RLS) for database access
3. Encrypted communication with backend services
4. User-controlled profile visibility settings

#### Scenario: Data Security
- **WHEN** user data is transmitted
- **THEN** it is encrypted
- **AND** only authorized users can access their own data

## Data Models

### User Model
The User model represents a golf enthusiast with both general and golf-specific attributes:

#### Fields
- **id**: Unique identifier (UUID)
- **legacy_id**: Legacy identifier for migration purposes
- **user_id**: Auth user identifier
- **name**: User's display name
- **age**: User's age in years
- **gender**: Gender identification (male, female, other)
- **location**: General location information
- **prefecture**: Japanese prefecture
- **golf_skill_level**: Skill level (ビギナー, 中級者, 上級者, プロ)
- **average_score**: Average 18-hole score
- **bio**: Personal biography
- **profile_pictures**: Array of profile picture URLs
- **is_verified**: Verification status
- **last_login**: Last login timestamp
- **created_at**: Profile creation timestamp
- **updated_at**: Last update timestamp

#### Relationships
- Posts created by the user
- Messages sent and received
- Likes given and received
- Matches formed

### Post Model
The Post model represents content shared in the social feed:

#### Fields
- **id**: Unique identifier (UUID)
- **user_id**: Identifier of the posting user
- **content**: Text content of the post
- **images**: Array of image URLs
- **videos**: Array of video URLs
- **likes**: Count of likes (deprecated)
- **reactions_count**: Count of reactions
- **comments**: Count of comments
- **timestamp**: Creation timestamp
- **created_at**: Creation timestamp
- **updated_at**: Last update timestamp

### Message Model
The Message model represents chat communications between users:

#### Fields
- **id**: Unique identifier (UUID)
- **chat_id**: Identifier of the chat conversation
- **sender_id**: Identifier of the sending user
- **receiver_id**: Identifier of the receiving user
- **text**: Message content
- **timestamp**: Creation timestamp
- **type**: Type of message (text, image, emoji, video)
- **imageUri**: URL for image/video content
- **isRead**: Read status
- **created_at**: Creation timestamp
- **updated_at**: Last update timestamp

### Match Model
The Match model represents mutual connections between users:

#### Fields
- **id**: Unique identifier (UUID)
- **user1_id**: First user in the match
- **user2_id**: Second user in the match
- **is_active**: Match status
- **created_at**: Match creation timestamp
- **updated_at**: Last update timestamp

### Like Model
The Like model represents user interest expressions:

#### Fields
- **id**: Unique identifier (UUID)
- **liker_user_id**: User expressing interest
- **liked_user_id**: User receiving interest
- **type**: Type of interest (like, super_like, pass)
- **created_at**: Creation timestamp
- **updated_at**: Last update timestamp

### Availability Model
The Availability model represents user scheduling information:

#### Fields
- **id**: Unique identifier (UUID)
- **user_id**: User identifier
- **date**: Date of availability
- **is_available**: Availability status
- **time_slots**: Array of available time slots
- **notes**: Additional notes
- **created_at**: Creation timestamp
- **updated_at**: Last update timestamp

## Service Layer

### Profiles Service
Manages user profile operations including creation, retrieval, update, and deletion.

### Posts Service
Handles social feed functionality including post creation, retrieval, and interaction.

### Matches Service
Manages the matching system including like processing, match creation, and match retrieval.

### Messages Service
Handles real-time chat functionality including message sending, retrieval, and status updates.

### Availability Service
Manages user availability calendar including setting, retrieving, and updating availability.

## Context Providers

### Auth Context
Manages user authentication state including login, logout, and session management.

### Match Context
Manages match-related state including match celebration popups and match tracking.

### Notification Context
Manages notification state including push notifications and in-app notification history.

## Testing Strategy

### Unit Testing
- Component testing with React Native Testing Library
- Service layer testing with Jest
- Utility function testing

### Integration Testing
- Service and component integration
- Navigation flow testing
- Data flow validation

### End-to-End Testing
- Detox for device-level testing
- User journey validation
- Real-time feature testing

## Deployment

### Build Process
- Expo CLI for building iOS and Android applications
- EAS for cloud builds and deployment
- Environment-specific configurations

### Release Management
- Version control with Git
- Branching strategy for feature development
- Release tagging and changelog management

## Conclusion

The GolfMatch application provides a comprehensive platform for Japanese golf enthusiasts to connect, communicate, and coordinate golf rounds. With its robust tech stack built on React Native and Supabase, the app delivers a seamless user experience with real-time features, secure authentication, and golf-specific functionality.

The modular architecture with clear separation of concerns ensures maintainability and scalability, while the comprehensive testing strategy helps maintain quality and reliability. The focus on Japanese localization and golf-specific features makes it uniquely suited to its target market.

This specification serves as the foundation for ongoing development and maintenance of the GolfMatch application, guiding future enhancements and ensuring consistency in implementation.

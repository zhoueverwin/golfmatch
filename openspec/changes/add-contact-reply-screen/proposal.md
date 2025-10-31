# Proposal: Add Contact Inquiry & Reply Screen

**Change ID:** `add-contact-reply-screen`  
**Status:** Completed  
**Created:** 2025-01-31  
**Completed:** 2025-01-31  
**Owner:** Development Team

## Summary

Add a new screen "お問い合わせと返信" (Contact Inquiry & Reply) accessible from the My Page screen. This screen provides two tabs:
1. **送信 (Send)**: Allows users to submit new contact inquiries with inquiry type, name, email, and message fields
2. **返信 (Replies)**: Allows users to view replies from the app owner/administrator regarding their submitted inquiries or support requests.

## Motivation

Users need a way to:
- Submit inquiries or support requests to the app owner
- View responses from the app owner when they submit inquiries or support requests

Previously, the My Page screen had a menu item for "お問い合わせ返信" but it didn't navigate anywhere. This feature provides a complete inquiry management system with both submission and reply viewing capabilities.

## Scope

### In Scope
- New screen component: `ContactReplyScreen.tsx` with tabbed interface
- **Send Tab**: Inquiry submission form with:
  - Inquiry type dropdown (6 categories: account, payment, feature, bug, suggestion, other)
  - Name field (pre-filled from profile)
  - Email field (pre-filled from auth)
  - Subject field (optional, auto-generated from type)
  - Message textarea (required)
  - Form validation and error handling
- **Replies Tab**: 
  - List view of user's inquiries with status badges
  - Unread reply indicators
  - Detail modal showing full inquiry thread with replies
  - Mark replies as read functionality
- Navigation route addition to `RootStackParamList`
- Database schema for storing contact inquiries and replies
- Service layer for creating inquiries and fetching contact replies
- RLS policies for secure data access
- UI for displaying inquiry threads and replies
- Integration with My Page screen navigation

### Out of Scope
- Real-time notifications for new replies (future enhancement)
- Admin interface for responding (backend-only, separate admin tool)
- Two-way conversation between user and admin (future enhancement)

## Impact Analysis

### Affected Components
- `src/screens/MyPageScreen.tsx` - Add navigation handler (menu item updated to "お問い合わせと返信")
- `src/navigation/AppNavigator.tsx` - Add new route
- `src/types/index.ts` - Add navigation type
- `src/services/supabase/contact-inquiries.service.ts` - New service for contact inquiries
- `src/services/supabaseDataProvider.ts` - Added wrapper methods
- `src/services/dataProviderSwitcher.ts` - Added wrapper methods
- Database schema - New tables for contact inquiries/replies

### Backend Impact
**Backend impact: yes** - Requires:
- New database table `contact_inquiries` with columns:
  - `id` (UUID, primary key)
  - `user_id` (UUID, foreign key to profiles)
  - `subject` (text, required)
  - `message` (text, required)
  - `status` (text: 'pending', 'replied', 'closed', default 'pending')
  - `created_at` (timestamptz)
  - `replied_at` (timestamptz, nullable)
  - `updated_at` (timestamptz)
- New table `contact_replies` with columns:
  - `id` (UUID, primary key)
  - `inquiry_id` (UUID, foreign key to contact_inquiries)
  - `reply_message` (text)
  - `from_admin` (boolean, default true)
  - `is_read` (boolean, default false)
  - `created_at` (timestamptz)
- RLS policies:
  - **INSERT**: Users can create their own inquiries
  - **SELECT**: Users can read their own inquiries
  - **SELECT**: Users can read replies to their own inquiries
  - **UPDATE**: Users can mark replies as read
- Indexes for performance (user_id, status, created_at, inquiry_id, is_read)
- Service methods for creating inquiries and fetching inquiries/replies

## User Stories

1. **As a user**, I want to submit inquiries to the app owner so I can get help or report issues.
2. **As a user**, I want to view replies to my inquiries so I can see responses from the app owner.
3. **As a user**, I want to see which inquiries have replies so I know what to check.
4. **As a user**, I want to see the full conversation thread so I can understand the context.
5. **As a user**, I want my name and email pre-filled so I don't have to enter them every time.

## Success Criteria

- [x] Users can navigate to Contact Inquiry & Reply screen from My Page
- [x] **Send Tab**: Users can submit inquiries with inquiry type, name, email, and message
- [x] **Send Tab**: Form validation prevents submission of incomplete inquiries
- [x] **Send Tab**: Name and email are pre-filled from user profile/auth
- [x] **Send Tab**: Subject auto-generates from inquiry type if not provided
- [x] **Send Tab**: Success message shown after submission and auto-switches to Replies tab
- [x] **Replies Tab**: Screen displays list of user's inquiries with reply status
- [x] **Replies Tab**: Users can view full inquiry thread including replies
- [x] **Replies Tab**: Unread replies are visually indicated (badge or highlight)
- [x] **Replies Tab**: Empty state shown when no inquiries exist
- [x] Loading states handled gracefully
- [x] Error states handled with user-friendly messages
- [x] Follows existing UI patterns and design system
- [x] RLS policies properly configured for secure data access

## Technical Considerations

### Backend Implementation
- **Supabase MCP Available:** All database migrations, schema changes, and RLS policies implemented using Supabase MCP tools
- Database migration for `contact_inquiries` and `contact_replies` tables created and applied via MCP
- **INSERT RLS Policy**: Added policy allowing users to create their own inquiries
- **SELECT RLS Policies**: Users can read their own inquiries and replies
- **UPDATE RLS Policy**: Users can mark replies as read
- Service methods use Supabase client with proper error handling
- All RLS policies follow the pattern: `profiles.user_id = auth.uid()::text`

### Frontend Implementation
- **Tabbed Interface**: Uses segmented control pattern matching existing app design (HomeScreen, SearchScreen)
- **Send Tab**:
  - Form with inquiry type dropdown (modal picker)
  - Name and email fields pre-filled from profile/auth
  - Subject field optional (auto-generated from type if empty)
  - Message textarea with character limit
  - Form validation with error messages
  - Submit button with loading state
  - Success alert and auto-navigation to Replies tab
- **Replies Tab**:
  - Uses existing `StandardHeader` component for consistency
  - Follows `ServiceResponse<T>` pattern for API calls
  - Uses `FlatList` for inquiry list (performance)
  - Implemented pull-to-refresh functionality
  - Modal for detail view showing inquiry thread
  - Mark replies as read when viewed
- Both tabs follow existing UI patterns and design system

### UI/UX Compliance
- **Backend Impact Verification:** All UI components follow `uichange.mdc` rule:
  - Each UI component change includes backend impact assessment
  - Navigation changes: **Backend impact: none**
  - Inquiry submission form: **Backend impact: yes** - creates new inquiry in database
  - Screen component: **Backend impact: none** (consumes existing backend API)
  - List display: **Backend impact: none** (uses existing service methods)
  - Mark as read functionality: **Backend impact: yes** - requires `is_read` field update in database

## Dependencies

- Database migration for contact_inquiries and contact_replies tables (via Supabase MCP) ✅
- RLS policies setup including INSERT policy (via Supabase MCP) ✅
- Backend admin interface for replying (assumed to exist - separate admin tool)
- User profile data for pre-filling form fields ✅
- Auth user data for email pre-fill ✅

## Risks

- **Low Risk:** New feature, isolated from existing functionality ✅
- Database schema changes require migration ✅
- Need to ensure RLS policies are correctly configured ✅ **RESOLVED**: INSERT policy added and verified

## Future Enhancements

- Real-time notifications when admin replies
- Ability to reply back to admin (two-way conversation)
- Filter inquiries by status (pending, replied, closed)
- Search functionality for inquiries
- Attachment support for inquiries/replies


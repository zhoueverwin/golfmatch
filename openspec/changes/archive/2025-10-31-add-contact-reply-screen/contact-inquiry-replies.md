# Contact Inquiry Replies - Specification

**Spec ID:** `contact-inquiry-replies`  
**Capability:** Contact Inquiry Replies Management  
**Status:** Draft  
**Created:** 2025-01-31

## Overview

Users can submit contact inquiries and view replies from the app owner/administrator. This feature provides a dedicated screen accessible from the My Page with two tabs:
- **送信 (Send)**: Submit new inquiries with inquiry type, name, email, and message
- **返信 (Replies)**: View replies to submitted inquiries

The screen displays inquiry threads and their responses, allowing users to manage their support requests.

## Requirements

### ADDED Requirements

#### REQ-1: Contact Inquiry & Reply Screen Access
**Requirement:** Users must be able to navigate to the Contact Inquiry & Reply screen from the My Page menu. The screen provides two tabs: "送信" (Send) for submitting inquiries and "返信" (Replies) for viewing replies.

**Scenario:** User views Contact Reply screen from My Page
- Given: User is logged in and on the My Page screen
- When: User taps the "お問い合わせと返信" menu item
- Then: The Contact Inquiry & Reply screen opens with tab selector
- And: The "送信" (Send) tab is selected by default
- And: User can switch to "返信" (Replies) tab to view inquiries

**Scenario:** User without inquiries views Contact Reply screen
- Given: User has no contact inquiries
- When: User navigates to Contact Reply screen and switches to Replies tab
- Then: An empty state message is displayed: "お問い合わせはまだありません"
- And: Message suggests: "「送信」タブからお問い合わせを送信できます"

#### REQ-2: Inquiry Submission (Send Tab)
**Requirement:** Users must be able to submit new contact inquiries through a form with inquiry type, name, email, subject (optional), and message fields.

**Scenario:** User submits a new inquiry
- Given: User is on the Send tab
- When: User selects inquiry type, fills in message (required fields)
- And: Name and email are pre-filled from profile/auth
- And: User taps submit button
- Then: Inquiry is created in database with status 'pending'
- And: Success alert is displayed: "お問い合わせを受け付けました。返信をお待ちください。"
- And: Screen automatically switches to Replies tab
- And: New inquiry appears in the list

**Scenario:** User submits inquiry with form validation
- Given: User is on the Send tab
- When: User tries to submit without selecting inquiry type
- Then: Error message displays: "お問い合わせ種別を選択してください"
- And: Form does not submit

**Scenario:** User submits inquiry without message
- Given: User is on the Send tab
- When: User selects inquiry type but leaves message empty
- And: User taps submit button
- Then: Error message displays: "お問い合わせ内容を入力してください"
- And: Form does not submit

**Scenario:** Subject auto-generation
- Given: User is on the Send tab
- When: User selects inquiry type "アカウントについて" and submits without entering subject
- Then: Subject is auto-generated from inquiry type label
- And: Inquiry is created with subject: "アカウントについて"

#### REQ-3: Inquiry List Display (Replies Tab)
**Requirement:** The Contact Reply screen must display a list of the user's contact inquiries with their status and reply information.

**Scenario:** User views inquiry list
- Given: User has 3 contact inquiries (2 with replies, 1 pending)
- When: User opens Contact Reply screen
- Then: All 3 inquiries are displayed in a list
- And: Each inquiry shows: subject, status (pending/replied), date, unread indicator if applicable
- And: Inquiries with unread replies are visually highlighted

**Scenario:** User sees inquiry status indicators
- Given: User has inquiries with different statuses
- When: User views the inquiry list
- Then: Pending inquiries show "未返信" badge
- And: Replied inquiries show "返信あり" badge
- And: Inquiries with unread replies show a badge/indicator

#### REQ-4: Inquiry Thread View
**Requirement:** Users must be able to view the full conversation thread for each inquiry, including the original inquiry and all replies.

**Scenario:** User views inquiry thread
- Given: User taps on an inquiry from the list
- When: The inquiry detail screen opens
- Then: The original inquiry message is displayed
- And: All replies from the admin are displayed chronologically
- And: Each reply shows the timestamp and sender (app owner/admin)
- And: The conversation is displayed in a readable thread format

**Scenario:** User views inquiry with multiple replies
- Given: User has an inquiry with 3 replies from admin
- When: User opens the inquiry thread
- Then: All 3 replies are displayed in chronological order
- And: Each reply is clearly separated and labeled

#### REQ-5: Mark Replies as Read
**Requirement:** When a user views replies, they should be marked as read, and the unread indicator should be removed.

**Scenario:** User views unread reply
- Given: User has an inquiry with an unread reply
- When: User opens the inquiry thread and views the reply
- Then: The reply is marked as read in the database
- And: When user returns to the list, the unread indicator is removed

**Scenario:** User views inquiry without opening replies
- Given: User has an inquiry with unread replies
- When: User opens the inquiry thread but doesn't scroll to view replies
- Then: Replies are only marked as read when they come into view (optional enhancement)

#### REQ-6: Loading and Error States
**Requirement:** The Contact Reply screen must handle loading and error states gracefully.

**Scenario:** Screen loads inquiries
- Given: User navigates to Contact Reply screen
- When: Inquiries are being fetched from the database
- Then: A loading indicator is displayed
- And: The loading indicator disappears when data is loaded

**Scenario:** Error fetching inquiries
- Given: Network error or database error occurs
- When: User is on Contact Reply screen
- Then: An error message is displayed: "お問い合わせの取得に失敗しました"
- And: A retry button is available

**Scenario:** Empty state display
- Given: User has no contact inquiries
- When: User navigates to Contact Reply screen
- Then: An empty state message is displayed
- And: The message is user-friendly: "お問い合わせはまだありません"

#### REQ-7: Pull to Refresh
**Requirement:** Users must be able to refresh the inquiry list by pulling down.

**Scenario:** User refreshes inquiry list
- Given: User is viewing the inquiry list
- When: User pulls down on the list
- Then: The list refreshes and fetches latest inquiries from database
- And: Any new replies are displayed

#### REQ-8: Navigation Integration
**Requirement:** The Contact Reply screen must be properly integrated into the app navigation system.

**Scenario:** Navigation from My Page
- Given: User is on My Page screen
- When: User taps "お問い合わせと返信" menu item
- Then: Navigation occurs to Contact Inquiry & Reply screen
- And: The screen has proper back navigation

**Scenario:** Back navigation
- Given: User is on Contact Reply screen
- When: User taps the back button
- Then: User returns to My Page screen

## Data Model

### Contact Inquiry
```typescript
interface ContactInquiry {
  id: string;                    // UUID
  user_id: string;              // UUID, foreign key to profiles.id
  subject: string;              // Inquiry subject/title
  message: string;              // Original inquiry message
  status: 'pending' | 'replied' | 'closed';
  created_at: string;           // ISO timestamp
  replied_at: string | null;     // ISO timestamp, nullable
  replies?: ContactReply[];      // Array of replies
  unread_reply_count?: number;  // Count of unread replies
}
```

### Contact Reply
```typescript
interface ContactReply {
  id: string;                   // UUID
  inquiry_id: string;           // UUID, foreign key to contact_inquiries.id
  reply_message: string;        // Reply text from admin
  from_admin: boolean;          // Always true for admin replies
  is_read: boolean;             // Whether user has read this reply
  created_at: string;           // ISO timestamp
}
```

## API Requirements

### Create Inquiry
**Endpoint:** `POST /contact_inquiries`
**Body:** `{ user_id: UUID, subject: string, message: string, status: 'pending' }`
**Response:** Created `ContactInquiry` object
**RLS:** User can only create inquiries for their own profile

### Get User Inquiries
**Endpoint:** `GET /contact_inquiries?user_id=eq.{userId}`
**Response:** Array of `ContactInquiry` objects with nested replies
**RLS:** User can only read their own inquiries

### Get Single Inquiry
**Endpoint:** `GET /contact_inquiries?id=eq.{inquiryId}`
**Response:** Single `ContactInquiry` object with nested replies
**RLS:** User can only read their own inquiries

### Mark Reply as Read
**Endpoint:** `PATCH /contact_replies?id=eq.{replyId}`
**Body:** `{ is_read: true }`
**RLS:** User can only update their own inquiry replies

## UI/UX Requirements

### Screen Layout
- **Header:** Standard header with title "お問い合わせと返信" and back button
- **Tab Selector:** Two tabs - "送信" (Send) and "返信" (Replies)
- **Send Tab:**
  - Form with inquiry type dropdown
  - Name field (pre-filled from profile)
  - Email field (pre-filled from auth)
  - Subject field (optional, auto-generated)
  - Message textarea (required)
  - Submit button
- **Replies Tab:**
  - **List View:** FlatList displaying inquiry cards
- **Card Design:**
  - Inquiry subject/title
  - Status badge (pending/replied)
  - Date of inquiry
  - Unread indicator (if applicable)
  - Chevron icon indicating tapability

### Detail View (Thread)
- **Header:** Inquiry subject with back button
- **Thread Display:**
  - Original inquiry message in a card/bubble
  - Admin replies displayed chronologically
  - Each reply clearly labeled as "管理者からの返信"
  - Timestamps for each message
  - Visual distinction between inquiry and replies

### States
- **Loading:** ActivityIndicator with text "読み込み中..."
- **Empty:** Empty state component with icon and message
- **Error:** Error message with retry button

### Design System Compliance
- Use `Colors` constants for colors
- Use `Spacing` constants for spacing
- Use `Typography` constants for fonts
- Follow patterns from `NotificationHistoryScreen` or `FootprintsScreen`
- Use `StandardHeader` component for consistency

## Technical Requirements

### Backend Implementation
- **Supabase MCP Available:** All database operations will be performed using Supabase MCP tools
- Use `mcp_supabase_apply_migration` to create tables and RLS policies
- Use `mcp_supabase_execute_sql` for testing and verification
- Use `mcp_supabase_list_tables` to verify schema
- Migrations will be created as SQL files and applied via MCP

### Service Layer
- Follow `ServiceResponse<T>` pattern
- Handle errors gracefully
- Use Supabase client for database queries
- Implement caching if needed (future enhancement)

### Frontend Implementation
- **UI/UX Compliance (uichange.mdc rule):**
  - All UI components must include backend impact assessment
  - Inquiry submission form: **Backend impact: yes** - creates new inquiry in database
  - Screen component: **Backend impact: none** (consumes existing API)
  - List display: **Backend impact: none** (reads from database)
  - Mark as read: **Backend impact: yes** - requires `is_read` field update
  - Navigation: **Backend impact: none**
  - Loading/Error states: **Backend impact: none**

### Performance
- Use `FlatList` for inquiry list (not ScrollView)
- Implement pagination if many inquiries exist (future enhancement)
- Optimize re-renders with React.memo if needed

### Accessibility
- Proper accessibility labels for screen readers
- High contrast for text
- Touch targets at least 44x44 points

## Database Schema

### contact_inquiries Table
```sql
CREATE TABLE public.contact_inquiries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'replied', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  replied_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_contact_inquiries_user_id ON public.contact_inquiries(user_id);
CREATE INDEX idx_contact_inquiries_status ON public.contact_inquiries(status);
CREATE INDEX idx_contact_inquiries_created_at ON public.contact_inquiries(created_at DESC);
```

### contact_replies Table
```sql
CREATE TABLE public.contact_replies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inquiry_id UUID NOT NULL REFERENCES public.contact_inquiries(id) ON DELETE CASCADE,
  reply_message TEXT NOT NULL,
  from_admin BOOLEAN NOT NULL DEFAULT true,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contact_replies_inquiry_id ON public.contact_replies(inquiry_id);
CREATE INDEX idx_contact_replies_is_read ON public.contact_replies(is_read) WHERE is_read = false;
```

### RLS Policies
```sql
-- Users can create their own inquiries
CREATE POLICY "Users can create own inquiries"
  ON public.contact_inquiries
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = contact_inquiries.user_id
      AND profiles.user_id = auth.uid()::text
    )
  );

-- Users can read their own inquiries
CREATE POLICY "Users can read own inquiries"
  ON public.contact_inquiries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = contact_inquiries.user_id
      AND profiles.user_id = auth.uid()::text
    )
  );

-- Users can read replies to their own inquiries
CREATE POLICY "Users can read replies to own inquiries"
  ON public.contact_replies
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.contact_inquiries
      WHERE contact_inquiries.id = contact_replies.inquiry_id
      AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = contact_inquiries.user_id
        AND profiles.user_id = auth.uid()::text
      )
    )
  );

-- Users can mark their own inquiry replies as read
CREATE POLICY "Users can update own inquiry replies"
  ON public.contact_replies
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.contact_inquiries
      WHERE contact_inquiries.id = contact_replies.inquiry_id
      AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = contact_inquiries.user_id
        AND profiles.user_id = auth.uid()::text
      )
    )
  );
```


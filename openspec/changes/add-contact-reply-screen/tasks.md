# Implementation Tasks: Add Contact Inquiry & Reply Screen

**Change ID:** `add-contact-reply-screen`  
**Status:** Completed

## Checklist

### Database & Backend (via Supabase MCP)
- [x] Create database migration for `contact_inquiries` table using `mcp_supabase_apply_migration`
- [x] Create database migration for `contact_replies` table using `mcp_supabase_apply_migration`
- [x] Set up RLS policies for `contact_inquiries` table (SELECT, INSERT) in migration
- [x] Set up RLS policies for `contact_replies` table (SELECT, UPDATE) in migration
- [x] Add INSERT RLS policy for `contact_inquiries` (allows users to create inquiries)
- [x] Create indexes for efficient queries (user_id, status, created_at) in migration
- [x] Verify schema using `mcp_supabase_list_tables` and `mcp_supabase_execute_sql`
- [x] Test database queries with sample data using `mcp_supabase_execute_sql`
- [x] Verify RLS policies work correctly by testing queries
- [x] Verify INSERT policy allows authenticated users to create inquiries

### Services Layer
- [x] Create `src/services/supabase/contact-inquiries.service.ts`
- [x] Implement `getContactInquiries(userId: string)` method
- [x] Implement `getContactInquiry(inquiryId: string)` method
- [x] Implement `markReplyAsRead(replyId: string)` method
- [x] Implement `markAllRepliesAsRead(inquiryId: string)` method
- [x] Implement `createContactInquiry(userId, subject, message, inquiryType?)` method (**Backend impact: yes** - creates new inquiry)
- [x] Add service exports to `src/services/supabase/index.ts`
- [x] Add wrapper methods to `src/services/supabaseDataProvider.ts`
- [x] Add wrapper methods to `src/services/dataProviderSwitcher.ts`
- [x] Test service methods with mock data

### Types & Navigation
- [x] Add `ContactInquiry` interface to `src/types/dataModels.ts`
- [x] Add `ContactReply` interface to `src/types/dataModels.ts`
- [x] Add `ContactReply` route to `RootStackParamList` in `src/types/index.ts`
- [x] Update navigation types documentation

### UI Components (Follow uichange.mdc rule)
- [x] Create `src/screens/ContactReplyScreen.tsx` with tabbed interface (**Backend impact: none** - consumes existing API)
- [x] **Send Tab**: Implement inquiry submission form (**Backend impact: yes** - creates new inquiry)
  - [x] Inquiry type dropdown with 6 categories (**Backend impact: none** - UI only)
  - [x] Name field with pre-fill from profile (**Backend impact: none** - reads existing data)
  - [x] Email field with pre-fill from auth (**Backend impact: none** - reads existing data)
  - [x] Subject field (optional, auto-generated) (**Backend impact: none** - UI logic)
  - [x] Message textarea (**Backend impact: yes** - part of inquiry creation)
  - [x] Form validation and error handling (**Backend impact: none** - client-side)
  - [x] Submit button with loading state (**Backend impact: yes** - triggers inquiry creation)
  - [x] Success alert and navigation (**Backend impact: none** - UI only)
- [x] **Replies Tab**: Implement inquiry list view with FlatList (**Backend impact: none** - uses existing service)
- [x] **Replies Tab**: Implement inquiry detail view (thread view) (**Backend impact: none** - displays existing data)
- [x] Add loading state component (**Backend impact: none**)
- [x] Add empty state component (**Backend impact: none**)
- [x] Add error state handling (**Backend impact: none**)
- [x] Add pull-to-refresh functionality (**Backend impact: none** - refreshes existing query)
- [x] Add unread badge/indicator for inquiries with unread replies (**Backend impact: none** - displays existing `is_read` field)
- [x] Implement navigation to detail view (**Backend impact: none**)
- [x] Style according to design system (Colors, Spacing, Typography) (**Backend impact: none**)

### Integration (Follow uichange.mdc rule)
- [x] Add navigation handler in `MyPageScreen.tsx` for "お問い合わせと返信" menu item (**Backend impact: none**)
- [x] Update menu item text to "お問い合わせと返信" (**Backend impact: none**)
- [x] Add route in `AppNavigator.tsx` for ContactReply screen (**Backend impact: none**)
- [x] Import and register ContactReplyScreen component (**Backend impact: none**)
- [x] Update screen header title to "お問い合わせと返信" (**Backend impact: none**)
- [x] Test navigation flow from My Page to Contact Reply screen
- [x] Test inquiry submission flow
- [x] Test reply viewing flow

### Testing
- [ ] Write unit tests for contact-inquiries service
- [ ] Write component tests for ContactReplyScreen
- [ ] Test navigation flow
- [ ] Test empty state display
- [ ] Test error state handling
- [ ] Test with multiple inquiries
- [ ] Test mark as read functionality

### Documentation
- [ ] Update README if needed
- [ ] Add JSDoc comments to service methods
- [ ] Document API endpoints (if applicable)

## Implementation Order

1. **Database & Backend** (Foundation via Supabase MCP)
   - Create migrations using `mcp_supabase_apply_migration`
   - Set up RLS policies in migration
   - Verify schema using `mcp_supabase_list_tables`
   - Test queries using `mcp_supabase_execute_sql`

2. **Services Layer** (Data Access)
   - Create service class
   - Implement methods
   - Add to DataProvider
   - Test service methods

3. **Types & Navigation** (Type Safety)
   - Add TypeScript interfaces
   - Update navigation types (**Backend impact: none**)

4. **UI Components** (User Interface - Follow uichange.mdc)
   - Create screen component (**Backend impact: none**)
   - Implement list and detail views (**Backend impact: none**)
   - Add states and error handling (**Backend impact: none**)
   - Implement mark as read functionality (**Backend impact: yes** - updates `is_read` field)

5. **Integration** (Connect Everything - Follow uichange.mdc)
   - Wire up navigation (**Backend impact: none**)
   - Connect to My Page (**Backend impact: none**)

6. **Testing** (Quality Assurance)
   - Write tests
   - Manual testing

7. **Documentation** (Knowledge Sharing)
   - Update docs
   - Add comments

## Notes

### Backend Implementation
- **Use Supabase MCP tools** for all database operations:
  - `mcp_supabase_apply_migration` for creating tables and policies
  - `mcp_supabase_execute_sql` for testing and verification
  - `mcp_supabase_list_tables` to verify schema
- All migrations will be created as SQL files and applied via MCP

### Frontend Implementation
- Follow existing patterns from `NotificationHistoryScreen` or `FootprintsScreen` for list display
- Use `StandardHeader` component for consistent header styling
- Follow `ServiceResponse<T>` pattern for all service methods
- Use existing color and spacing constants
- Ensure responsive design for different screen sizes
- Handle Japanese text properly (RTL considerations if needed)

### UI/UX Compliance (uichange.mdc rule)
- **Every UI change must include backend impact assessment**
- Navigation changes: **Backend impact: none**
- Component display: **Backend impact: none** (consumes existing API)
- User interactions (mark as read): **Backend impact: yes** - requires database update
- State management: **Backend impact: none** (client-side only)


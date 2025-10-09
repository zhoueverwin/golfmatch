# Test Accounts for GolfMatch

This document explains how to use the test account system for development and testing.

## Default Test Accounts

The system comes with pre-configured test accounts:

| Email | Password | Name | Phone |
|-------|----------|------|-------|
| `test.user@golfmatch.com` | `Test123!` | Test User | +818022582038 |
| `golf.pro@golfmatch.com` | `Golf123!` | Golf Pro | +818022582039 |
| `beginner@golfmatch.com` | `Begin123!` | Beginner Golfer | +818022582040 |

## How to Use Test Accounts

### 1. Run the Test Account Setup

Import and run the test account setup in your development environment:

```typescript
import { runTestAccountSetup } from './src/utils/runTestAccounts';

// Run this in your development environment
runTestAccountSetup();
```

### 2. Create Individual Test Accounts

```typescript
import { createTestAccount } from './src/utils/testAccountCreator';

// Create a custom test account
const result = await createTestAccount(
  'custom.user@golfmatch.com',
  'Custom123!',
  { name: 'Custom User' }
);
```

### 3. Run Authentication System Tests

```typescript
import { runAuthSystemTest } from './src/utils/testAccountCreator';

// Run comprehensive authentication tests
const testResults = await runAuthSystemTest();
```

## Environment Setup

Make sure your Supabase environment variables are configured:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Available Functions

### Test Account Creation
- `createTestAccount(email, password, options)` - Create a single test account
- `createDefaultTestAccounts()` - Create all default test accounts
- `createMultipleTestAccounts(accounts)` - Create multiple accounts from a list

### Authentication Testing
- `runAuthSystemTest()` - Run comprehensive authentication tests
- `signInWithTestAccount(email, password)` - Sign in with a test account
- `validateTestEnvironment()` - Check if environment is properly configured

### Utility Functions
- `listTestAccounts()` - List all available test accounts
- `deleteTestAccount(email)` - Delete a test account (requires admin access)

## Usage in Development

1. **During Development**: Use the default test accounts for testing authentication flows
2. **Testing Features**: Create custom test accounts for specific testing scenarios
3. **Automated Testing**: Use the test account functions in your test suites

## Security Notes

- Test accounts should only be used in development environments
- Never use real user data for testing
- Consider using test-specific Supabase projects for development
- The test account system includes password validation and email format checking

## Troubleshooting

### Common Issues

1. **"Environment not properly configured"**
   - Check your `.env` file and ensure Supabase credentials are set
   - Verify the Supabase project is active and accessible

2. **"Failed to create account"**
   - Check if the email is already registered
   - Verify password meets minimum requirements (6+ characters)
   - Ensure Supabase authentication is properly configured

3. **"Account creation requires Supabase admin API"**
   - This is normal - account deletion typically requires admin privileges
   - Use the Supabase dashboard to manage users if needed

### Testing Authentication Flows

Use the test accounts to verify:
- Email/password sign up and sign in
- Phone number authentication (if configured)
- OAuth providers (Google, Apple)
- Account linking functionality
- Session management and persistence
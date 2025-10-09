# 🚀 How to Run Test Account Setup

I've made it super easy to create test accounts! Here's exactly what you need to do:

## Method 1: Use the Test Screen (Easiest)

1. **Run your app** as usual:
   ```bash
   npm start
   # or
   expo start
   ```

2. **Navigate to the test screen** by typing this URL in your browser's address bar:
   ```
   exp://your-device-ip:port/--/TestAccountSetup
   ```
   
   *Replace with your actual Expo URL*

3. **Or add a temporary button** to your app:
   - Add this to any screen (like HomeScreen):
   ```typescript
   <Button 
     title="🧪 Test Setup" 
     onPress={() => navigation.navigate('TestAccountSetup')} 
   />
   ```

4. **Use the test screen** to:
   - ✅ Check environment configuration
   - 🚀 Run full test account setup
   - ➕ Create custom test accounts
   - 📋 View all available test accounts

## Method 2: Quick Setup (Developer Console)

1. **Open your React Native debugger** (shake device or press `Ctrl+M`)

2. **In the console**, run:
   ```javascript
   import { runTestAccountSetup } from './src/utils/runTestAccounts';
   runTestAccountSetup();
   ```

## Method 3: Temporary App Modification

1. **Edit `App.tsx`** and add this:
   ```typescript
   import { runTestAccountSetup } from './src/utils/runTestAccounts';
   
   // Inside your App component:
   useEffect(() => {
     runTestAccountSetup();
   }, []);
   ```

2. **Run the app once**, then remove the code

## 📋 Default Test Accounts Created

After running the setup, you'll have these accounts:

| Email | Password | Use For |
|-------|----------|---------|
| `test.user@golfmatch.com` | `Test123!` | General testing |
| `golf.pro@golfmatch.com` | `Golf123!` | Pro golfer testing |
| `beginner@golfmatch.com` | `Begin123!` | Beginner testing |

## 🎯 What to Test

Use these accounts to test:
- ✅ Email/password login in AuthScreen
- ✅ Phone OTP authentication
- ✅ Account linking features
- ✅ Profile creation and editing
- ✅ All app functionality

## 🔧 Troubleshooting

**If setup fails:**
- Check your `.env` file has correct Supabase credentials
- Make sure your Supabase project is active
- Verify internet connection
- Check console for detailed error messages

**Remember:** Remove the test screen before deploying to production!

---

**Quick Start:** Just navigate to `TestAccountSetup` screen and press "🚀 Run Full Setup"!